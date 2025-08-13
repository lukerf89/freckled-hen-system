import { GraphQLClient } from 'graphql-request';

export class ShopifyClient {
  private client: GraphQLClient;

  constructor() {
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopifyDomain || !shopifyToken) {
      throw new Error('Shopify environment variables are required');
    }

    this.client = new GraphQLClient(
      `https://${shopifyDomain}/admin/api/2024-07/graphql.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing Shopify connection...');
      console.log('📍 Store:', process.env.SHOPIFY_STORE_DOMAIN);
      console.log('🔑 Token format:', process.env.SHOPIFY_ACCESS_TOKEN?.substring(0, 8) + '...');
      
      // First try REST API to check basic connectivity
      console.log('📡 Trying REST API first...');
      const restResponse = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-07/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!,
          'Content-Type': 'application/json',
        },
      });
      
      if (!restResponse.ok) {
        console.error('❌ REST API failed:', restResponse.status, restResponse.statusText);
        if (restResponse.status === 401) {
          console.error('🔍 Authentication failed - check your access token');
        } else if (restResponse.status === 404) {
          console.error('🔍 Store not found - check your store domain');
        }
        return false;
      }
      
      const restData = await restResponse.json();
      console.log('✅ REST API connected:', restData.shop?.name);
      
      // Now try GraphQL
      console.log('📡 Trying GraphQL API...');
      const query = `
        query {
          shop {
            name
            email
            currencyCode
          }
        }
      `;
      
      const response = await this.client.request(query);
      console.log('✅ GraphQL API connected:', response);
      return true;
    } catch (error: any) {
      console.error('❌ GraphQL connection failed');
      
      if (error.response) {
        console.error('📡 Response status:', error.response.status);
        
        if (error.response.status === 404) {
          console.error('🔍 404 Error - GraphQL API not available. Possible causes:');
          console.error('   - Private app lacks GraphQL Admin API access');
          console.error('   - App not properly installed/activated');
          console.error('   - Incorrect GraphQL endpoint or API version');
        }
      } else {
        console.error('🔍 Network or other error:', error.message);
      }
      
      return false;
    }
  }

  async getProducts(first: number = 10) {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              variants(first: 1) {
                edges {
                  node {
                    id
                    sku
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    return this.client.request(query, { first });
  }

  getClient(): GraphQLClient {
    return this.client;
  }
}