/**
 * SKU Classification Engine
 * Automatically classifies products for seasonal intelligence and profitability optimization
 * Detects Q4 items, calculates margins, and sets profit protection thresholds
 */

import { db } from '../db/connection';

export interface ProductClassification {
  margin_percentage: number;
  q4_item: boolean;
  seasonal_item: boolean;
  seasonal_type: string | null;
  seasonal_end_date: Date | null;
  profit_protection_threshold: number;
  traffic_driver: boolean;
  bundle_eligible: boolean;
  clearance_tier: string;
  cash_impact_score: number;
}

export interface ClassificationStats {
  totalProcessed: number;
  q4ItemsFound: number;
  halloweenItems: number;
  christmasItems: number;
  highMarginItems: number;
  lowMarginItems: number;
  trafficDrivers: number;
  bundleEligible: number;
}

export class SKUClassifier {
  
  /**
   * Main method to classify all products in the system
   */
  static async classifyAllProducts(): Promise<{ stats: ClassificationStats; processed: number }> {
    console.log('🧠 SKU Classification Engine: Starting product classification...');
    
    try {
      // Get all active products with variants
      const products = await db.query(`
        SELECT 
          p.id as product_id,
          p.title as product_title,
          p.vendor,
          p.product_type,
          v.id as variant_id,
          v.sku,
          v.title as variant_title,
          v.price,
          v.cost as wholesale_cost,
          v.available_quantity,
          COALESCE(v.margin_percentage, 0) as current_margin
        FROM shopify_products p
        JOIN shopify_variants v ON p.id = v.product_id
        WHERE p.status = 'ACTIVE' 
          AND v.sku IS NOT NULL 
          AND v.sku != ''
        ORDER BY p.id, v.id
      `);

      console.log(`📊 Found ${products.rows.length} variants to classify`);

      let stats: ClassificationStats = {
        totalProcessed: 0,
        q4ItemsFound: 0,
        halloweenItems: 0,
        christmasItems: 0,
        highMarginItems: 0,
        lowMarginItems: 0,
        trafficDrivers: 0,
        bundleEligible: 0
      };

      let batchCount = 0;
      const batchSize = 100;

      // Process in batches for better performance
      for (let i = 0; i < products.rows.length; i += batchSize) {
        const batch = products.rows.slice(i, i + batchSize);
        batchCount++;
        
        console.log(`⚡ Processing batch ${batchCount}: variants ${i + 1}-${Math.min(i + batchSize, products.rows.length)}`);
        
        for (const product of batch) {
          try {
            const classification = this.classifyProduct(product);
            await this.updateProductClassification(product.variant_id, classification);
            
            // Update stats
            stats.totalProcessed++;
            if (classification.q4_item) stats.q4ItemsFound++;
            if (classification.seasonal_type === 'halloween') stats.halloweenItems++;
            if (classification.seasonal_type === 'christmas') stats.christmasItems++;
            if (classification.margin_percentage >= 60) stats.highMarginItems++;
            if (classification.margin_percentage < 45) stats.lowMarginItems++;
            if (classification.traffic_driver) stats.trafficDrivers++;
            if (classification.bundle_eligible) stats.bundleEligible++;
            
          } catch (error) {
            console.error(`❌ Error classifying variant ${product.variant_id} (${product.sku}):`, error.message);
          }
        }
        
        // Progress update every 5 batches
        if (batchCount % 5 === 0) {
          console.log(`   📈 Progress: ${stats.totalProcessed}/${products.rows.length} variants classified`);
        }
      }

      console.log(`✅ SKU Classification Complete! Processed ${stats.totalProcessed} variants`);
      
      return { 
        stats, 
        processed: stats.totalProcessed 
      };

    } catch (error) {
      console.error('❌ SKU Classification failed:', error);
      throw error;
    }
  }

  /**
   * Classify a single product using CFO's intelligence rules
   */
  static classifyProduct(product: any): ProductClassification {
    const { 
      sku, 
      price, 
      wholesale_cost, 
      product_title, 
      variant_title, 
      vendor, 
      product_type,
      available_quantity 
    } = product;
    
    // 1. Calculate margin percentage
    const retailPrice = parseFloat(price) || 0;
    const cost = parseFloat(wholesale_cost) || 0;
    let margin_percentage = 0;
    
    if (retailPrice > 0 && cost > 0) {
      margin_percentage = ((retailPrice - cost) / retailPrice) * 100;
    } else if (retailPrice > 0 && cost === 0) {
      // Assume 50% margin if cost is unknown
      margin_percentage = 50;
    }

    // 2. Seasonal classification based on SKU patterns
    const skuUpper = (sku || '').toUpperCase();
    const titleLower = (product_title || '').toLowerCase() + ' ' + (variant_title || '').toLowerCase();
    
    // Q4 seasonal detection
    const isHalloween = skuUpper.startsWith('SEH') || 
                       titleLower.includes('halloween') || 
                       titleLower.includes('pumpkin') ||
                       titleLower.includes('spider') ||
                       titleLower.includes('ghost');
                       
    const isChristmas = skuUpper.startsWith('HO') || 
                       titleLower.includes('christmas') || 
                       titleLower.includes('holiday') ||
                       titleLower.includes('xmas') ||
                       titleLower.includes('santa') ||
                       titleLower.includes('reindeer') ||
                       titleLower.includes('snowman');

    const isQ4Item = isHalloween || isChristmas;

    // 3. Determine seasonal type and end dates
    let seasonal_type: string | null = null;
    let seasonal_end_date: Date | null = null;
    
    const currentYear = new Date().getFullYear();
    
    if (isHalloween) {
      seasonal_type = 'halloween';
      seasonal_end_date = new Date(currentYear, 10, 5); // November 5th
    } else if (isChristmas) {
      seasonal_type = 'christmas'; 
      seasonal_end_date = new Date(currentYear, 11, 27); // December 27th
    }

    // 4. Traffic driver detection (high-volume, popular items)
    const traffic_driver = this.isTrafficDriver(product_title, variant_title, vendor, margin_percentage);

    // 5. Bundle eligibility (low-cost complementary items)
    const bundle_eligible = this.isBundleEligible(retailPrice, margin_percentage, product_type);

    // 6. Calculate profit protection threshold
    const profit_protection_threshold = this.calculateProtectionThreshold(margin_percentage);

    // 7. Determine initial clearance tier
    const clearance_tier = this.determineClearanceTier(margin_percentage, available_quantity);

    // 8. Calculate initial cash impact score
    const cash_impact_score = this.calculateCashImpactScore(
      margin_percentage, 
      retailPrice, 
      available_quantity,
      isQ4Item
    );

    return {
      margin_percentage: Math.round(margin_percentage * 100) / 100,
      q4_item: isQ4Item,
      seasonal_item: isQ4Item,
      seasonal_type,
      seasonal_end_date,
      profit_protection_threshold,
      traffic_driver,
      bundle_eligible,
      clearance_tier,
      cash_impact_score
    };
  }

  /**
   * Detect traffic drivers (items that bring customers to the store)
   */
  private static isTrafficDriver(productTitle: string, variantTitle: string, vendor: string, margin: number): boolean {
    const fullTitle = ((productTitle || '') + ' ' + (variantTitle || '')).toLowerCase();
    const vendorLower = (vendor || '').toLowerCase();
    
    // High-traffic categories and brands
    const trafficKeywords = [
      'candle', 'soap', 'lotion', 'diffuser', 'fragrance',
      'mug', 'tumbler', 'cup', 'bottle',
      'pillow', 'throw', 'blanket',
      'sign', 'frame', 'wall art',
      'jewelry', 'earrings', 'necklace', 'bracelet'
    ];
    
    const trafficVendors = [
      'capri blue', 'paddywax', 'voluspa', 'nest',
      'mudpie', 'primitives', 'one hundred 80'
    ];
    
    // Check for traffic keywords
    const hasTrafficKeyword = trafficKeywords.some(keyword => fullTitle.includes(keyword));
    const hasTrafficVendor = trafficVendors.some(vendor => vendorLower.includes(vendor));
    
    // Traffic drivers typically have good margins (40%+) and bring volume
    return (hasTrafficKeyword || hasTrafficVendor) && margin >= 40;
  }

  /**
   * Detect bundle eligible items (perfect for add-on sales)
   */
  private static isBundleEligible(price: number, margin: number, productType: string): boolean {
    const typeLower = (productType || '').toLowerCase();
    
    // Small, complementary items under $15 with decent margins
    const bundleTypes = ['card', 'ornament', 'keychain', 'magnet', 'bookmark', 'sticker'];
    const hasBundleType = bundleTypes.some(type => typeLower.includes(type));
    
    return (price <= 15 && margin >= 50) || hasBundleType;
  }

  /**
   * Calculate CFO's profit protection thresholds
   */
  private static calculateProtectionThreshold(margin: number): number {
    // CFO's progressive discount limits based on margin
    if (margin >= 65) return 75; // Can discount up to 75% for very high margin
    if (margin >= 60) return 70; // Can discount up to 70%
    if (margin >= 55) return 60; // Can discount up to 60%
    if (margin >= 50) return 50; // Can discount up to 50%
    if (margin >= 45) return 35; // Conservative for medium margin
    return 25; // Very conservative for low margin items
  }

  /**
   * Determine initial clearance tier based on margin and quantity
   */
  private static determineClearanceTier(margin: number, quantity: number): string {
    const qty = parseInt(quantity.toString()) || 0;
    
    // High margin + excess stock = cash generator potential
    if (margin >= 60 && qty > 10) {
      return 'cash_generator';
    }
    
    // Medium margin + some stock = space maker
    if (margin >= 45 && qty > 5) {
      return 'space_maker';
    }
    
    // Low margin or low stock = bundle builder
    if (margin < 45 || qty <= 5) {
      return 'bundle_builder';
    }
    
    return 'standard_clearance';
  }

  /**
   * Calculate initial cash impact score
   */
  private static calculateCashImpactScore(margin: number, price: number, quantity: number, isQ4: boolean): number {
    const qty = parseInt(quantity.toString()) || 0;
    const retailPrice = parseFloat(price) || 0;
    
    // Base score: margin × weekly revenue potential
    const weeklyRevenuePotential = (qty > 0 ? Math.min(qty / 4, 10) : 0) * retailPrice; // Conservative weekly sales
    let baseScore = margin * weeklyRevenuePotential;
    
    // Q4 boost (August-December seasonal multiplier)
    const currentMonth = new Date().getMonth() + 1;
    if (isQ4 && currentMonth >= 8 && currentMonth <= 12) {
      baseScore *= 1.5; // 50% boost for Q4 items in season
    }
    
    // Urgency multiplier based on stock levels
    let urgencyMultiplier = 1.0;
    if (qty === 0) urgencyMultiplier = 3.0;      // Out of stock = urgent
    else if (qty <= 3) urgencyMultiplier = 2.0;  // Low stock = high priority
    else if (qty <= 10) urgencyMultiplier = 1.5; // Medium stock = moderate priority
    
    return Math.round(baseScore * urgencyMultiplier);
  }

  /**
   * Update product classification in database
   */
  static async updateProductClassification(variantId: number, classification: ProductClassification): Promise<void> {
    await db.query(`
      UPDATE shopify_variants SET
        margin_percentage = $1,
        q4_item = $2,
        seasonal_item = $3,
        seasonal_type = $4,
        seasonal_end_date = $5,
        profit_protection_threshold = $6,
        traffic_driver = $7,
        bundle_eligible = $8,
        clearance_tier = $9,
        cash_impact_score = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
    `, [
      classification.margin_percentage,
      classification.q4_item,
      classification.seasonal_item,
      classification.seasonal_type,
      classification.seasonal_end_date,
      classification.profit_protection_threshold,
      classification.traffic_driver,
      classification.bundle_eligible,
      classification.clearance_tier,
      classification.cash_impact_score,
      variantId
    ]);
  }

  /**
   * Get classification statistics for reporting
   */
  static async getClassificationStats(): Promise<any> {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_variants,
        COUNT(*) FILTER (WHERE q4_item = true) as q4_items,
        COUNT(*) FILTER (WHERE seasonal_type = 'halloween') as halloween_items,
        COUNT(*) FILTER (WHERE seasonal_type = 'christmas') as christmas_items,
        COUNT(*) FILTER (WHERE margin_percentage >= 60) as high_margin_items,
        COUNT(*) FILTER (WHERE margin_percentage < 45) as low_margin_items,
        COUNT(*) FILTER (WHERE traffic_driver = true) as traffic_drivers,
        COUNT(*) FILTER (WHERE bundle_eligible = true) as bundle_eligible,
        AVG(margin_percentage) as avg_margin,
        SUM(cash_impact_score) as total_cash_impact,
        COUNT(*) FILTER (WHERE clearance_tier = 'cash_generator') as cash_generators,
        COUNT(*) FILTER (WHERE clearance_tier = 'space_maker') as space_makers,
        COUNT(*) FILTER (WHERE clearance_tier = 'bundle_builder') as bundle_builders
      FROM shopify_variants 
      WHERE sku IS NOT NULL
    `);

    return stats.rows[0];
  }

  /**
   * Find items that need reclassification (changed prices, seasons, etc.)
   */
  static async findItemsNeedingReclassification(): Promise<any[]> {
    const items = await db.query(`
      SELECT 
        id, sku, price, cost, margin_percentage, q4_item, seasonal_end_date
      FROM shopify_variants 
      WHERE sku IS NOT NULL 
        AND (
          -- Margin calculation looks wrong
          (cost > 0 AND price > 0 AND ABS(margin_percentage - ((price - cost) / price * 100)) > 5)
          -- Seasonal items past their end date that are still marked seasonal
          OR (seasonal_item = true AND seasonal_end_date < CURRENT_DATE)
          -- Items with no classification data
          OR margin_percentage IS NULL
          OR clearance_tier IS NULL
        )
      ORDER BY cash_impact_score DESC
      LIMIT 100
    `);

    return items.rows;
  }
}