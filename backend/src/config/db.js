import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  // 🔥 CORRECCIÓN: Render exige SSL para conexiones externas siempre
  ssl: { rejectUnauthorized: false },
  max: 5, 
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000 
});

// El truco de los esquemas
pool.on('connect', (client) => {
  client.query('SET search_path TO seguridad, inventario, catalogo, ventas, auditoria, reportes, public');
});

pool.on('error', (err, client) => {
  console.error('Error en el cliente de la base de datos:', err.message);
});

export default pool;