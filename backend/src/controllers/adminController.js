import pool from "../config/db.js";

// ════════════════════════════════════════════════════════════
//  CATEGORÍAS
// ════════════════════════════════════════════════════════════

export const getCategorias = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categorias ORDER BY nombre ASC"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("getCategorias:", error);
    return res.status(500).json({ message: "Error al obtener categorías" });
  }
};

export const createCategoria = async (req, res) => {
  try {
    const { nombre, activo = true } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      "INSERT INTO categorias (nombre, activo) VALUES ($1, $2) RETURNING *",
      [nombre.trim(), activo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Ya existe una categoría con ese nombre" });
    }
    console.error("createCategoria:", error);
    return res.status(500).json({ message: "Error al crear categoría" });
  }
};

export const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      "UPDATE categorias SET nombre = $1, activo = $2 WHERE id = $3 RETURNING *",
      [nombre.trim(), activo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Ya existe una categoría con ese nombre" });
    }
    console.error("updateCategoria:", error);
    return res.status(500).json({ message: "Error al actualizar categoría" });
  }
};

export const deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM categorias WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    return res.json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    // FK violation: productos vinculados
    if (error.code === "23503") {
      return res.status(409).json({
        message: "No se puede eliminar: hay productos vinculados a esta categoría"
      });
    }
    console.error("deleteCategoria:", error);
    return res.status(500).json({ message: "Error al eliminar categoría" });
  }
};

// ════════════════════════════════════════════════════════════
//  PRODUCTOS
// ════════════════════════════════════════════════════════════

export const getProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.nombre ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("getProductos:", error);
    return res.status(500).json({ message: "Error al obtener productos" });
  }
};

export const createProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio_base, costo, categoria_id, activo = true } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }
    if (!precio_base || Number.isNaN(Number(precio_base)) || Number(precio_base) <= 0) {
      return res.status(400).json({ message: "El precio base debe ser mayor a 0" });
    }
    if (!categoria_id) {
      return res.status(400).json({ message: "La categoría es obligatoria" });
    }

    const result = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio_base, costo, categoria_id, activo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre.trim(), descripcion || null, precio_base, costo || null, categoria_id, activo]
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
    const { nombre, descripcion, precio_base, costo, categoria_id, activo } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1, descripcion = $2, precio_base = $3, costo = $4,
           categoria_id = $5, activo = $6
       WHERE id = $7 RETURNING *`,
      [nombre.trim(), descripcion || null, precio_base, costo || null, categoria_id, activo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("updateProducto:", error);
    return res.status(500).json({ message: "Error al actualizar producto" });
  }
};

export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM productos WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    return res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        message: "No se puede eliminar: el producto tiene variantes de inventario asociadas"
      });
    }
    console.error("deleteProducto:", error);
    return res.status(500).json({ message: "Error al eliminar producto" });
  }
};

// ════════════════════════════════════════════════════════════
//  CLIENTES
// ════════════════════════════════════════════════════════════

export const getClientes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM clientes ORDER BY nombre ASC"
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("getClientes:", error);
    return res.status(500).json({ message: "Error al obtener clientes" });
  }
};

export const createCliente = async (req, res) => {
  try {
    const { nombre, telefono, email, rfc, notas } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

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

    if (!nombre?.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const result = await pool.query(
      `UPDATE clientes
       SET nombre = $1, telefono = $2, email = $3, rfc = $4, notas = $5
       WHERE id = $6 RETURNING *`,
      [nombre.trim(), telefono || null, email || null, rfc || null, notas || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("updateCliente:", error);
    return res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM clientes WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    return res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error("deleteCliente:", error);
    return res.status(500).json({ message: "Error al eliminar cliente" });
  }
};

// ════════════════════════════════════════════════════════════
//  INVENTARIO (variantes_producto)
// ════════════════════════════════════════════════════════════

export const getInventario = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vp.*, p.nombre AS producto_nombre, p.precio_base
      FROM variantes_producto vp
      JOIN productos p ON p.id = vp.producto_id
      ORDER BY p.nombre ASC, vp.talla ASC, vp.color ASC
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error("getInventario:", error);
    return res.status(500).json({ message: "Error al obtener inventario" });
  }
};

export const createVariante = async (req, res) => {
  try {
    const { producto_id, talla, color, sku, precio, stock = 0, stock_apartado = 0, activo = true } = req.body;

    if (!producto_id) return res.status(400).json({ message: "El producto es obligatorio" });
    if (!talla?.trim()) return res.status(400).json({ message: "La talla es obligatoria" });
    if (!color?.trim()) return res.status(400).json({ message: "El color es obligatorio" });
    if (!precio || Number(precio) <= 0) return res.status(400).json({ message: "El precio debe ser mayor a 0" });

    const result = await pool.query(
      `INSERT INTO variantes_producto (producto_id, talla, color, sku, precio, stock, stock_apartado, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [producto_id, talla.trim(), color.trim(), sku || null, precio, stock, stock_apartado, activo]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Ya existe una variante con ese SKU" });
    }
    console.error("createVariante:", error);
    return res.status(500).json({ message: "Error al crear variante" });
  }
};

export const updateVariante = async (req, res) => {
  try {
    const { id } = req.params;
    const { talla, color, sku, precio, stock, stock_apartado, activo } = req.body;

    const result = await pool.query(
      `UPDATE variantes_producto
       SET talla = $1, color = $2, sku = $3, precio = $4,
           stock = $5, stock_apartado = $6, activo = $7
       WHERE id = $8 RETURNING *`,
      [talla, color, sku || null, precio, stock, stock_apartado || 0, activo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Variante no encontrada" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error("updateVariante:", error);
    return res.status(500).json({ message: "Error al actualizar variante" });
  }
};