import pool from "../config/db.js";

// 1. Panel de Actividad en Tiempo Real
export const getActivity = async (req, res) => {
  try {
    const query = `
      SELECT pid, usename, state, query_start, query 
      FROM pg_stat_activity 
      WHERE state IS NOT NULL AND pid <> pg_backend_pid();
    `;
    const { rows } = await pool.query(query);
    const maxConn = await pool.query("SHOW max_connections;");
    res.json({ conexiones: rows, max_connections: maxConn.rows[0].max_connections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Monitor de Conflictos y Bloqueos (VERSIÓN INFALIBLE)
export const getLocks = async (req, res) => {
  try {
    const query = `
      SELECT 
        victima.pid AS pid_espera,
        bloqueador.pid AS pid_bloqueador,
        bloqueador.query AS query_bloqueadora
      FROM pg_stat_activity victima
      JOIN pg_stat_activity bloqueador ON bloqueador.pid = ANY(pg_blocking_pids(victima.pid));
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Matar el proceso bloqueador
export const killProcess = async (req, res) => {
  try {
    const { pid } = req.body;
    await pool.query("SELECT pg_terminate_backend($1);", [pid]);
    res.json({ message: `Proceso ${pid} terminado exitosamente.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Sandbox de EXPLAIN (Seguro contra SQL Injection)
export const runExplain = async (req, res) => {
  try {
    const { escenario } = req.body;
    let queryTarget = "SELECT * FROM inventario.productos";

    // Consultas predefinidas y seguras (El RASP ya no se enoja)
    if (escenario === "productos") {
      queryTarget = "SELECT * FROM inventario.productos WHERE descripcion LIKE '%algodon%'";
    } else if (escenario === "clientes") {
      queryTarget = "SELECT * FROM ventas.clientes WHERE email = 'test@test.com'";
    }

    // Quitamos BUFFERS para evitar conflictos de permisos de superusuario
    const query = `EXPLAIN (ANALYZE, FORMAT JSON) ${queryTarget}`;
    const { rows } = await pool.query(query);
    
    // Devolvemos el JSON crudo del plan
    res.json(rows[0]["QUERY PLAN"]);
  } catch (error) {
    console.error("Error en EXPLAIN:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 4. Indicadores de Salud (Cache Hit Ratio)
export const getHealth = async (req, res) => {
  try {
    const query = `
      SELECT 
        round(sum(blks_hit) * 100.0 / (sum(blks_hit) + sum(blks_read)), 2) AS cache_hit_ratio,
        sum(xact_commit) AS commits,
        sum(xact_rollback) AS rollbacks
      FROM pg_stat_database 
      WHERE datname = current_database();
    `;
    const { rows } = await pool.query(query);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Autovacuum y Tuplas Muertas
export const getAutovacuum = async (req, res) => {
  try {
    const query = `
      SELECT relname AS tabla, n_dead_tup AS tuplas_muertas, last_autovacuum 
      FROM pg_stat_user_tables 
      ORDER BY n_dead_tup DESC 
      LIMIT 10;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};