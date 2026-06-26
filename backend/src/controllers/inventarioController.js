import pool from "../config/db.js";

// Margen estándar de boutique para sugerir precio de venta
const MARGEN_SUGERIDO = 2.5;

// ════════════════════════════════════════════════════════════
//  BÚSQUEDA DE PRODUCTOS (no variantes) PARA EL WIZARD DE INGRESO
//  Solo devuelve el producto + sus datos base, no las variantes
// ════════════════════════════════════════════════════════════
export const buscarProductoParaIngreso = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio_base,
        c.nombre AS categoria_nombre,
        m.nombre AS marca_nombre,
        (SELECT COUNT(*) FROM inventario.variantes_producto vp WHERE vp.producto_id = p.id AND vp.activo = TRUE) AS total_variantes,
        (SELECT COALESCE(SUM(vp.stock), 0) FROM inventario.variantes_producto vp WHERE vp.producto_id = p.id) AS stock_total
      FROM inventario.productos p
      LEFT JOIN catalogo.categorias c ON c.id = p.categoria_id
      LEFT JOIN catalogo.marcas m ON m.id = p.marca_id
      WHERE p.activo = TRUE
        AND p.nombre ILIKE $1
      ORDER BY p.nombre ASC
      LIMIT 20;
    `;
    const { rows } = await pool.query(query, [`%${q}%`]);
    return res.json(rows);
  } catch (error) {
    console.error("Error buscarProductoParaIngreso:", error);
    return res.status(500).json({ message: "Error al buscar productos" });
  }
};

// ════════════════════════════════════════════════════════════
//  OBTENER MATRIZ DE VARIANTES DE UN PRODUCTO
//  Devuelve todas las variantes activas del producto, agrupadas
//  por talla y color, con stock actual y costo promedio actual
// ════════════════════════════════════════════════════════════
export const getMatrizVariantes = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el producto exista
    const prodRes = await pool.query(
      `SELECT id, nombre, precio_base FROM inventario.productos WHERE id = $1 AND activo = TRUE`,
      [id]
    );
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Obtener todas las variantes con su info de talla y color
    const variantesRes = await pool.query(`
      SELECT 
        vp.id AS variante_id,
        vp.sku,
        vp.stock,
        vp.costo_promedio,
        vp.precio,
        t.id AS talla_id,
        t.valor AS talla_valor,
        tt.id AS tipo_talla_id,
        tt.nombre AS tipo_talla_nombre,
        c.id AS color_id,
        c.nombre AS color_nombre,
        c.codigo_hex
      FROM inventario.variantes_producto vp
      JOIN catalogo.tallas t ON t.id = vp.talla_id
      JOIN catalogo.tipos_talla tt ON tt.id = t.tipo_talla_id
      JOIN catalogo.colores c ON c.id = vp.color_id
      WHERE vp.producto_id = $1 AND vp.activo = TRUE
      ORDER BY t.valor ASC, c.nombre ASC
    `, [id]);

    // Calcular costo promedio actual del producto (promedio ponderado por stock)
    let costoPromedioActual = 0;
    let stockTotalActual = 0;
    for (const v of variantesRes.rows) {
      const stk = Number(v.stock);
      const cp = Number(v.costo_promedio) || 0;
      costoPromedioActual += stk * cp;
      stockTotalActual += stk;
    }
    costoPromedioActual = stockTotalActual > 0 ? (costoPromedioActual / stockTotalActual) : 0;

    // Construir listas únicas de tallas y colores para que el frontend arme la matriz
    const tallasMap = new Map();
    const coloresMap = new Map();
    for (const v of variantesRes.rows) {
      if (!tallasMap.has(v.talla_id)) {
        tallasMap.set(v.talla_id, { id: v.talla_id, valor: v.talla_valor, tipo: v.tipo_talla_nombre });
      }
      if (!coloresMap.has(v.color_id)) {
        coloresMap.set(v.color_id, { id: v.color_id, nombre: v.color_nombre, codigo_hex: v.codigo_hex });
      }
    }

    return res.json({
      producto: {
        id: prodRes.rows[0].id,
        nombre: prodRes.rows[0].nombre,
        precio_base: Number(prodRes.rows[0].precio_base),
        costo_promedio_actual: Number(costoPromedioActual.toFixed(2)),
        stock_total_actual: stockTotalActual
      },
      tallas: [...tallasMap.values()],
      colores: [...coloresMap.values()],
      variantes: variantesRes.rows.map(v => ({
        variante_id: v.variante_id,
        sku: v.sku,
        talla_id: v.talla_id,
        color_id: v.color_id,
        stock: Number(v.stock),
        costo_promedio: Number(v.costo_promedio) || 0,
        precio: Number(v.precio)
      }))
    });
  } catch (error) {
    console.error("Error getMatrizVariantes:", error);
    return res.status(500).json({ message: "Error al obtener la matriz de variantes" });
  }
};

// ════════════════════════════════════════════════════════════
//  CALCULAR SUGERENCIA POR PRODUCTO COMPLETO
//  Recibe: producto_id, total_piezas, costo_unitario
//  Devuelve: nuevo costo promedio del producto + precio sugerido
// ════════════════════════════════════════════════════════════
export const calcularSugerenciaProducto = async (req, res) => {
  try {
    const { producto_id, total_piezas, costo_unitario } = req.body;

    if (!producto_id || !total_piezas || costo_unitario === undefined) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const piezas = Number(total_piezas);
    const costo = Number(costo_unitario);

    if (piezas <= 0 || costo < 0) {
      return res.status(400).json({ message: "Cantidad o costo inválido" });
    }

    // Obtener stock y costo promedio actual de TODAS las variantes del producto
    const { rows } = await pool.query(
      `SELECT stock, costo_promedio 
       FROM inventario.variantes_producto 
       WHERE producto_id = $1 AND activo = TRUE`,
      [producto_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "El producto no tiene variantes" });
    }

    // Calcular costo ponderado actual a nivel de producto
    let valorInventarioActual = 0;
    let stockTotalActual = 0;
    for (const v of rows) {
      const s = Number(v.stock);
      const cp = Number(v.costo_promedio) || 0;
      valorInventarioActual += s * cp;
      stockTotalActual += s;
    }

    const costoPromedioActual = stockTotalActual > 0 
      ? valorInventarioActual / stockTotalActual 
      : 0;

    // Calcular nuevo costo promedio ponderado del producto
    const totalUnidades = stockTotalActual + piezas;
    const costoPromedioNuevo = totalUnidades === 0
      ? costo
      : (valorInventarioActual + (piezas * costo)) / totalUnidades;

    const precioSugerido = costoPromedioNuevo * MARGEN_SUGERIDO;

    return res.json({
      stock_total_actual: stockTotalActual,
      costo_promedio_actual: Number(costoPromedioActual.toFixed(2)),
      costo_promedio_nuevo: Number(costoPromedioNuevo.toFixed(2)),
      precio_sugerido: Number(precioSugerido.toFixed(2)),
      margen_aplicado: MARGEN_SUGERIDO
    });
  } catch (error) {
    console.error("Error calcularSugerenciaProducto:", error);
    return res.status(500).json({ message: "Error al calcular sugerencia" });
  }
};

// ════════════════════════════════════════════════════════════
//  REGISTRAR ENTRADA DE MERCANCÍA (NUEVO FORMATO: AGRUPADO POR PRODUCTO)
//  Estructura del payload:
//  {
//    origen_mercancia, nota_referencia,
//    productos: [
//      {
//        producto_id,
//        costo_unitario,       <- mismo para todas las variantes de este producto
//        nuevo_precio_venta,   <- precio final que aplicará a todas las variantes
//        variantes: [          <- celdas de la matriz con piezas > 0
//          { variante_id, cantidad },
//          ...
//        ]
//      },
//      ...
//    ]
//  }
// ════════════════════════════════════════════════════════════
export const registrarEntrada = async (req, res) => {
  const { origen_mercancia, nota_referencia, productos } = req.body;
  const usuario_id = req.user.id;

  // Validaciones generales
  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ message: "Debe agregar al menos un producto al ingreso." });
  }

  // Validar cada producto y sus variantes
  for (const prod of productos) {
    if (!prod.producto_id) {
      return res.status(400).json({ message: "Hay productos sin ID." });
    }
    if (prod.costo_unitario === undefined || Number(prod.costo_unitario) < 0) {
      return res.status(400).json({ message: "El costo unitario es obligatorio y no puede ser negativo." });
    }
    if (!prod.nuevo_precio_venta || Number(prod.nuevo_precio_venta) <= 0) {
      return res.status(400).json({ message: "El precio de venta debe ser mayor a cero." });
    }
    if (!Array.isArray(prod.variantes) || prod.variantes.length === 0) {
      return res.status(400).json({ message: "Cada producto debe tener al menos una variante con cantidad." });
    }
    for (const v of prod.variantes) {
      if (!v.variante_id || !v.cantidad || Number(v.cantidad) <= 0) {
        return res.status(400).json({ message: "Hay variantes con cantidad inválida." });
      }
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Calcular total del lote (sumatoria de cantidad × costo_unitario por todas las celdas)
    let totalLote = 0;
    for (const prod of productos) {
      const costoProd = Number(prod.costo_unitario);
      for (const v of prod.variantes) {
        totalLote += Number(v.cantidad) * costoProd;
      }
    }

    // 1. INSERTAR CABECERA
    const cabeceraRes = await client.query(
      `INSERT INTO inventario.entradas_inventario 
       (usuario_id, origen_mercancia, nota_referencia, total_lote, estado)
       VALUES ($1, $2, $3, $4, 'activa')
       RETURNING id`,
      [usuario_id, origen_mercancia?.trim() || null, nota_referencia?.trim() || null, totalLote]
    );
    const entradaId = cabeceraRes.rows[0].id;

    // 2. PROCESAR CADA PRODUCTO
    for (const prod of productos) {
      const productoId = Number(prod.producto_id);
      const costoNuevo = Number(prod.costo_unitario);
      const nuevoPrecio = Number(prod.nuevo_precio_venta);

      // Procesar cada variante (celda de la matriz con cantidad > 0)
      for (const v of prod.variantes) {
        const varianteId = Number(v.variante_id);
        const cantidad = Number(v.cantidad);

        // Bloquear variante (evita race conditions si dos admins capturan al mismo tiempo)
        const variRes = await client.query(
          `SELECT stock, costo_promedio 
           FROM inventario.variantes_producto 
           WHERE id = $1 AND producto_id = $2 FOR UPDATE`,
          [varianteId, productoId]
        );

        if (variRes.rows.length === 0) {
          throw new Error(`La variante ID ${varianteId} no pertenece al producto ${productoId}.`);
        }

        const stockActual = Number(variRes.rows[0].stock);
        const costoActual = Number(variRes.rows[0].costo_promedio) || 0;

        // Insertar renglón
        await client.query(
          `INSERT INTO inventario.detalle_entrada 
           (entrada_id, variante_id, cantidad, costo_unitario)
           VALUES ($1, $2, $3, $4)`,
          [entradaId, varianteId, cantidad, costoNuevo]
        );

        // Calcular costo promedio ponderado a nivel VARIANTE
        const totalUnidades = stockActual + cantidad;
        const costoPromedioVarianteNuevo = totalUnidades === 0
          ? costoNuevo
          : ((stockActual * costoActual) + (cantidad * costoNuevo)) / totalUnidades;

        // Actualizar stock y costo promedio de la variante
        await client.query(
          `UPDATE inventario.variantes_producto 
           SET stock = stock + $1,
               costo_promedio = $2
           WHERE id = $3`,
          [cantidad, costoPromedioVarianteNuevo.toFixed(2), varianteId]
        );
      }

      // Una vez procesadas todas las variantes del producto, actualizar precio de venta
      // Aplica a TODAS las variantes del producto (no solo las que entraron en este lote)
      await client.query(
        `UPDATE inventario.productos SET precio_base = $1 WHERE id = $2`,
        [nuevoPrecio, productoId]
      );
      await client.query(
        `UPDATE inventario.variantes_producto SET precio = $1 WHERE producto_id = $2`,
        [nuevoPrecio, productoId]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ 
      message: "Entrada de mercancía registrada exitosamente.",
      entrada_id: entradaId,
      total_lote: totalLote
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error registrarEntrada:", error);
    return res.status(500).json({ message: error.message || "Error interno al registrar la entrada." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  LISTAR HISTORIAL DE ENTRADAS
// ════════════════════════════════════════════════════════════
export const getHistorialEntradas = async (req, res) => {
  try {
    const query = `
      SELECT 
        ei.id,
        ei.origen_mercancia,
        ei.nota_referencia,
        ei.total_lote,
        ei.fecha_entrada,
        ei.estado,
        ei.anulada_en,
        ei.motivo_anulacion,
        u.nombre AS usuario_nombre,
        ua.nombre AS anulada_por_nombre,
        (SELECT COUNT(*) FROM inventario.detalle_entrada de WHERE de.entrada_id = ei.id) AS total_renglones,
        (SELECT COALESCE(SUM(de.cantidad), 0) FROM inventario.detalle_entrada de WHERE de.entrada_id = ei.id) AS total_piezas
      FROM inventario.entradas_inventario ei
      JOIN seguridad.usuarios u ON u.id = ei.usuario_id
      LEFT JOIN seguridad.usuarios ua ON ua.id = ei.anulada_por
      ORDER BY ei.fecha_entrada DESC
      LIMIT 100;
    `;
    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (error) {
    console.error("Error getHistorialEntradas:", error);
    return res.status(500).json({ message: "Error al obtener historial de entradas" });
  }
};

// ════════════════════════════════════════════════════════════
//  DETALLE DE UNA ENTRADA ESPECÍFICA
// ════════════════════════════════════════════════════════════
export const getDetalleEntrada = async (req, res) => {
  try {
    const { id } = req.params;

    const cabeceraRes = await pool.query(`
      SELECT 
        ei.*,
        u.nombre AS usuario_nombre,
        ua.nombre AS anulada_por_nombre
      FROM inventario.entradas_inventario ei
      JOIN seguridad.usuarios u ON u.id = ei.usuario_id
      LEFT JOIN seguridad.usuarios ua ON ua.id = ei.anulada_por
      WHERE ei.id = $1
    `, [id]);

    if (cabeceraRes.rows.length === 0) {
      return res.status(404).json({ message: "Entrada no encontrada" });
    }

    const detalleRes = await pool.query(`
      SELECT 
        de.id,
        de.cantidad,
        de.costo_unitario,
        (de.cantidad * de.costo_unitario) AS subtotal,
        vp.sku,
        p.nombre AS producto_nombre,
        t.valor AS talla,
        c.nombre AS color
      FROM inventario.detalle_entrada de
      JOIN inventario.variantes_producto vp ON vp.id = de.variante_id
      JOIN inventario.productos p ON p.id = vp.producto_id
      JOIN catalogo.tallas t ON t.id = vp.talla_id
      JOIN catalogo.colores c ON c.id = vp.color_id
      WHERE de.entrada_id = $1
      ORDER BY p.nombre, t.valor
    `, [id]);

    return res.json({
      cabecera: cabeceraRes.rows[0],
      renglones: detalleRes.rows
    });
  } catch (error) {
    console.error("Error getDetalleEntrada:", error);
    return res.status(500).json({ message: "Error al obtener detalle" });
  }
};

// ════════════════════════════════════════════════════════════
//  ANULAR ENTRADA (Revierte stock — protege contra ventas posteriores)
// ════════════════════════════════════════════════════════════
export const anularEntrada = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const usuario_id = req.user.id;

  if (!motivo?.trim()) {
    return res.status(400).json({ message: "Debes indicar el motivo de la anulación." });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const entradaRes = await client.query(
      `SELECT id, estado FROM inventario.entradas_inventario WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (entradaRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Entrada no encontrada" });
    }

    if (entradaRes.rows[0].estado === 'anulada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Esta entrada ya está anulada." });
    }

    const renglonesRes = await client.query(
      `SELECT variante_id, cantidad FROM inventario.detalle_entrada WHERE entrada_id = $1`,
      [id]
    );

    // Validar stock suficiente para revertir
    for (const r of renglonesRes.rows) {
      const stockCheck = await client.query(
        `SELECT stock FROM inventario.variantes_producto WHERE id = $1 FOR UPDATE`,
        [r.variante_id]
      );
      const stockActual = Number(stockCheck.rows[0].stock);
      if (stockActual < Number(r.cantidad)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          message: `No se puede anular: ya se vendieron piezas de este lote. Stock actual insuficiente para revertir variante ID ${r.variante_id}.` 
        });
      }
    }

    // Revertir stock
    for (const r of renglonesRes.rows) {
      await client.query(
        `UPDATE inventario.variantes_producto 
         SET stock = stock - $1 
         WHERE id = $2`,
        [r.cantidad, r.variante_id]
      );
    }

    await client.query(
      `UPDATE inventario.entradas_inventario 
       SET estado = 'anulada', 
           anulada_en = CURRENT_TIMESTAMP, 
           anulada_por = $1, 
           motivo_anulacion = $2
       WHERE id = $3`,
      [usuario_id, motivo.trim(), id]
    );

    await client.query('COMMIT');
    return res.json({ message: "Entrada anulada correctamente. El stock fue revertido." });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error anularEntrada:", error);
    return res.status(500).json({ message: "Error al anular la entrada" });
  } finally {
    client.release();
  }
};