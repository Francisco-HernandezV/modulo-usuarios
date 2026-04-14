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
// Variable global en el backend para simular el reinicio
let statsOffset = { selects: 0, inserts: 0, updates: 0, deletes: 0 };

// monitorController.js

export const getHealth = async (req, res) => {
  try {
    // 1. Consultar estadísticas actuales de Postgres
    const statsQuery = `
      SELECT blks_hit, blks_read, xact_commit AS commits, xact_rollback AS rollbacks,
             tup_returned AS selects, tup_inserted AS inserts, 
             tup_updated AS updates, tup_deleted AS deletes
      FROM pg_stat_database WHERE datname = current_database();
    `;
    
    // 2. Consultar el offset guardado en nuestra tabla
    const offsetQuery = `SELECT selects, inserts, updates, deletes FROM monitor_stats_offset WHERE id = 1;`;

    const [statsRes, offsetRes] = await Promise.all([
      pool.query(statsQuery),
      pool.query(offsetQuery)
    ]);

    const data = statsRes.rows[0];
    const off = offsetRes.rows[0] || { selects: 0, inserts: 0, updates: 0, deletes: 0 };
    
    let cache_hit_ratio = 0;
    const hits = parseInt(data.blks_hit);
    const reads = parseInt(data.blks_read);
    if (hits + reads > 0) {
      cache_hit_ratio = ((hits / (hits + reads)) * 100).toFixed(2);
    }

    // Retornamos la resta: (Total Actual - Foto de la medianoche)
    res.json({
      cache_hit_ratio,
      commits: data.commits,
      rollbacks: data.rollbacks,
      selects: Math.max(0, parseInt(data.selects) - parseInt(off.selects)),
      inserts: Math.max(0, parseInt(data.inserts) - parseInt(off.inserts)),
      updates: Math.max(0, parseInt(data.updates) - parseInt(off.updates)),
      deletes: Math.max(0, parseInt(data.deletes) - parseInt(off.deletes))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Esta función saca la "foto" actual y la guarda en la tabla
// Al final de tu monitorController.js

export const resetStats = async (req, res) => {
  try {
    const queryStats = `SELECT tup_returned, tup_inserted, tup_updated, tup_deleted FROM pg_stat_database WHERE datname = current_database();`;
    const { rows } = await pool.query(queryStats);
    
    const updateQuery = `
      UPDATE monitor_stats_offset 
      SET selects = $1, inserts = $2, updates = $3, deletes = $4, fecha_reset = CURRENT_TIMESTAMP
      WHERE id = 1;
    `;
    
    await pool.query(updateQuery, [rows[0].tup_returned, rows[0].tup_inserted, rows[0].tup_updated, rows[0].tup_deleted]);
    
    // Si la función viene de una ruta HTTP enviamos respuesta, si viene del Cron no.
    if (res) {
        return res.json({ message: "Contadores reiniciados para la vista actual." });
    }
    console.log("✅ Punto de control de estadísticas actualizado automáticamente.");
  } catch (error) {
    console.error("❌ Error al guardar offset:", error.message);
    if (res) return res.status(500).json({ error: error.message });
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

// 6. Tamaño Físico de la Base de Datos
export const getDatabaseSize = async (req, res) => {
  try {
    // Obtenemos el tamaño total de la BD
    const dbSizeQuery = "SELECT pg_size_pretty(pg_database_size(current_database())) AS total_size;";
    const dbSizeRes = await pool.query(dbSizeQuery);

    // Obtenemos el top 5 de tablas más pesadas
    const tablesSizeQuery = `
      SELECT relname AS tabla, pg_size_pretty(pg_total_relation_size(relid)) AS peso 
      FROM pg_catalog.pg_statio_user_tables 
      ORDER BY pg_total_relation_size(relid) DESC 
      LIMIT 5;
    `;
    const tablesSizeRes = await pool.query(tablesSizeQuery);

    res.json({
      total_size: dbSizeRes.rows[0].total_size,
      top_tables: tablesSizeRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 🔥 BORRAMOS resetStats DE AQUÍ PARA ABAJO

