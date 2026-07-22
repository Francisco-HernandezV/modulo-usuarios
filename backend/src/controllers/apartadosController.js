import pool from "../config/db.js";
import PDFDocument from "pdfkit";
import { getTurnoAbierto } from "./cajaController.js";

/**
 * Módulo de Apartados (layaway) — extensión del POS.
 *
 * Reglas de negocio:
 *  - Solo lo operan roles rol_admin y rol_vendedor (protegido en las rutas).
 *  - El tiempo de vigencia es configurable por el admin (public.configuracion.dias_apartado).
 *  - Al crear un apartado se reserva stock: variantes_producto.stock_apartado += cantidad
 *    (stock_disponible = stock - stock_apartado).
 *  - Al liquidar (saldo 0) el producto sale: stock -= cantidad y stock_apartado -= cantidad.
 *  - Al cancelar, el stock reservado regresa: stock_apartado -= cantidad.
 *  - Estados en BD: 'activo' | 'completado' | 'cancelado'. "Vencido" es DERIVADO
 *    (activo + fecha_limite < CURRENT_DATE), no se almacena.
 */

const DIAS_APARTADO_DEFAULT = 7;

// Lee los días de vigencia configurados por el administrador.
async function getDiasVigencia(client = pool) {
  try {
    const { rows } = await client.query(
      `SELECT dias_apartado FROM public.configuracion WHERE id = 1`
    );
    const dias = rows[0]?.dias_apartado;
    return dias && dias >= 1 ? dias : DIAS_APARTADO_DEFAULT;
  } catch {
    return DIAS_APARTADO_DEFAULT;
  }
}

// Convierte la reserva en salida definitiva de mercancía (liquidación/entrega).
async function entregarMercancia(client, apartadoId) {
  const { rows: detalles } = await client.query(
    `SELECT variante_id, cantidad FROM ventas.detalle_apartado WHERE apartado_id = $1`,
    [apartadoId]
  );
  for (const d of detalles) {
    await client.query(
      `UPDATE inventario.variantes_producto
         SET stock = stock - $1, stock_apartado = GREATEST(stock_apartado - $1, 0)
       WHERE id = $2`,
      [d.cantidad, d.variante_id]
    );
  }
}

// ════════════════════════════════════════════════════════════
//  P20 — CREAR APARTADO (reserva stock y calcula vencimiento)
// ════════════════════════════════════════════════════════════
export const crearApartado = async (req, res) => {
  const { cliente_id, items, anticipo, metodo_anticipo } = req.body;
  const usuario_id = req.user.id;

  if (!cliente_id) {
    return res.status(400).json({ message: "Debe seleccionar un cliente para el apartado." });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ message: "El apartado no tiene productos." });
  }

  const anticipoNum = Number(anticipo) || 0;
  if (anticipoNum < 0) {
    return res.status(400).json({ message: "El anticipo no puede ser negativo." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // El POS requiere caja abierta para operar apartados
    const turno = await getTurnoAbierto(client);
    if (!turno) {
      throw new Error("La caja no está abierta. Registra el monto inicial para poder operar.");
    }

    const dias = await getDiasVigencia(client);

    // 1. Validar stock disponible y calcular total real
    let total = 0;
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      if (!cantidad || cantidad <= 0) throw new Error("Cantidad inválida en un producto.");

      const { rows } = await client.query(
        `SELECT stock, stock_apartado, precio
           FROM inventario.variantes_producto WHERE id = $1 FOR UPDATE`,
        [item.variante_id]
      );
      if (rows.length === 0) throw new Error(`La variante ID ${item.variante_id} no existe.`);

      const v = rows[0];
      const disponible = v.stock - (v.stock_apartado || 0);
      if (disponible < cantidad) {
        throw new Error("Stock insuficiente para apartar uno de los productos.");
      }
      total += Number(v.precio) * cantidad;
    }

    if (anticipoNum > total) {
      throw new Error("El anticipo no puede ser mayor al total del apartado.");
    }

    // 2. Crear el apartado (fecha_limite = hoy + días configurados)
    const apartadoRes = await client.query(
      `INSERT INTO ventas.apartados (cliente_id, usuario_id, total, abonado, estado, fecha_limite)
       VALUES ($1, $2, $3, 0, 'activo', CURRENT_DATE + $4::int)
       RETURNING id, fecha_limite`,
      [cliente_id, usuario_id, total, dias]
    );
    const apartadoId = apartadoRes.rows[0].id;
    const fechaLimite = apartadoRes.rows[0].fecha_limite;

    // 3. Detalle + reserva de stock (stock_apartado += cantidad)
    for (const item of items) {
      const { rows } = await client.query(
        `SELECT precio FROM inventario.variantes_producto WHERE id = $1`,
        [item.variante_id]
      );
      const precio = rows[0].precio;

      await client.query(
        `INSERT INTO ventas.detalle_apartado (apartado_id, variante_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [apartadoId, item.variante_id, item.cantidad, precio]
      );
      await client.query(
        `UPDATE inventario.variantes_producto
           SET stock_apartado = stock_apartado + $1 WHERE id = $2`,
        [item.cantidad, item.variante_id]
      );
    }

    // 4. Anticipo inicial (opcional, puede ser $0)
    let abonado = 0;
    let estado = "activo";
    if (anticipoNum > 0) {
      await client.query(
        `INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id)
         VALUES ($1, $2, $3, $4)`,
        [apartadoId, anticipoNum, metodo_anticipo || "Efectivo", usuario_id]
      );
      abonado = anticipoNum;
      await client.query(`UPDATE ventas.apartados SET abonado = $1 WHERE id = $2`, [abonado, apartadoId]);
    }

    // 5. Si el anticipo liquida el total, se completa y entrega de una vez
    if (abonado >= total) {
      await entregarMercancia(client, apartadoId);
      await client.query(`UPDATE ventas.apartados SET estado = 'completado' WHERE id = $1`, [apartadoId]);
      estado = "completado";
    }

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Apartado registrado correctamente.",
      apartado_id: apartadoId,
      fecha_limite: fechaLimite,
      total,
      abonado,
      saldo: total - abonado,
      estado,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error crearApartado:", error);
    return res.status(400).json({ message: error.message || "Error al registrar el apartado." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  P21/P23 — LISTAR APARTADOS (con estado derivado 'vencido')
// ════════════════════════════════════════════════════════════
export const listarApartados = async (req, res) => {
  try {
    const { estado, q } = req.query;

    const params = [];
    const where = [];

    if (estado === "vencido") {
      where.push(`a.estado = 'activo' AND a.fecha_limite < CURRENT_DATE`);
    } else if (["activo", "completado", "cancelado"].includes(estado)) {
      params.push(estado);
      where.push(`a.estado = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      // Permite buscar por folio numérico o por nombre/teléfono del cliente
      where.push(`(CAST(a.id AS TEXT) ILIKE $${idx} OR c.nombre ILIKE $${idx} OR c.telefono ILIKE $${idx})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT
        a.id, a.total, a.abonado, a.estado, a.fecha_limite, a.creado_en,
        (a.total - a.abonado) AS saldo,
        (a.estado = 'activo' AND a.fecha_limite < CURRENT_DATE) AS vencido,
        (a.fecha_limite - CURRENT_DATE) AS dias_restantes,
        c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_tel,
        u.nombre AS vendedor_nombre
      FROM ventas.apartados a
      JOIN seguridad.personas c ON c.id = a.cliente_id
      LEFT JOIN seguridad.personas u ON u.id = a.usuario_id
      ${whereSql}
      ORDER BY
        (a.estado = 'activo' AND a.fecha_limite < CURRENT_DATE) DESC,
        a.creado_en DESC
      LIMIT 200;
    `;
    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error("Error listarApartados:", error);
    return res.status(500).json({ message: "Error al obtener los apartados." });
  }
};

// ════════════════════════════════════════════════════════════
//  P23 — REPORTE DE VENCIMIENTOS
// ════════════════════════════════════════════════════════════
export const getApartadosVencidos = async (req, res) => {
  try {
    const query = `
      SELECT
        a.id, a.total, a.abonado, (a.total - a.abonado) AS saldo,
        a.fecha_limite, a.creado_en,
        (CURRENT_DATE - a.fecha_limite) AS dias_vencido,
        c.nombre AS cliente_nombre, c.telefono AS cliente_tel,
        u.nombre AS vendedor_nombre
      FROM ventas.apartados a
      JOIN seguridad.personas c ON c.id = a.cliente_id
      LEFT JOIN seguridad.personas u ON u.id = a.usuario_id
      WHERE a.estado = 'activo' AND a.fecha_limite < CURRENT_DATE
      ORDER BY a.fecha_limite ASC;
    `;
    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (error) {
    console.error("Error getApartadosVencidos:", error);
    return res.status(500).json({ message: "Error al obtener los vencimientos." });
  }
};

// ════════════════════════════════════════════════════════════
//  DETALLE DE UN APARTADO (productos + historial de abonos)
// ════════════════════════════════════════════════════════════
export const getApartadoDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const cabRes = await pool.query(
      `SELECT
         a.id, a.total, a.abonado, a.estado, a.fecha_limite, a.creado_en,
         (a.total - a.abonado) AS saldo,
         (a.estado = 'activo' AND a.fecha_limite < CURRENT_DATE) AS vencido,
         c.nombre AS cliente_nombre, c.telefono AS cliente_tel, c.email AS cliente_email,
         u.nombre AS vendedor_nombre
       FROM ventas.apartados a
       JOIN seguridad.personas c ON c.id = a.cliente_id
       LEFT JOIN seguridad.personas u ON u.id = a.usuario_id
       WHERE a.id = $1`,
      [id]
    );
    if (cabRes.rows.length === 0) {
      return res.status(404).json({ message: "Apartado no encontrado." });
    }

    const itemsRes = await pool.query(
      `SELECT da.cantidad, da.precio_unitario,
              (da.cantidad * da.precio_unitario) AS subtotal,
              p.nombre AS producto_nombre, vp.sku,
              t.valor AS talla, col.nombre AS color
       FROM ventas.detalle_apartado da
       JOIN inventario.variantes_producto vp ON vp.id = da.variante_id
       JOIN inventario.productos p ON p.id = vp.producto_id
       JOIN catalogo.tallas t ON t.id = vp.talla_id
       JOIN catalogo.colores col ON col.id = vp.color_id
       WHERE da.apartado_id = $1`,
      [id]
    );

    const abonosRes = await pool.query(
      `SELECT ab.id, ab.monto, ab.metodo, ab.fecha, u.nombre AS usuario_nombre
       FROM ventas.abonos ab
       LEFT JOIN seguridad.personas u ON u.id = ab.usuario_id
       WHERE ab.apartado_id = $1
       ORDER BY ab.fecha ASC`,
      [id]
    );

    return res.json({
      apartado: cabRes.rows[0],
      articulos: itemsRes.rows,
      abonos: abonosRes.rows,
    });
  } catch (error) {
    console.error("Error getApartadoDetalle:", error);
    return res.status(500).json({ message: "Error al obtener el detalle del apartado." });
  }
};

// ════════════════════════════════════════════════════════════
//  P21/P22 — REGISTRAR ABONO (auto-liquida a 'completado')
// ════════════════════════════════════════════════════════════
export const registrarAbono = async (req, res) => {
  const { id } = req.params;
  const { monto, metodo } = req.body;
  const usuario_id = req.user.id;

  const montoNum = Number(monto);
  if (!montoNum || montoNum <= 0) {
    return res.status(400).json({ message: "El monto del abono debe ser mayor a cero." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // La caja debe estar abierta para poder recibir abonos
    const turno = await getTurnoAbierto(client);
    if (!turno) {
      throw new Error("La caja no está abierta. Registra el monto inicial para poder recibir abonos.");
    }

    const { rows } = await client.query(
      `SELECT id, total, abonado, estado FROM ventas.apartados WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (rows.length === 0) throw new Error("Apartado no encontrado.");

    const ap = rows[0];
    if (ap.estado !== "activo") {
      throw new Error(`No se pueden registrar abonos: el apartado está ${ap.estado}.`);
    }

    const saldo = Number(ap.total) - Number(ap.abonado);
    if (montoNum > saldo + 0.001) {
      throw new Error(`El abono excede el saldo restante ($${saldo.toFixed(2)}).`);
    }

    await client.query(
      `INSERT INTO ventas.abonos (apartado_id, monto, metodo, usuario_id)
       VALUES ($1, $2, $3, $4)`,
      [id, montoNum, metodo || "Efectivo", usuario_id]
    );

    const nuevoAbonado = Number(ap.abonado) + montoNum;
    await client.query(`UPDATE ventas.apartados SET abonado = $1 WHERE id = $2`, [nuevoAbonado, id]);

    let estado = "activo";
    // P22 — Liquidación: si el saldo llega a 0, se completa y entrega la mercancía
    if (nuevoAbonado >= Number(ap.total)) {
      await entregarMercancia(client, id);
      await client.query(`UPDATE ventas.apartados SET estado = 'completado' WHERE id = $1`, [id]);
      estado = "completado";
    }

    await client.query("COMMIT");
    return res.status(201).json({
      message: estado === "completado"
        ? "Abono registrado. Apartado liquidado y listo para entrega."
        : "Abono registrado correctamente.",
      abonado: nuevoAbonado,
      saldo: Number(ap.total) - nuevoAbonado,
      estado,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error registrarAbono:", error);
    return res.status(400).json({ message: error.message || "Error al registrar el abono." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  P23 — CANCELAR APARTADO (retorna el stock reservado)
// ════════════════════════════════════════════════════════════
export const cancelarApartado = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, estado FROM ventas.apartados WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (rows.length === 0) throw new Error("Apartado no encontrado.");
    if (rows[0].estado !== "activo") {
      throw new Error(`Solo se pueden cancelar apartados activos (actual: ${rows[0].estado}).`);
    }

    // Regresar el stock reservado al inventario disponible
    const { rows: detalles } = await client.query(
      `SELECT variante_id, cantidad FROM ventas.detalle_apartado WHERE apartado_id = $1`,
      [id]
    );
    for (const d of detalles) {
      await client.query(
        `UPDATE inventario.variantes_producto
           SET stock_apartado = GREATEST(stock_apartado - $1, 0) WHERE id = $2`,
        [d.cantidad, d.variante_id]
      );
    }

    await client.query(`UPDATE ventas.apartados SET estado = 'cancelado' WHERE id = $1`, [id]);

    await client.query("COMMIT");
    return res.json({ message: "Apartado cancelado. El stock regresó al inventario disponible." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error cancelarApartado:", error);
    return res.status(400).json({ message: error.message || "Error al cancelar el apartado." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  TICKET / COMPROBANTE PDF DEL APARTADO
// ════════════════════════════════════════════════════════════
export const generarApartadoPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const cabRes = await pool.query(
      `SELECT a.*, (a.total - a.abonado) AS saldo,
              c.nombre AS cliente_nombre, c.telefono AS cliente_tel,
              u.nombre AS vendedor_nombre
       FROM ventas.apartados a
       JOIN seguridad.personas c ON c.id = a.cliente_id
       LEFT JOIN seguridad.personas u ON u.id = a.usuario_id
       WHERE a.id = $1`,
      [id]
    );
    if (cabRes.rows.length === 0) return res.status(404).send("Apartado no encontrado");

    const itemsRes = await pool.query(
      `SELECT da.cantidad, da.precio_unitario, (da.cantidad * da.precio_unitario) AS subtotal,
              p.nombre AS prod, t.valor AS talla
       FROM ventas.detalle_apartado da
       JOIN inventario.variantes_producto vp ON vp.id = da.variante_id
       JOIN inventario.productos p ON p.id = vp.producto_id
       JOIN catalogo.tallas t ON t.id = vp.talla_id
       WHERE da.apartado_id = $1`,
      [id]
    );
    const abonosRes = await pool.query(
      `SELECT monto, metodo, fecha FROM ventas.abonos WHERE apartado_id = $1 ORDER BY fecha ASC`,
      [id]
    );

    const a = cabRes.rows[0];
    const baseHeight = 380 + itemsRes.rows.length * 30 + abonosRes.rows.length * 15;
    const doc = new PDFDocument({ size: [226, baseHeight], margin: 15 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=Apartado_DanElement_${id}.pdf`);
    doc.pipe(res);

    const drawLine = () => {
      doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(15, doc.y).lineTo(211, doc.y).stroke();
      doc.moveDown(0.5);
    };

    doc.font("Helvetica-Bold").fontSize(14).text("DAN ELEMENT", { align: "center" });
    doc.font("Helvetica").fontSize(8).text("Comprobante de Apartado", { align: "center" });
    doc.text("Huejutla de Reyes, Hgo.", { align: "center" }).moveDown(1);

    doc.font("Helvetica-Bold").fontSize(9).text(`Apartado: #${a.id}`);
    doc.font("Helvetica").fontSize(8).text(`Fecha: ${new Date(a.creado_en).toLocaleString("es-MX")}`);
    doc.text(`Vence: ${a.fecha_limite ? new Date(a.fecha_limite).toLocaleDateString("es-MX") : "—"}`);
    doc.text(`Cliente: ${a.cliente_nombre}`);
    if (a.vendedor_nombre) doc.text(`Atendió: ${a.vendedor_nombre}`);
    doc.text(`Estado: ${a.estado.toUpperCase()}`);
    doc.moveDown(0.5);
    drawLine();

    doc.font("Helvetica-Bold").fontSize(8);
    let y = doc.y;
    doc.text("CANT", 15, y, { width: 25 });
    doc.text("DESCRIPCIÓN", 40, y, { width: 110 });
    doc.text("TOTAL", 150, y, { width: 61, align: "right" });
    doc.moveDown(0.5);
    drawLine();

    doc.font("Helvetica").fontSize(8);
    itemsRes.rows.forEach((i) => {
      y = doc.y;
      doc.text(`${i.cantidad}`, 15, y, { width: 25 });
      doc.text(`${i.prod} (${i.talla})`, 40, y, { width: 110 });
      doc.text(`$${Number(i.subtotal).toFixed(2)}`, 150, y, { width: 61, align: "right" });
      doc.moveDown(0.5);
    });
    drawLine();

    doc.font("Helvetica-Bold").fontSize(10);
    const linea = (label, val) => {
      const yy = doc.y;
      doc.text(label, 15, yy, { width: 110 });
      doc.text(`$${Number(val).toFixed(2)}`, 115, yy, { width: 96, align: "right" });
      doc.moveDown(0.4);
    };
    linea("TOTAL:", a.total);
    linea("ABONADO:", a.abonado);
    linea("SALDO:", a.saldo);
    doc.moveDown(0.5);

    if (abonosRes.rows.length > 0) {
      drawLine();
      doc.font("Helvetica-Bold").fontSize(8).text("ABONOS:", 15, doc.y);
      doc.font("Helvetica").fontSize(7);
      abonosRes.rows.forEach((ab) => {
        const yy = doc.y;
        doc.text(`${new Date(ab.fecha).toLocaleDateString("es-MX")} ${ab.metodo}`, 15, yy, { width: 130 });
        doc.text(`$${Number(ab.monto).toFixed(2)}`, 145, yy, { width: 66, align: "right" });
        doc.moveDown(0.35);
      });
    }

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(7)
      .text("Conserva este comprobante. La mercancía se entrega al liquidar el saldo.", 15, doc.y, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Error generarApartadoPDF:", error);
    res.status(500).send("Error generando PDF");
  }
};
