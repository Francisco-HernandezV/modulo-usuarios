import pool from "../config/db.js";
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// ════════════════════════════════════════════════════════════
//  PROCESAR VENTA (TRANSACCIÓN POS CON PAGOS DIVIDIDOS)
// ════════════════════════════════════════════════════════════
export const procesarVenta = async (req, res) => {
  const { cliente_id, items, pagos } = req.body; 
  const usuario_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "El carrito está vacío." });
  }

  if (!pagos || pagos.length === 0) {
    return res.status(400).json({ message: "Debe registrar al menos un método de pago." });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let subtotal_venta = 0;

    // 1. Validar Stock y Calcular Totales Reales
    for (const item of items) {
      const { rows } = await client.query(
        `SELECT stock, stock_apartado, precio FROM inventario.variantes_producto WHERE id = $1 FOR UPDATE`,
        [item.variante_id]
      );

      if (rows.length === 0) throw new Error(`La variante ID ${item.variante_id} no existe.`);

      const variante = rows[0];
      const stockDisponible = variante.stock - (variante.stock_apartado || 0);

      if (stockDisponible < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto seleccionado.`);
      }

      subtotal_venta += (Number(variante.precio) * item.cantidad);
    }

    const impuestos_venta = 0; 
    const total_venta = subtotal_venta + impuestos_venta;

    // 2. Crear la Venta
    const ventaRes = await client.query(
      `INSERT INTO ventas.ventas (cliente_id, usuario_id, subtotal, impuestos, total, estado)
       VALUES ($1, $2, $3, $4, $5, 'Completada') RETURNING id`,
      [cliente_id || null, usuario_id, subtotal_venta, impuestos_venta, total_venta]
    );
    const ventaId = ventaRes.rows[0].id;

    // 3. Insertar Detalles y Descontar Inventario
    for (const item of items) {
      const { rows } = await client.query(`SELECT precio FROM inventario.variantes_producto WHERE id = $1`, [item.variante_id]);
      const precio_real = rows[0].precio;

      await client.query(
        `INSERT INTO ventas.detalle_venta (venta_id, variante_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)`,
        [ventaId, item.variante_id, item.cantidad, precio_real, precio_real * item.cantidad]
      );
      await client.query(
        `UPDATE inventario.variantes_producto SET stock = stock - $1 WHERE id = $2`,
        [item.cantidad, item.variante_id]
      );
    }

    // 4. Registrar Múltiples Pagos
    const pagoQuery = `INSERT INTO ventas.pagos (venta_id, metodo_pago, monto, estado) VALUES ($1, $2, $3, 'Aprobado')`;
    
    for (const p of pagos) {
      if (Number(p.monto) > 0) {
        await client.query(pagoQuery, [ventaId, p.metodo, p.monto]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: "Venta procesada exitosamente.", venta_id: ventaId });

  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ message: error.message || "Error al procesar la venta." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  BUSCADORES RÁPIDOS PARA POS
// ════════════════════════════════════════════════════════════

export const buscarProductoPos = async (req, res) => {
  try {
    const { q } = req.query; 
    if (!q) return res.json([]);

    const query = `
      SELECT 
        vp.id AS variante_id,
        p.nombre AS producto_nombre,
        t.valor AS talla,
        c.nombre AS color,
        vp.sku,
        vp.precio,
        (vp.stock - COALESCE(vp.stock_apartado, 0)) AS stock_disponible
      FROM inventario.variantes_producto vp
      JOIN inventario.productos p ON p.id = vp.producto_id
      JOIN catalogo.tallas t ON t.id = vp.talla_id
      JOIN catalogo.colores c ON c.id = vp.color_id
      WHERE vp.activo = TRUE AND p.activo = TRUE
        AND (vp.sku ILIKE $1 OR p.nombre ILIKE $2)
      LIMIT 20;
    `;
    const { rows } = await pool.query(query, [`%${q}%`, `%${q}%`]);
    return res.json(rows);
  } catch (error) {
    console.error("Error buscarProductoPos:", error);
    return res.status(500).json({ message: "Error al buscar producto" });
  }
};

export const buscarClientePos = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const query = `
      SELECT id, nombre, telefono, email, rfc 
      FROM ventas.clientes
      WHERE telefono ILIKE $1 OR nombre ILIKE $2 OR email ILIKE $3
      LIMIT 10;
    `;
    const { rows } = await pool.query(query, [`%${q}%`, `%${q}%`, `%${q}%`]);
    return res.json(rows);
  } catch (error) {
    console.error("Error buscarClientePos:", error);
    return res.status(500).json({ message: "Error al buscar cliente" });
  }
};

// ════════════════════════════════════════════════════════════
//  HISTORIAL Y TICKETS DE VENTA
// ════════════════════════════════════════════════════════════

export const getHistorialVentas = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const rol = req.user.rol;

    let query = `
      SELECT v.id, v.total, v.creado_en, v.estado, 
             c.nombre AS cliente_nombre, c.telefono AS cliente_tel,
             u.nombre AS vendedor_nombre
      FROM ventas.ventas v
      LEFT JOIN ventas.clientes c ON v.cliente_id = c.id
      JOIN seguridad.usuarios u ON v.usuario_id = u.id
    `;
    let params = [];

    if (rol === 'rol_vendedor') {
      query += ` WHERE v.usuario_id = $1 AND DATE(v.creado_en) = CURRENT_DATE `;
      params.push(usuarioId);
    }

    query += ` ORDER BY v.creado_en DESC LIMIT 50`; 

    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error("Error getHistorialVentas:", error);
    return res.status(500).json({ message: "Error al obtener historial de ventas" });
  }
};

export const getDetalleTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const cabeceraQuery = `
      SELECT v.id, v.total, v.subtotal, v.creado_en, 
             c.nombre AS cliente_nombre, c.email AS cliente_email,
             u.nombre AS vendedor_nombre,
             p.metodo_pago, p.monto AS monto_pagado
      FROM ventas.ventas v
      LEFT JOIN ventas.clientes c ON v.cliente_id = c.id
      JOIN seguridad.usuarios u ON v.usuario_id = u.id
      LEFT JOIN ventas.pagos p ON p.venta_id = v.id
      WHERE v.id = $1
    `;
    const cabeceraRes = await pool.query(cabeceraQuery, [id]);
    
    if (cabeceraRes.rows.length === 0) {
      return res.status(404).json({ message: "Ticket no encontrado." });
    }

    const detalleQuery = `
      SELECT dv.cantidad, dv.precio_unitario, dv.subtotal,
             p.nombre AS producto_nombre,
             vp.sku, t.valor AS talla, col.nombre AS color
      FROM ventas.detalle_venta dv
      JOIN inventario.variantes_producto vp ON dv.variante_id = vp.id
      JOIN inventario.productos p ON vp.producto_id = p.id
      JOIN catalogo.tallas t ON vp.talla_id = t.id
      JOIN catalogo.colores col ON vp.color_id = col.id
      WHERE dv.venta_id = $1
    `;
    const detalleRes = await pool.query(detalleQuery, [id]);

    return res.json({
      cabecera: cabeceraRes.rows[0],
      articulos: detalleRes.rows
    });
  } catch (error) {
    console.error("Error getDetalleTicket:", error);
    return res.status(500).json({ message: "Error al obtener los detalles del ticket" });
  }
};

// ════════════════════════════════════════════════════════════
//  GENERACIÓN DE TICKET PDF
// ════════════════════════════════════════════════════════════

export const generarTicketPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const ventaRes = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, u.nombre as vendedor_nombre 
      FROM ventas.ventas v 
      LEFT JOIN ventas.clientes c ON v.cliente_id = c.id 
      JOIN seguridad.usuarios u ON v.usuario_id = u.id 
      WHERE v.id = $1`, [id]);
      
    const detalleRes = await pool.query(`
      SELECT dv.*, p.nombre as prod, t.valor as talla 
      FROM ventas.detalle_venta dv 
      JOIN inventario.variantes_producto vp ON dv.variante_id = vp.id 
      JOIN inventario.productos p ON vp.producto_id = p.id 
      JOIN catalogo.tallas t ON vp.talla_id = t.id 
      WHERE dv.venta_id = $1`, [id]);
      
    const pagosRes = await pool.query(`SELECT * FROM ventas.pagos WHERE venta_id = $1`, [id]);

    if (ventaRes.rows.length === 0) {
      return res.status(404).send("Venta no encontrada");
    }

    const v = ventaRes.rows[0];
    const doc = new PDFDocument({ size: [226, 600], margin: 10 }); // Tamaño térmico 80mm
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ticket_DanElement_${id}.pdf`);
    doc.pipe(res);

    // Cabecera
    doc.fontSize(12).text("DAN ELEMENT", { align: 'center', style: 'bold' });
    doc.fontSize(8).text("Boutique Exclusiva", { align: 'center' }).moveDown();
    doc.text(`Folio: #${v.id}`);
    doc.text(`Fecha: ${new Date(v.creado_en).toLocaleString()}`);
    doc.text(`Cajero: ${v.vendedor_nombre}`).moveDown();
    
    doc.text("------------------------------------------");
    
    // Artículos
    detalleRes.rows.forEach(i => {
      doc.text(`${i.cantidad}x ${i.prod} (${i.talla})`);
      doc.text(`$${Number(i.subtotal).toFixed(2)}`, { align: 'right' });
    });
    
    doc.text("------------------------------------------").moveDown();
    
    // Total
    doc.fontSize(11).text(`TOTAL: $${Number(v.total).toFixed(2)}`, { align: 'right', style: 'bold' }).moveDown();
    
    // Pagos
    doc.fontSize(8).text("MÉTODOS DE PAGO:");
    pagosRes.rows.forEach(p => {
      doc.text(`- ${p.metodo_pago}: $${Number(p.monto).toFixed(2)}`);
    });

    // QR
    const qrImage = await QRCode.toDataURL(`https://danelement.com/ticket/${v.id}`);
    doc.image(qrImage, 63, doc.y + 15, { width: 100 });
    
    doc.moveDown(13);
    doc.text("¡Gracias por tu compra!", { align: 'center' });
    
    doc.end();
  } catch (error) { 
    console.error("Error al generar PDF:", error);
    res.status(500).send("Error generando PDF"); 
  }
};