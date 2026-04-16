import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import * as xlsx from "xlsx";

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
    // 🔥 Agregamos validación para código 23001
    if (error.code === "23503" || error.code === "23001") {
      return res.status(409).json({ message: "No se puede eliminar: Hay productos vinculados a esta categoría." });
    }
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
    if (error.code === "23503" || error.code === "23001") {
      return res.status(409).json({ message: "Esta talla está en uso por variantes de productos." });
    }
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
    if (error.code === "23503" || error.code === "23001") {
      return res.status(409).json({ message: "No se puede eliminar el producto porque tiene variantes en el inventario o historial de ventas." });
    }
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
    if (error.code === '23503' || error.code === '23001') {
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

// ════════════════════════════════════════════════════════════
//  CLIENTES (VALIDACIÓN PRIVADA Y BÚSQUEDA INVERSA)
// ════════════════════════════════════════════════════════════

export const createCliente = async (req, res) => {
  try {
    const { nombre, telefono, email, rfc, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: "El nombre es obligatorio" });

    // 1. 🛡️ VALIDACIÓN PREVIA (Con privacidad estricta)
    let queryVal = "";
    let paramsVal = [];
    
    if (telefono && email) {
        queryVal = "SELECT id FROM ventas.clientes WHERE telefono = $1 OR email = $2 LIMIT 1";
        paramsVal = [telefono.trim(), email.trim()];
    } else if (telefono) {
        queryVal = "SELECT id FROM ventas.clientes WHERE telefono = $1 LIMIT 1";
        paramsVal = [telefono.trim()];
    } else if (email) {
        queryVal = "SELECT id FROM ventas.clientes WHERE email = $1 LIMIT 1";
        paramsVal = [email.trim()];
    }

    if (queryVal) {
        const existeCliente = await pool.query(queryVal, paramsVal);
        if (existeCliente.rows.length > 0) {
            // ⚠️ CUMPLIENDO LA REGLA: Mensaje genérico, sin revelar datos del cliente
            return res.status(400).json({ 
                message: "No se puede registrar. Este cliente ya existe en el sistema." 
            });
        }
    }

    // 2. 🌟 MAGIA OMNICANAL INVERSA (De Tienda a Web)
    let usuarioId = null;

    if (telefono) {
      const userRes = await pool.query(
        "SELECT id FROM seguridad.usuarios WHERE telefono_contacto = $1 LIMIT 1",
        [telefono.trim()]
      );
      if (userRes.rows.length > 0) {
        usuarioId = userRes.rows[0].id; // Se encontró su cuenta web por teléfono
      }
    }

    if (!usuarioId && email?.trim()) {
      const userRes = await pool.query(
        "SELECT id FROM seguridad.usuarios WHERE email = $1 LIMIT 1",
        [email.trim()]
      );
      if (userRes.rows.length > 0) {
        usuarioId = userRes.rows[0].id; // Se encontró su cuenta web por correo
      }
    }

    // 3. INSERCIÓN FINAL
    // Si usuarioId es null, es un cliente exclusivo de tienda.
    // Si usuarioId tiene un valor, se relacionan los registros de tienda y web.
    const result = await pool.query(
      `INSERT INTO ventas.clientes (nombre, telefono, email, rfc, notas, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        nombre.trim(), 
        telefono || null, 
        email?.trim() || null, 
        rfc || null, 
        notas || null, 
        usuarioId
      ]
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
    if (error.code === '23503' || error.code === '23001') {
      return res.status(409).json({ message: "No se puede eliminar porque hay productos o variantes usándolo en el sistema." });
    }
    return res.status(500).json({ message: "Error al eliminar" });
  }
};


// ════════════════════════════════════════════════════════════
//  GESTIÓN DE EMPLEADOS
// ════════════════════════════════════════════════════════════

export const getRolesActivos = async (req, res) => {
  try {
    // Apuntamos al esquema seguridad
    const { rows } = await pool.query(
      "SELECT id, nombre FROM seguridad.roles WHERE nombre != 'rol_cliente' ORDER BY nombre ASC"
    );
    return res.json(rows);
  } catch (error) {
    console.error("getRolesActivos:", error);
    return res.status(500).json({ message: "Error al obtener roles" });
  }
};

export const createEmpleado = async (req, res) => {
  const { nombre, email, telefono, departamentos, rol_id, password_temporal, activo = true } = req.body;

  if (!nombre?.trim() || !email?.trim() || !rol_id || !password_temporal) {
    return res.status(400).json({ message: "Nombre, email, rol y contraseña temporal son obligatorios" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Encriptar contraseña temporal
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password_temporal, salt);

    // 2. Insertar en la tabla usuarios (Esquema seguridad)
    const userQuery = `
      INSERT INTO seguridad.usuarios (nombre, email, password_hash, telefono_contacto, cuenta_activa, email_verificado, requiere_cambio_password)
      VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
      RETURNING id;
    `;
    const userRes = await client.query(userQuery, [
      nombre.trim(),
      email.trim(),
      hashedPassword,
      telefono || null,
      activo
    ]);
    
    const nuevoUsuarioId = userRes.rows[0].id;

    // 3. Asignar el rol al empleado (Esquema seguridad)
    const rolQuery = `INSERT INTO seguridad.usuario_roles (usuario_id, rol_id) VALUES ($1, $2)`;
    await client.query(rolQuery, [nuevoUsuarioId, rol_id]);

    // 4. Asignar departamentos (Tabla pivote en Esquema seguridad)
    if (Array.isArray(departamentos) && departamentos.length > 0) {
      const deptoQuery = `INSERT INTO seguridad.usuario_departamentos (usuario_id, departamento_id) VALUES ($1, $2)`;
      for (const depto_id of departamentos) {
        await client.query(deptoQuery, [nuevoUsuarioId, depto_id]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: "Empleado registrado exitosamente" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error en createEmpleado:", error);
    
    if (error.code === '23505') {
      return res.status(409).json({ message: "El correo electrónico ya está registrado en el sistema." });
    }
    return res.status(500).json({ message: "Error interno al registrar el empleado." });
  } finally {
    client.release();
  }
};

export const getEmpleados = async (req, res) => {
  try {
    // 🔥 MEJORA: Ahora traemos el rol_id y un arreglo JSON con los departamentos asignados
    // Esto es vital para poder rellenar el formulario al momento de Editar.
    const query = `
      SELECT u.id, u.nombre, u.email, u.telefono_contacto, u.cuenta_activa, 
             r.id AS rol_id, r.nombre AS rol,
             COALESCE(
               (SELECT json_agg(ud.departamento_id) 
                FROM seguridad.usuario_departamentos ud 
                WHERE ud.usuario_id = u.id), '[]'::json
             ) AS departamentos
      FROM seguridad.usuarios u
      JOIN seguridad.usuario_roles ur ON u.id = ur.usuario_id
      JOIN seguridad.roles r ON ur.rol_id = r.id
      WHERE r.nombre != 'rol_cliente'
      ORDER BY u.id DESC
    `;
    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (error) {
    console.error("Error getEmpleados:", error);
    return res.status(500).json({ message: "Error al obtener la lista de empleados" });
  }
};

export const updateEmpleado = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, departamentos, rol_id, activo } = req.body;

  if (!nombre?.trim() || !email?.trim() || !rol_id) {
    return res.status(400).json({ message: "Nombre, email y rol son obligatorios" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Actualizar datos básicos
    await client.query(
      `UPDATE seguridad.usuarios 
       SET nombre = $1, email = $2, telefono_contacto = $3, cuenta_activa = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5`,
      [nombre.trim(), email.trim(), telefono || null, activo, id]
    );

    // 2. Actualizar el rol
    await client.query(`UPDATE seguridad.usuario_roles SET rol_id = $1 WHERE usuario_id = $2`, [rol_id, id]);

    // 3. Recrear departamentos (Borramos los viejos y metemos los nuevos)
    await client.query(`DELETE FROM seguridad.usuario_departamentos WHERE usuario_id = $1`, [id]);
    
    if (Array.isArray(departamentos) && departamentos.length > 0) {
      const deptoQuery = `INSERT INTO seguridad.usuario_departamentos (usuario_id, departamento_id) VALUES ($1, $2)`;
      for (const depto_id of departamentos) {
        await client.query(deptoQuery, [id, depto_id]);
      }
    }

    await client.query('COMMIT');
    return res.json({ message: "Empleado actualizado exitosamente" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error en updateEmpleado:", error);
    if (error.code === '23505') return res.status(409).json({ message: "El correo ya está en uso." });
    return res.status(500).json({ message: "Error al actualizar empleado." });
  } finally {
    client.release();
  }
};

export const deleteEmpleado = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Eliminamos registros pivote por seguridad antes de borrar al usuario
    await client.query(`DELETE FROM seguridad.usuario_departamentos WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM seguridad.usuario_roles WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM seguridad.tokens WHERE usuario_id = $1`, [id]);
    
    const { rows } = await client.query(`DELETE FROM seguridad.usuarios WHERE id = $1 RETURNING id`, [id]);
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    await client.query('COMMIT');
    return res.json({ message: "Empleado eliminado correctamente" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error en deleteEmpleado:", error);
    // Si da error 23503, significa que el empleado ya procesó ventas y no se puede borrar
    if (error.code === '23503') return res.status(409).json({ message: "No se puede eliminar porque este empleado ya tiene historial en ventas o movimientos." });
    return res.status(500).json({ message: "Error al eliminar empleado." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  IMPORTACIÓN MULTI-HOJA (CATÁLOGOS BASE)
// ════════════════════════════════════════════════════════════
export const importarCatalogos = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No se detectó ningún archivo Excel." });
  
  const client = await pool.connect();
  let resumen = { categorias: 0, marcas: 0, departamentos: 0, colores: 0, tallas: 0 };

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    await client.query('BEGIN');

    // 1. Categorías
    if (workbook.Sheets["Categorias"]) {
      const data = xlsx.utils.sheet_to_json(workbook.Sheets["Categorias"]);
      for (const row of data) {
        if (row.nombre) {
          const check = await client.query("SELECT id FROM categorias WHERE nombre = $1", [row.nombre.trim()]);
          if (check.rows.length === 0) {
            await client.query("INSERT INTO categorias (nombre) VALUES ($1)", [row.nombre.trim()]);
            resumen.categorias++;
          }
        }
      }
    }

    // 2. Marcas
    if (workbook.Sheets["Marcas"]) {
      const data = xlsx.utils.sheet_to_json(workbook.Sheets["Marcas"]);
      for (const row of data) {
        if (row.nombre) {
          const check = await client.query("SELECT id FROM marcas WHERE nombre = $1", [row.nombre.trim()]);
          if (check.rows.length === 0) {
            await client.query("INSERT INTO marcas (nombre) VALUES ($1)", [row.nombre.trim()]);
            resumen.marcas++;
          }
        }
      }
    }

    // 3. Departamentos
    if (workbook.Sheets["Departamentos"]) {
      const data = xlsx.utils.sheet_to_json(workbook.Sheets["Departamentos"]);
      for (const row of data) {
        if (row.nombre) {
          const check = await client.query("SELECT id FROM departamentos WHERE nombre = $1", [row.nombre.trim()]);
          if (check.rows.length === 0) {
            await client.query("INSERT INTO departamentos (nombre) VALUES ($1)", [row.nombre.trim()]);
            resumen.departamentos++;
          }
        }
      }
    }

    // 4. Colores (Basado en tu regla: validar por código Hexadecimal)
    if (workbook.Sheets["Colores"]) {
      const data = xlsx.utils.sheet_to_json(workbook.Sheets["Colores"]);
      for (const row of data) {
        if (row.nombre && row.codigo_hex) {
          const check = await client.query("SELECT id FROM colores WHERE codigo_hex = $1", [row.codigo_hex.trim()]);
          if (check.rows.length === 0) {
            await client.query("INSERT INTO colores (nombre, codigo_hex) VALUES ($1, $2)", [row.nombre.trim(), row.codigo_hex.trim()]);
            resumen.colores++;
          }
        }
      }
    }

    // 5. Tallas (Lógica Inteligente)
    if (workbook.Sheets["Tallas"]) {
      const data = xlsx.utils.sheet_to_json(workbook.Sheets["Tallas"]);
      for (const row of data) {
        if (row.tipo && row.valor) {
          // A. Buscar o crear la clasificación (tipo_talla)
          let tipoId;
          const tipoRes = await client.query("SELECT id FROM tipos_talla WHERE nombre = $1", [row.tipo.trim()]);
          if (tipoRes.rows.length > 0) {
            tipoId = tipoRes.rows[0].id;
          } else {
            const insertTipo = await client.query("INSERT INTO tipos_talla (nombre) VALUES ($1) RETURNING id", [row.tipo.trim()]);
            tipoId = insertTipo.rows[0].id;
          }
          
          // B. Insertar la talla evitando duplicados
          const tallaRes = await client.query("SELECT id FROM tallas WHERE tipo_talla_id = $1 AND valor = $2", [tipoId, row.valor.toString().trim()]);
          if (tallaRes.rows.length === 0) {
            await client.query("INSERT INTO tallas (tipo_talla_id, valor) VALUES ($1, $2)", [tipoId, row.valor.toString().trim()]);
            resumen.tallas++;
          }
        }
      }
    }

    await client.query('COMMIT');
    return res.json({ 
      message: `Importación exitosa. Nuevos registros: Categorías (${resumen.categorias}), Marcas (${resumen.marcas}), Deptos (${resumen.departamentos}), Colores (${resumen.colores}), Tallas (${resumen.tallas}).` 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error importarCatalogos:", error);
    return res.status(500).json({ message: "Error procesando el archivo Excel. Verifica el formato de las hojas." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  EXPORTACIÓN DEL INVENTARIO FÍSICO
// ════════════════════════════════════════════════════════════
export const exportarInventario = async (req, res) => {
  try {
    // Unimos todas las tablas para dar un reporte completo
    const { rows } = await pool.query(`
      SELECT 
        p.nombre AS "Producto",
        p.descripcion AS "Descripcion",
        vp.sku AS "SKU",
        c.nombre AS "Categoria",
        m.nombre AS "Marca",
        d.nombre AS "Departamento",
        col.nombre AS "Color",
        t.valor AS "Talla",
        vp.precio AS "Precio",
        vp.stock AS "Stock Total",
        (vp.stock - COALESCE(vp.stock_apartado, 0)) AS "Stock Disponible"
      FROM inventario.variantes_producto vp
      JOIN inventario.productos p ON vp.producto_id = p.id
      LEFT JOIN catalogo.categorias c ON p.categoria_id = c.id
      LEFT JOIN catalogo.marcas m ON p.marca_id = m.id
      LEFT JOIN catalogo.departamentos d ON p.departamento_id = d.id
      JOIN catalogo.colores col ON vp.color_id = col.id
      JOIN catalogo.tallas t ON vp.talla_id = t.id
      ORDER BY p.nombre ASC, col.nombre ASC, t.valor ASC
    `);
    
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Inventario General");
    
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=Inventario_DanElement.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    console.error("Error exportarInventario:", error);
    return res.status(500).json({ message: "Error al exportar inventario." });
  }
};

// adminController.js — Agregar al final

export const getModeloPredictivo = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        vp.id AS variante_id,
        p.nombre AS producto,
        t.valor AS talla,
        c.nombre AS color,
        vp.stock AS stock_actual,
        COALESCE(SUM(dv.cantidad), 0) AS vendido_30_dias,
        MIN(v.creado_en) AS primera_venta
      FROM inventario.variantes_producto vp
      JOIN inventario.productos p ON p.id = vp.producto_id
      JOIN catalogo.tallas t ON t.id = vp.talla_id
      JOIN catalogo.colores c ON c.id = vp.color_id
      LEFT JOIN ventas.detalle_venta dv ON dv.variante_id = vp.id
      LEFT JOIN ventas.ventas v ON v.id = dv.venta_id
        AND v.creado_en >= NOW() - INTERVAL '30 days'
      WHERE p.activo = TRUE
      GROUP BY vp.id, p.nombre, t.valor, c.nombre, vp.stock
      ORDER BY vendido_30_dias DESC
    `);

    const T = 30; // Periodo de análisis

    const resultado = rows.map(r => {
      const stockActual = Number(r.stock_actual);
      const vendido = Number(r.vendido_30_dias);
      const stockInicial = stockActual + vendido; // I₀ estimado

      let k = null;
      let diasAgotamiento = null;
      let estado = "sin_movimiento";

      if (stockInicial > 0 && stockActual > 0 && vendido > 0) {
        // k = -(1/T) * ln(I(T)/I₀)
        k = -(1 / T) * Math.log(stockActual / stockInicial);
        k = Math.round(k * 10000) / 10000;

        // Día de agotamiento: t = -ln(1/I₀) / k
        if (k > 0) {
          diasAgotamiento = Math.ceil(Math.log(stockInicial) / k);
        }

        estado = stockActual === 0 ? "agotado"
               : diasAgotamiento <= 7  ? "critico"
               : diasAgotamiento <= 15 ? "alerta"
               : "normal";

      } else if (stockActual === 0) {
        estado = "agotado";
      }

      return {
        variante_id: r.variante_id,
        producto: r.producto,
        talla: r.talla,
        color: r.color,
        stock_actual: stockActual,
        vendido_30_dias: vendido,
        stock_inicial_estimado: stockInicial,
        k,
        dias_agotamiento: diasAgotamiento,
        estado
      };
    });

    return res.json(resultado);
  } catch (error) {
    console.error("getModeloPredictivo:", error);
    return res.status(500).json({ message: "Error al calcular modelo predictivo" });
  }
};