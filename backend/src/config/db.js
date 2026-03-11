import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: { 
    rejectUnauthorized: false 
  },
  max: 5, 
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000 
});

pool.on('error', (err, client) => {
  console.error('Error en el cliente de la base de datos (Render):', err.message);
});

export default pool;