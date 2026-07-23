/**
 * mlController.js — Integración con la API de Modelos de ML
 * =========================================================
 * Este controlador NO ejecuta los modelos: extrae de PostgreSQL las variables
 * que cada modelo requiere y consulta al microservicio Flask desplegado en
 * Render (ver ml-service/).
 *
 *   riesgoApartado   -> Propuesta 2. Se consulta ANTES de crear un apartado.
 *   segmentoCliente  -> Propuesta 3. Se consulta en la caja al asignar cliente.
 *
 * Variables de entorno necesarias (backend/.env y Render):
 *   ML_API_URL=https://<tu-servicio>.onrender.com
 *   ML_API_KEY=<la misma clave configurada en el servicio Flask>
 */

import pool from "../config/db.js";

const ML_API_URL = process.env.ML_API_URL || "http://localhost:5000";
const ML_API_KEY = process.env.ML_API_KEY || "";
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 8000);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/**
 * Llama al microservicio de ML con un tiempo límite.
 * El plan gratuito de Render suspende el servicio por inactividad, por lo que
 * la primera petición puede tardar. El timeout evita bloquear la caja.
 */
async function llamarML(ruta, cuerpo) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch(`${ML_API_URL}${ruta}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ML_API_KEY ? { "X-API-Key": ML_API_KEY } : {}),
      },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos?.error || `El servicio respondió ${respuesta.status}`);
    }
    return datos;
  } finally {
    clearTimeout(temporizador);
  }
}

/* ==========================================================================
 * PROPUESTA 2 — Riesgo de cancelación de un apartado
 * ==========================================================================
 * POST /api/ml/riesgo-apartado
 * Body: { cliente_id, total, dias_de_plazo, anticipo }
 */
export const riesgoApartado = async (req, res) => {
  const { cliente_id, total, dias_de_plazo, anticipo } = req.body;

  if (!cliente_id || !total) {
    return res.status(400).json({ message: "Se requieren cliente_id y total." });
  }

  try {
    // Extracción de las variables del cliente desde la base de datos.
    //   edad_cliente             <- seguridad.personas.fecha_nacimiento
    //   antiguedad_cliente_dias  <- seguridad.personas.creado_en
    //   hist_apartados_previos   <- conteo en ventas.apartados
    //   hist_pct_completados     <- % de completados entre los apartados CERRADOS
    //                               (NULL si no tiene apartados previos: el nulo
    //                                es informativo y el modelo lo contempla)
    const { rows } = await pool.query(
      `SELECT
         COALESCE(EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)), 30)::int
           AS edad_cliente,
         COALESCE(EXTRACT(DAY FROM (NOW() - p.creado_en)), 0)::int
           AS antiguedad_cliente_dias,
         (SELECT COUNT(*) FROM ventas.apartados a
           WHERE a.cliente_id = p.id)::int
           AS hist_apartados_previos,
         (SELECT CASE
                   WHEN COUNT(*) FILTER (WHERE a.estado IN ('completado','cancelado')) = 0
                     THEN NULL
                   ELSE ROUND(
                     100.0 * COUNT(*) FILTER (WHERE a.estado = 'completado')
                     / COUNT(*) FILTER (WHERE a.estado IN ('completado','cancelado')), 1)
                 END
            FROM ventas.apartados a
           WHERE a.cliente_id = p.id)
           AS hist_pct_completados
       FROM seguridad.personas p
       WHERE p.id = $1`,
      [cliente_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "El cliente no existe." });
    }

    const c = rows[0];
    const totalNum = Number(total);
    const anticipoNum = Number(anticipo) || 0;
    const ahora = new Date();

    // pct_anticipo = anticipo / total * 100
    const pctAnticipo = totalNum > 0
      ? Number(((anticipoNum / totalNum) * 100).toFixed(2))
      : 0;

    const payload = {
      edad_cliente: c.edad_cliente,
      antiguedad_cliente_dias: c.antiguedad_cliente_dias,
      total: totalNum,
      dias_de_plazo: Number(dias_de_plazo) || 7,
      dia_semana: DIAS[ahora.getDay()],
      dia_mes: ahora.getDate(),
      mes: MESES[ahora.getMonth()],
      dio_anticipo: anticipoNum > 0,
      pct_anticipo: pctAnticipo,
      hist_apartados_previos: c.hist_apartados_previos,
      hist_pct_completados: c.hist_pct_completados !== null
        ? Number(c.hist_pct_completados)
        : null,
    };

    const prediccion = await llamarML("/predict/cancelacion", payload);

    return res.json({
      ...prediccion,
      variables_utilizadas: payload,
    });

  } catch (error) {
    console.error("Error en riesgoApartado:", error.message);
    // El fallo del modelo no debe impedir la operación de la caja.
    return res.status(200).json({
      disponible: false,
      message: "El servicio de predicción no está disponible en este momento.",
      detalle: error.name === "AbortError" ? "Tiempo de espera agotado." : error.message,
    });
  }
};

/* ==========================================================================
 * PROPUESTA 3 — Segmento de comportamiento del cliente
 * ==========================================================================
 * GET /api/ml/segmento/:cliente_id
 */
export const segmentoCliente = async (req, res) => {
  const { cliente_id } = req.params;

  try {
    // Construcción del perfil RFM a partir del historial transaccional.
    //   frecuencia          <- número de ventas completadas
    //   monetario           <- suma de ventas.total
    //   ticket_promedio     <- monetario / frecuencia
    //   recencia_dias       <- días desde la última compra
    //   intervalo_prom_dias <- (última - primera) / (frecuencia - 1)
    //                          NULL si solo hay una compra
    const { rows } = await pool.query(
      `WITH compras AS (
         SELECT v.total, v.creado_en
           FROM ventas.ventas v
          WHERE v.cliente_id = $1
            AND v.estado = 'completada'
       )
       SELECT
         COALESCE(EXTRACT(DAY FROM (NOW() - p.creado_en)), 0)::int
           AS antiguedad_cliente_dias,
         (SELECT COUNT(*) FROM compras)::int              AS frecuencia,
         COALESCE((SELECT SUM(total) FROM compras), 0)::numeric AS monetario,
         (SELECT EXTRACT(DAY FROM (NOW() - MAX(creado_en))) FROM compras)::int
           AS recencia_dias,
         (SELECT CASE
                   WHEN COUNT(*) > 1 THEN
                     EXTRACT(DAY FROM (MAX(creado_en) - MIN(creado_en)))
                     / (COUNT(*) - 1)
                   ELSE NULL
                 END
            FROM compras)                                  AS intervalo_prom_dias,
         p.nombre
       FROM seguridad.personas p
       WHERE p.id = $1`,
      [cliente_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "El cliente no existe." });
    }

    const c = rows[0];
    const frecuencia = Number(c.frecuencia) || 0;

    // Un cliente sin compras registradas no puede segmentarse: el modelo se
    // entrenó con clientes que tienen al menos una compra.
    if (frecuencia === 0) {
      return res.json({
        disponible: false,
        segmento: "Sin historial",
        accion_sugerida: "Cliente sin compras registradas. No aplica segmentación.",
        cliente: c.nombre,
      });
    }

    const monetario = Number(c.monetario) || 0;

    const payload = {
      antiguedad_cliente_dias: Number(c.antiguedad_cliente_dias) || 0,
      recencia_dias: Number(c.recencia_dias) || 0,
      frecuencia,
      monetario,
      ticket_promedio: Number((monetario / frecuencia).toFixed(2)),
      intervalo_prom_dias: c.intervalo_prom_dias !== null
        ? Number(Number(c.intervalo_prom_dias).toFixed(2))
        : null,
    };

    const prediccion = await llamarML("/predict/segmento", payload);

    return res.json({
      ...prediccion,
      cliente: c.nombre,
      variables_utilizadas: payload,
    });

  } catch (error) {
    console.error("Error en segmentoCliente:", error.message);
    return res.status(200).json({
      disponible: false,
      message: "El servicio de segmentación no está disponible en este momento.",
      detalle: error.name === "AbortError" ? "Tiempo de espera agotado." : error.message,
    });
  }
};

/* ==========================================================================
 * Estado del servicio de ML (para el panel de administración)
 * ==========================================================================
 * GET /api/ml/estado
 */
export const estadoML = async (_req, res) => {
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    const respuesta = await fetch(`${ML_API_URL}/health`, { signal: controlador.signal });
    clearTimeout(temporizador);

    const datos = await respuesta.json();
    return res.json({ disponible: true, url: ML_API_URL, ...datos });
  } catch (error) {
    return res.json({
      disponible: false,
      url: ML_API_URL,
      detalle: error.name === "AbortError" ? "Tiempo de espera agotado." : error.message,
    });
  }
};
