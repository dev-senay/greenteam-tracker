import 'dotenv/config';
import pg from 'pg';

const useSSL = process.env.DATABASE_SSL === 'true';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000
});

pool.on('error', (err) => {
    console.error('Idle DB connection error:', err.message);
});

export default pool;