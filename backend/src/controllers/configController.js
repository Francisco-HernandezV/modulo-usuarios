import pool from "../config/db.js";

/**
 * Configuración general de la tienda (logo, ubicación, redes sociales y
 * datos de contacto). Se guarda como una única fila (id = 1) en la tabla
 * public.configuracion, siguiendo el patrón de public.monitor_stats_offset.
 *
 * El logo se almacena como Data URI en base64 dentro de la propia base de
 * datos, evitando depender de un sistema de archivos persistente.
 */

const COLUMNAS = [
  "nombre_tienda",
  "ubicacion",
  "maps_url",
  "telefono_1",
  "telefono_2",
  "whatsapp",
  "email_contacto",
  "facebook",
  "instagram",
  "tiktok",
  "twitter",
];

// Normaliza un valor de texto: recorta espacios y convierte vacío en null.
const nz = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
};

// Garantiza (una sola vez) que la tabla y la fila base existan.
let ensurePromise = null;
function ensureConfigTable() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.configuracion (
          id              INTEGER PRIMARY KEY DEFAULT 1,
          nombre_tienda   VARCHAR(120),
          logo            TEXT,
          ubicacion       TEXT,
          maps_url        TEXT,
          telefono_1      VARCHAR(30),
          telefono_2      VARCHAR(30),
          whatsapp        VARCHAR(30),
          email_contacto  VARCHAR(150),
          facebook        VARCHAR(255),
          instagram       VARCHAR(255),
          tiktok          VARCHAR(255),
          twitter         VARCHAR(255),
          actualizado_en  TIMESTAMP DEFAULT NOW(),
          CONSTRAINT configuracion_single_row CHECK (id = 1)
        );
      `);
      // Días de vigencia de apartados (P19). Se agrega a la tabla existente.
      await pool.query(
        `ALTER TABLE public.configuracion ADD COLUMN IF NOT EXISTS dias_apartado INTEGER NOT NULL DEFAULT 7;`
      );
      await pool.query(
        `INSERT INTO public.configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`
      );
    })().catch((err) => {
      // Permite reintentar en la siguiente petición si falló la inicialización.
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
}

// GET /api/admin/configuracion  → público (lo consume la tienda)
export const getConfiguracion = async (req, res) => {
  try {
    await ensureConfigTable();
    const { rows } = await pool.query(
      `SELECT * FROM public.configuracion WHERE id = 1`
    );
    return res.json(rows[0] || {});
  } catch (error) {
    console.error("Error al obtener la configuración:", error);
    return res.status(500).json({ message: "Error al obtener la configuración." });
  }
};

// PUT /api/admin/configuracion  → solo rol_admin (multipart, campo de archivo "logo")
export const updateConfiguracion = async (req, res) => {
  try {
    await ensureConfigTable();

    // Campos de texto (llegan como form-data).
    const valores = COLUMNAS.map((col) => nz(req.body[col]));

    // Cláusula SET base con los 11 campos de texto.
    const setParts = COLUMNAS.map((col, i) => `${col} = $${i + 1}`);
    const params = [...valores];

    // Días de vigencia de apartados (entero >= 1). Solo se actualiza si viene.
    if (req.body.dias_apartado !== undefined && req.body.dias_apartado !== "") {
      const dias = parseInt(req.body.dias_apartado, 10);
      if (!Number.isNaN(dias) && dias >= 1) {
        params.push(dias);
        setParts.push(`dias_apartado = $${params.length}`);
      }
    }

    // Manejo del logo:
    //  - Si llega un archivo nuevo → se guarda como Data URI base64.
    //  - Si llega remove_logo = "true" → se elimina el logo.
    //  - Si no → se conserva el logo actual.
    if (req.file) {
      const mime = req.file.mimetype || "image/png";
      const dataUri = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
      params.push(dataUri);
      setParts.push(`logo = $${params.length}`);
    } else if (String(req.body.remove_logo) === "true") {
      setParts.push(`logo = NULL`);
    }

    setParts.push(`actualizado_en = NOW()`);

    const sql = `UPDATE public.configuracion SET ${setParts.join(", ")} WHERE id = 1 RETURNING *;`;
    const { rows } = await pool.query(sql, params);

    return res.json({
      message: "Configuración actualizada correctamente.",
      configuracion: rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar la configuración:", error);
    return res.status(500).json({ message: "Error al actualizar la configuración." });
  }
};
