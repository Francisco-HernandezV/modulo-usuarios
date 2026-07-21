import pool from "../config/db.js";
import { subirBuffer, borrarImagen, carpetaProducto } from "../config/cloudinary.js";

const MAX_IMAGENES_POR_PRODUCTO = 4;

// ════════════════════════════════════════════════════════════
//  GET  /api/admin/productos/:id/imagenes        (público)
//  Devuelve la galería completa de un producto, ya ordenada.
// ════════════════════════════════════════════════════════════
export const getImagenesProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, producto_id, variante_id, url, public_id, orden, principal
         FROM inventario.imagenes_producto
        WHERE producto_id = $1
        ORDER BY principal DESC, orden ASC, id ASC`,
      [id]
    );
    return res.json(rows);
  } catch (error) {
    console.error("getImagenesProducto:", error);
    return res.status(500).json({ message: "Error al obtener las imágenes" });
  }
};

// ════════════════════════════════════════════════════════════
//  POST /api/admin/productos/:id/imagenes        (multipart)
//  Campo del formulario: "imagenes" (hasta 4 archivos)
//  Opcional en el body: variante_id (para fotos de un color específico)
//
//  Flujo: multer guarda en RAM -> subimos a Cloudinary -> guardamos el
//  enlace en Postgres. Si la BD falla, se borran las fotos ya subidas
//  para no dejar huérfanos en tu cuenta.
// ════════════════════════════════════════════════════════════
export const subirImagenesProducto = async (req, res) => {
  const { id } = req.params;
  const varianteId = req.body?.variante_id ? Number(req.body.variante_id) : null;
  const archivos = req.files || [];

  if (archivos.length === 0) {
    return res.status(400).json({ message: "No se recibió ninguna imagen." });
  }

  const subidas = [];
  const client = await pool.connect();

  try {
    // 1. El producto debe existir
    const prod = await client.query(
      "SELECT id FROM inventario.productos WHERE id = $1",
      [id]
    );
    if (prod.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // 2. Revisar cuántas tiene ya y si alguna es principal
    const estado = await client.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(MAX(orden), -1) AS ultimo_orden,
              BOOL_OR(principal) AS tiene_principal
         FROM inventario.imagenes_producto
        WHERE producto_id = $1`,
      [id]
    );
    const { total, ultimo_orden, tiene_principal } = estado.rows[0];

    if (total + archivos.length > MAX_IMAGENES_POR_PRODUCTO) {
      return res.status(400).json({
        message: `Este producto ya tiene ${total} imágenes. El máximo permitido es ${MAX_IMAGENES_POR_PRODUCTO}.`,
      });
    }

    // 3. Subir todas a Cloudinary (en paralelo, es lo lento)
    const folder = carpetaProducto(id);
    const resultados = await Promise.all(
      archivos.map((a) => subirBuffer(a.buffer, folder))
    );
    subidas.push(...resultados);

    // 4. Guardar los enlaces en la BD
    await client.query("BEGIN");

    const insertadas = [];
    let orden = Number(ultimo_orden) + 1;
    let yaHayPrincipal = Boolean(tiene_principal);

    for (const r of resultados) {
      const esPrincipal = !yaHayPrincipal;
      if (esPrincipal) yaHayPrincipal = true;

      const { rows } = await client.query(
        `INSERT INTO inventario.imagenes_producto
           (producto_id, variante_id, url, public_id, orden, principal)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, producto_id, variante_id, url, public_id, orden, principal`,
        [id, varianteId, r.secure_url, r.public_id, orden, esPrincipal]
      );
      insertadas.push(rows[0]);
      orden += 1;
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: `${insertadas.length} imagen(es) subida(s) correctamente.`,
      imagenes: insertadas,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    // Compensación: si ya subimos a Cloudinary pero falló la BD, limpiamos
    await Promise.all(subidas.map((s) => borrarImagen(s.public_id)));
    console.error("subirImagenesProducto:", error);
    return res.status(500).json({
      message: error.message || "Error al subir las imágenes.",
    });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  DELETE /api/admin/productos/:id/imagenes/:imagenId
//  Borra el renglón de la BD y el archivo en Cloudinary.
//  Si era la principal, asciende automáticamente a la siguiente.
// ════════════════════════════════════════════════════════════
export const eliminarImagenProducto = async (req, res) => {
  const { id, imagenId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `DELETE FROM inventario.imagenes_producto
        WHERE id = $1 AND producto_id = $2
        RETURNING id, public_id, principal`,
      [imagenId, id]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Imagen no encontrada." });
    }

    const eliminada = rows[0];

    // Si era la portada, promovemos la siguiente disponible
    if (eliminada.principal) {
      await client.query(
        `UPDATE inventario.imagenes_producto
            SET principal = TRUE
          WHERE id = (
            SELECT id FROM inventario.imagenes_producto
             WHERE producto_id = $1
             ORDER BY orden ASC, id ASC
             LIMIT 1
          )`,
        [id]
      );
    }

    await client.query("COMMIT");

    // El borrado remoto va fuera de la transacción: si Cloudinary
    // no responde, la BD ya quedó consistente.
    await borrarImagen(eliminada.public_id);

    return res.json({ message: "Imagen eliminada correctamente." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("eliminarImagenProducto:", error);
    return res.status(500).json({ message: "Error al eliminar la imagen." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  PUT /api/admin/productos/:id/imagenes/:imagenId/principal
//  Define cuál foto es la portada del producto en el catálogo.
// ════════════════════════════════════════════════════════════
export const marcarImagenPrincipal = async (req, res) => {
  const { id, imagenId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Primero apagamos todas (el índice único lo exige)
    await client.query(
      `UPDATE inventario.imagenes_producto
          SET principal = FALSE
        WHERE producto_id = $1 AND principal = TRUE`,
      [id]
    );

    const { rows } = await client.query(
      `UPDATE inventario.imagenes_producto
          SET principal = TRUE
        WHERE id = $1 AND producto_id = $2
        RETURNING id`,
      [imagenId, id]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Imagen no encontrada." });
    }

    await client.query("COMMIT");
    return res.json({ message: "Imagen principal actualizada." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("marcarImagenPrincipal:", error);
    return res.status(500).json({ message: "Error al marcar la imagen principal." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  PUT /api/admin/productos/:id/imagenes/orden
//  Body: { orden: [12, 9, 15] }  <- ids en el orden deseado
// ════════════════════════════════════════════════════════════
export const reordenarImagenes = async (req, res) => {
  const { id } = req.params;
  const { orden } = req.body;

  if (!Array.isArray(orden) || orden.length === 0) {
    return res.status(400).json({ message: "Debes enviar un arreglo 'orden' con los IDs." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orden.length; i++) {
      await client.query(
        `UPDATE inventario.imagenes_producto
            SET orden = $1
          WHERE id = $2 AND producto_id = $3`,
        [i, Number(orden[i]), id]
      );
    }
    await client.query("COMMIT");
    return res.json({ message: "Orden actualizado." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("reordenarImagenes:", error);
    return res.status(500).json({ message: "Error al reordenar las imágenes." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  GET /api/admin/productos/:id/detalle           (público)
//  Producto + galería en una sola llamada (para ProductDetails)
// ════════════════════════════════════════════════════════════
export const getProductoConImagenes = async (req, res) => {
  try {
    const { id } = req.params;

    const prodRes = await pool.query(
      `SELECT p.*,
              c.nombre AS categoria_nombre,
              m.nombre AS marca_nombre,
              d.nombre AS departamento_nombre
         FROM inventario.productos p
         LEFT JOIN catalogo.categorias    c ON c.id = p.categoria_id
         LEFT JOIN catalogo.marcas        m ON m.id = p.marca_id
         LEFT JOIN catalogo.departamentos d ON d.id = p.departamento_id
        WHERE p.id = $1`,
      [id]
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const imgRes = await pool.query(
      `SELECT id, url, public_id, orden, principal, variante_id
         FROM inventario.imagenes_producto
        WHERE producto_id = $1
        ORDER BY principal DESC, orden ASC, id ASC`,
      [id]
    );

    return res.json({
      ...prodRes.rows[0],
      imagenes: imgRes.rows,
      imagen: imgRes.rows[0]?.url || null,
    });
  } catch (error) {
    console.error("getProductoConImagenes:", error);
    return res.status(500).json({ message: "Error al obtener el producto" });
  }
};