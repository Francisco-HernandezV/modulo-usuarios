import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: { 
    rejectUnauthorized: false 
  },
  // 👇 CONFIGURACIÓN ANTI-ECONNRESET PARA RENDER FREE 👇
  max: 5, // Máximo 5 conexiones simultáneas (Render Free lo agradecerá)
  connectionTimeoutMillis: 15000, // Esperar hasta 15 segundos si la BD está ocupada
  idleTimeoutMillis: 30000 // Cerrar conexiones que llevan 30 segs sin usarse
});

pool.on('error', (err, client) => {
  console.error('Error en el cliente de la base de datos (Render):', err.message);
});

export default pool;