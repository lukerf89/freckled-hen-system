#!/usr/bin/env node

import dotenv from 'dotenv';
import { db } from './connection';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * Schema migration tool for deploying SQL schemas via Node.js
 * Executes schema.sql file using the existing database connection
 */

async function runMigration() {
  console.log('🚀 Starting schema migration...\n');
  
  try {
    // Test database connection first
    console.log('📡 Testing database connection...');
    await db.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');
    
    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    console.log(`📄 Reading schema from: ${schemaPath}`);
    
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    console.log(`📋 Schema file loaded (${schemaContent.length} characters)\n`);
    
    // Split the schema into individual statements
    // Handle different statement types properly
    const statements = splitSQLStatements(schemaContent);
    console.log(`🔍 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{statement: string, error: string}> = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      // Extract statement type for logging
      const statementType = getStatementType(statement);
      const objectName = getObjectName(statement);
      
      try {
        process.stdout.write(`[${i + 1}/${statements.length}] ${statementType} ${objectName}... `);
        await db.query(statement);
        console.log('✅');
        successCount++;
      } catch (error: any) {
        console.log('❌');
        errorCount++;
        
        // Check if it's a "already exists" error which we can ignore
        if (error.message?.includes('already exists')) {
          console.log(`   ⚠️  Already exists (skipping): ${objectName}`);
          successCount++;
          errorCount--;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          errors.push({
            statement: statement.substring(0, 100) + '...',
            error: error.message
          });
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. Statement: ${err.statement}`);
        console.log(`   Error: ${err.error}`);
      });
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = await verifyTables();
    console.log(`✅ Found ${tables.length} inventory-related tables:`);
    tables.forEach(table => {
      console.log(`   - ${table.table_name} (${table.row_count} rows)`);
    });
    
    console.log('\n✨ Schema migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Don't call db.end() as it's not available on the db object
    process.exit(0);
  }
}

/**
 * Split SQL content into individual statements
 * Handles multi-line statements and functions properly
 */
function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = '';
  let inFunction = false;
  let inString = false;
  let stringChar = '';
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Handle string literals
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';
      
      if (!inString && (char === "'" || char === '"') && prevChar !== '\\') {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
      }
    }
    
    // Check for function/trigger start
    if (!inString && (
      trimmedLine.toUpperCase().startsWith('CREATE OR REPLACE FUNCTION') ||
      trimmedLine.toUpperCase().startsWith('CREATE FUNCTION') ||
      trimmedLine.toUpperCase().startsWith('CREATE TRIGGER')
    )) {
      inFunction = true;
    }
    
    currentStatement += line + '\n';
    
    // Check for statement end
    if (!inString) {
      // Function ends with $$ language
      if (inFunction && (
        trimmedLine.toUpperCase().includes("$$ LANGUAGE") ||
        trimmedLine.toUpperCase().includes("$$LANGUAGE") ||
        (trimmedLine === '$$' && currentStatement.includes('language'))
      )) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inFunction = false;
      }
      // Trigger ends with semicolon after FUNCTION call
      else if (inFunction && trimmedLine.toUpperCase().includes('EXECUTE FUNCTION') && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inFunction = false;
      }
      // Regular statement ends with semicolon
      else if (!inFunction && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements.filter(s => s.length > 0 && !s.startsWith('--'));
}

/**
 * Get the type of SQL statement
 */
function getStatementType(statement: string): string {
  const upper = statement.toUpperCase();
  
  if (upper.startsWith('CREATE TABLE')) return 'CREATE TABLE';
  if (upper.startsWith('CREATE INDEX')) return 'CREATE INDEX';
  if (upper.startsWith('CREATE OR REPLACE VIEW')) return 'CREATE VIEW';
  if (upper.startsWith('CREATE OR REPLACE FUNCTION')) return 'CREATE FUNCTION';
  if (upper.startsWith('CREATE TRIGGER')) return 'CREATE TRIGGER';
  if (upper.startsWith('CREATE UNIQUE INDEX')) return 'CREATE UNIQUE INDEX';
  if (upper.startsWith('ALTER TABLE')) return 'ALTER TABLE';
  if (upper.startsWith('DROP')) return 'DROP';
  if (upper.startsWith('INSERT')) return 'INSERT';
  if (upper.startsWith('UPDATE')) return 'UPDATE';
  if (upper.startsWith('DELETE')) return 'DELETE';
  
  return 'EXECUTE';
}

/**
 * Extract object name from SQL statement
 */
function getObjectName(statement: string): string {
  const patterns = [
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
    /CREATE\s+OR\s+REPLACE\s+VIEW\s+(\w+)/i,
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(\w+)/i,
    /CREATE\s+TRIGGER\s+(\w+)/i,
    /ALTER\s+TABLE\s+(\w+)/i,
    /DROP\s+\w+\s+(?:IF\s+EXISTS\s+)?(\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = statement.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return 'statement';
}

/**
 * Verify that tables were created successfully
 */
async function verifyTables(): Promise<Array<{table_name: string, row_count: number}>> {
  const result = await db.query(`
    SELECT 
      table_name,
      (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t.table_name) as exists
    FROM (
      VALUES 
        ('shopify_products'),
        ('shopify_variants'),
        ('shopify_locations'),
        ('shopify_inventory_levels'),
        ('shopify_product_images'),
        ('shopify_sync_history'),
        ('inventory_alerts'),
        ('ai_processing_queue'),
        ('shopify_collections'),
        ('shopify_product_collections'),
        ('shopify_metafields')
    ) AS t(table_name)
    WHERE EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    )
  `);
  
  const tables: Array<{table_name: string, row_count: number}> = [];
  
  for (const row of result.rows) {
    try {
      const countResult = await db.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
      tables.push({
        table_name: row.table_name,
        row_count: parseInt(countResult.rows[0].count)
      });
    } catch {
      tables.push({
        table_name: row.table_name,
        row_count: 0
      });
    }
  }
  
  return tables;
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

export { runMigration };