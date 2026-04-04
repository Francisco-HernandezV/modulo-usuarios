import pool from "../config/db.js";

// ════════════════════════════════════════════════════════════
//  CATÁLOGOS BASE (NUEVO EN V2)
// ════════════════════════════════════════════════════════════

export const getCategorias = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categorias ORDER BY nombre ASC");
    return res.json(rows);
  } catch (error) {
    console.error("getCategorias:", error);
    return res.status(500).json({ message: "Error al obtener categorías" });
  }
};

export const createCategoria = async (req, res) => {
  try {
    const { nombre, activo = true } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });

    const { rows } = await pool.query(
      "INSERT INTO categorias (nombre, activo) VALUES ($1, $2) RETURNING *",
      [nombre.trim(), activo]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ message: "Ya existe esa categoría" });
    return res.status(500).json({ message: "Error al crear categoría" });
  }
};

export const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    const { rows } = await pool.query(
      "UPDATE categorias SET nombre = $1, activo = $2 WHERE id = $3 RETURNING *",
      [nombre.trim(), activo, id]
    );
    return rows.length ? res.json(rows[0]) : res.status(404).json({ message: "No encontrada" });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar" });
  }
};

export const deleteCategoria = async (req, res) => {
  try {
    await pool.query("DELETE FROM categorias WHERE id = $1", [req.params.id]);
    return res.json({ message: "Eliminada" });
  } catch (error) {
    if (error.code === "23503") return res.status(409).json({ message: "Hay productos vinculados a esta categoría" });
    return res.status(500).json({ message: "Error al eliminar" });
  }
};

// --- Endpoints de apoyo para V2 (Lectura rápida) ---
export const getMarcas = async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM marcas ORDER BY nombre ASC");
        return res.json(rows);
    } catch (e) { return res.status(500).json({ message: "Error al obtener marcas" }); }
};

export const getDepartamentos = async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM departamentos ORDER BY nombre ASC");
        return res.json(rows);
    } catch (e) { return res.status(500).json({ message: "Error al obtener departamentos" }); }
};

export const getColores = async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM colores ORDER BY nombre ASC");
        return res.json(rows);
    } catch (e) { return res.status(500).json({ message: "Error al obtener colores" }); }
};

export const getTallas = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.valor, t.tipo_talla_id, tt.nombre AS tipo_nombre
      FROM tallas t
      JOIN tipos_talla tt ON tt.id = t.tipo_talla_id
      ORDER BY tt.nombre ASC, t.valor ASC
    `);
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener tallas" });
  }
};

// ── FUNCIONES NUEVAS ─────────────────────────────────────────────────────
export const getTiposTalla = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tipos_talla ORDER BY nombre ASC");
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener tipos de talla" });
  }
};

export const createTalla = async (req, res) => {
  try {
    const { tipo_talla_id, nuevo_tipo, valores } = req.body;

    if (!valores?.length)
      return res.status(400).json({ message: "Debes enviar al menos un valor" });

    let tipoId = tipo_talla_id;

    if (!tipoId && nuevo_tipo?.trim()) {
      const { rows } = await pool.query(
        `INSERT INTO tipos_talla (nombre)
         VALUES ($1)
         ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id`,
        [nuevo_tipo.trim()]
      );
      tipoId = rows[0].id;
    }

    if (!tipoId)
      return res.status(400).json({ message: "Se requiere un tipo de talla válido" });

    const insertadas = [];
    const duplicadas = [];

    for (const valor of valores) {
      try {
        const { rows } = await pool.query(
          "INSERT INTO tallas (tipo_talla_id, valor) VALUES ($1, $2) RETURNING *",
          [tipoId, valor.trim()]
        );
        insertadas.push(rows[0]);
      } catch (err) {
        if (err.code === "23505") duplicadas.push(valor); // ya existe
        else throw err;
      }
    }

    return res.status(201).json({ insertadas, duplicadas });
  } catch (error) {
    console.error("createTalla:", error);
    return res.status(500).json({ message: "Error al crear tallas" });
  }
};

export const deleteTalla = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM tallas WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Talla no encontrada" });
    return res.json({ message: "Talla eliminada correctamente" });
  } catch (error) {
    if (error.code === "23503")
      return res.status(409).json({ message: "Esta talla está en uso por variantes de productos" });
    return res.status(500).json({ message: "Error al eliminar talla" });
  }
};


// ════════════════════════════════════════════════════════════
//  PRODUCTOS (V2)
// ════════════════════════════════════════════════════════════

export const getProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             c.nombre AS categoria_nombre,
             m.nombre AS marca_nombre,
             d.nombre AS departamento_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN marcas m ON m.id = p.marca_id
      LEFT JOIN departamentos d ON d.id = p.departamento_id
      ORDER BY p.nombre ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("getProductos:", error);
    return res.status(500).json({ message: "Error al obtener productos" });
  }
};

// 🔥 MAGIA TRANSACCIONAL: Crea el producto padre y las variantes en un solo movimiento
export const createProductoCompleto = async (req, res) => {
  const { nombre, descripcion, precio_base, categoria_id, marca_id, departamento_id, activo, matriz } = req.body;

  if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });
  if (!precio_base || Number(precio_base) <= 0) return res.status(400).json({ message: "Precio base inválido" });
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Crear Producto Padre
    const productQuery = `
      INSERT INTO productos (nombre, descripcion, precio_base, categoria_id, marca_id, departamento_id, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nombre;
    `;
    const productRes = await client.query(productQuery, [
      nombre.trim(), descripcion || null, precio_base, categoria_id || null, marca_id || null, departamento_id || null, activo
    ]);
    
    const productoId = productRes.rows[0].id;
    const productoNombre = productRes.rows[0].nombre;

    // 2. Filtrar matriz para crear las Variantes de Inventario
    const combinacionesActivadas = Object.entries(matriz).filter(([key, value]) => value === true);

    if (combinacionesActivadas.length === 0) {
        throw new Error("Debes seleccionar al menos una combinación de talla y color activa en la matriz.");
    }

    const varianteQuery = `
      INSERT INTO variantes_producto (producto_id, talla_id, color_id, precio, stock, sku, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;

    for (const [key, _] of combinacionesActivadas) {
      const [colorId, tallaId] = key.split('-').map(Number);
      
      const precioHijo = precio_base; 
      const stockInicial = 0; 
      const activoHijo = true;
      const skuAutogenerado = `P${productoId}-C${colorId}-T${tallaId}`;

      await client.query(varianteQuery, [
          productoId, tallaId, colorId, precioHijo, stockInicial, skuAutogenerado, activoHijo
      ]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: "Producto y variantes de inventario creados correctamente." });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error en createProductoCompleto:", error);
    
    if (error.code === '23505') {
        return res.status(409).json({ message: "Error de duplicidad al crear variantes. Revisa la matriz." });
    }
    return res.status(500).json({ message: error.message || "Error interno al crear el producto completo." });
  } finally {
    client.release();
  }
};

export const createProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio_base, categoria_id, marca_id, departamento_id, activo = true } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });
    if (!precio_base || Number(precio_base) <= 0) return res.status(400).json({ message: "Precio base debe ser > 0" });

    const result = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio_base, categoria_id, marca_id, departamento_id, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre.trim(), descripcion || null, precio_base, categoria_id || null, marca_id || null, departamento_id || null, activo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createProducto:", error);
    return res.status(500).json({ message: "Error al crear producto" });
  }
};

export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio_base, categoria_id, marca_id, departamento_id, activo } = req.body;

    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1, descripcion = $2, precio_base = $3,
           categoria_id = $4, marca_id = $5, departamento_id = $6, activo = $7
       WHERE id = $8 RETURNING *`,
      [nombre.trim(), descripcion || null, precio_base, categoria_id || null, marca_id || null, departamento_id || null, activo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Producto no encontrado" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("updateProducto:", error);
    return res.status(500).json({ message: "Error al actualizar producto" });
  }
};

export const deleteProducto = async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM productos WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Producto no encontrado" });
    return res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar producto" });
  }
};


// ════════════════════════════════════════════════════════════
//  INVENTARIO (V2)
// ════════════════════════════════════════════════════════════

export const getInventario = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vp.*, 
             p.nombre AS producto_nombre, 
             p.precio_base,
             t.valor AS talla,
             c.nombre AS color
      FROM variantes_producto vp
      JOIN productos p ON p.id = vp.producto_id
      JOIN tallas t ON t.id = vp.talla_id
      JOIN colores c ON c.id = vp.color_id
      ORDER BY p.nombre ASC, t.valor ASC, c.nombre ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("getInventario:", error);
    return res.status(500).json({ message: "Error al obtener inventario" });
  }
};

export const createVariante = async (req, res) => {
  try {
    const { producto_id, talla_id, color_id, sku, precio, stock = 0, stock_apartado = 0, activo = true } = req.body;

    if (!producto_id || !talla_id || !color_id) return res.status(400).json({ message: "Faltan datos clave (Producto, Talla o Color)" });

    const result = await pool.query(
      `INSERT INTO variantes_producto (producto_id, talla_id, color_id, sku, precio, stock, stock_apartado, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [producto_id, talla_id, color_id, sku || null, precio, stock, stock_apartado, activo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ message: "Esa combinación de talla y color (o SKU) ya existe para este producto." });
    console.error("createVariante:", error);
    return res.status(500).json({ message: "Error al crear variante" });
  }
};

export const updateVariante = async (req, res) => {
  try {
    const { id } = req.params;
    const { talla_id, color_id, sku, precio, stock, stock_apartado, activo } = req.body;

    const result = await pool.query(
      `UPDATE variantes_producto
       SET talla_id = $1, color_id = $2, sku = $3, precio = $4,
           stock = $5, stock_apartado = $6, activo = $7
       WHERE id = $8 RETURNING *`,
      [talla_id, color_id, sku || null, precio, stock, stock_apartado || 0, activo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Variante no encontrada" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("updateVariante:", error);
    return res.status(500).json({ message: "Error al actualizar variante" });
  }
};

export const deleteVariante = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM variantes_producto WHERE id = $1 RETURNING id", [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ message: "Variante no encontrada" });
    return res.json({ message: "Variante eliminada correctamente" });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ message: "No se puede eliminar la variante porque ya tiene historial en ventas, carritos o apartados." });
    }
    console.error("deleteVariante:", error);
    return res.status(500).json({ message: "Error al eliminar variante" });
  }
};
// ════════════════════════════════════════════════════════════
//  CLIENTES
// ════════════════════════════════════════════════════════════

export const getClientes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes ORDER BY nombre ASC");
    return res.json(result.rows);
  } catch (error) {
    console.error("getClientes:", error);
    return res.status(500).json({ message: "Error al obtener clientes" });
  }
};

export const createCliente = async (req, res) => {
  try {
    const { nombre, telefono, email, rfc, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });

    const result = await pool.query(
      `INSERT INTO clientes (nombre, telefono, email, rfc, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre.trim(), telefono || null, email || null, rfc || null, notas || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createCliente:", error);
    return res.status(500).json({ message: "Error al crear cliente" });
  }
};

export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, email, rfc, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });

    const result = await pool.query(
      `UPDATE clientes
       SET nombre = $1, telefono = $2, email = $3, rfc = $4, notas = $5
       WHERE id = $6 RETURNING *`,
      [nombre.trim(), telefono || null, email || null, rfc || null, notas || null, id]
    );
    return result.rows.length ? res.json(result.rows[0]) : res.status(404).json({ message: "No encontrado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

export const deleteCliente = async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM clientes WHERE id = $1 RETURNING id", [req.params.id]);
    return result.rows.length ? res.json({ message: "Eliminado" }) : res.status(404).json({ message: "No encontrado" });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar cliente" });
  }
};

// ════════════════════════════════════════════════════════════
//  CRUD DINÁMICO PARA CATÁLOGOS BASE (Marcas, Departamentos, Colores)
// ════════════════════════════════════════════════════════════

export const createCatalogoItem = async (req, res) => {
  const tabla = req.params.tabla;
  const permitidas = ['marcas', 'departamentos', 'colores'];
  
  if (!permitidas.includes(tabla)) return res.status(400).json({ message: "Catálogo no válido" });

  try {
    const { nombre, activo = true, codigo_hex } = req.body;
    
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });

    let rows;
    
    if (tabla === 'colores') {
      const result = await pool.query(
        `INSERT INTO colores (nombre, codigo_hex, activo) VALUES ($1, $2, $3) RETURNING *`,
        [nombre.trim(), codigo_hex || '#000000', activo]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `INSERT INTO ${tabla} (nombre, activo) VALUES ($1, $2) RETURNING *`,
        [nombre.trim(), activo]
      );
      rows = result.rows;
    }

    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: "Este registro ya existe" });
    console.error(`Error en createCatalogoItem (${tabla}):`, error);
    return res.status(500).json({ message: `Error al guardar en ${tabla}` });
  }
};

export const deleteCatalogoItem = async (req, res) => {
  const tabla = req.params.tabla;
  const id = req.params.id;
  const permitidas = ['marcas', 'departamentos', 'colores'];
  
  if (!permitidas.includes(tabla)) return res.status(400).json({ message: "Catálogo no válido" });

  try {
    const { rows } = await pool.query(`DELETE FROM ${tabla} WHERE id = $1 RETURNING id`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Registro no encontrado" });
    return res.json({ message: "Eliminado correctamente" });
  } catch (error) {
    if (error.code === '23503') return res.status(409).json({ message: "No se puede eliminar porque hay productos usándolo" });
    return res.status(500).json({ message: "Error al eliminar" });
  }
};

// Desactivamos temporalmente la importación hasta que el front esté listo para V2
export const importarProductos = async (req, res) => {
    return res.status(400).json({message: "La importación masiva está desactivada temporalmente por actualización de esquemas."});
}