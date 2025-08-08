import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: {
        rejectUnauthorized: false
      }
    });

    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
      process.exit(-1);
    });
  }
  
  return pool;
}

export const db = {
  query: (text: string, params?: any[]) => getPool().query(text, params),
  getClient: () => getPool().connect(),
};

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const currentPool = getPool();
    const client = await currentPool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};