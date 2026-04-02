import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 5, 
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000 
});

pool.on('connect', (client) => {
  client.query('SET search_path TO seguridad, inventario, catalogo, ventas, auditoria, reportes, public');
});

pool.on('error', (err, client) => {
  console.error('Error en el cliente de la base de datos:', err.message);
});

export default pool;