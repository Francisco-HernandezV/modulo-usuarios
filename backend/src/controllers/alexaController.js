import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { hashPin } from "../services/tokenService.js";

const ALEXA_TOKEN_EXP_HOURS = 8;

// Query base del inventario (compartido por el endpoint autenticado y el público)
const QUERY_INVENTARIO = `
  SELECT vp.id, vp.sku, vp.stock, vp.stock_apartado, vp.precio, vp.activo,
         p.nombre AS producto_nombre, p.activo AS producto_activo,
         c.nombre AS categoria_nombre,
         m.nombre AS marca_nombre,
         t.valor AS talla,
         col.nombre AS color,
         p.id AS producto_id,
         -- Foto: primero la de la variante (si el color tiene la suya),
         -- si no, la portada del producto. NULL si aun no sube ninguna.
         COALESCE(
           (SELECT ip.url FROM inventario.imagenes_producto ip
             WHERE ip.variante_id = vp.id
             ORDER BY ip.principal DESC, ip.orden ASC, ip.id ASC LIMIT 1),
           (SELECT ip.url FROM inventario.imagenes_producto ip
             WHERE ip.producto_id = p.id
             ORDER BY ip.principal DESC, ip.orden ASC, ip.id ASC LIMIT 1)
         ) AS imagen
  FROM inventario.variantes_producto vp
  JOIN inventario.productos p ON p.id = vp.producto_id
  LEFT JOIN catalogo.categorias c ON c.id = p.categoria_id
  LEFT JOIN catalogo.marcas m ON m.id = p.marca_id
  JOIN catalogo.tallas t ON t.id = vp.talla_id
  JOIN catalogo.colores col ON col.id = vp.color_id
  WHERE vp.activo = TRUE AND p.activo = TRUE
  ORDER BY p.nombre ASC
`;

// ════════════════════════════════════════════════════════════
//  MIDDLEWARE: valida secret compartido de la skill
// ════════════════════════════════════════════════════════════
export const verifyAlexaSecret = (req, res, next) => {
  const secret = req.headers["x-alexa-secret"];
  if (secret !== process.env.ALEXA_SKILL_SECRET) {
    return res.status(403).json({ message: "Acceso denegado: secret inválido" });
  }
  next();
};

// ════════════════════════════════════════════════════════════
//  MIDDLEWARE: valida JWT emitido por /alexa/login
// ════════════════════════════════════════════════════════════
export const verifyAlexaToken = async (req, res, next) => {
  const secret = req.headers["x-alexa-secret"];
  if (secret !== process.env.ALEXA_SKILL_SECRET) {
    return res.status(403).json({ message: "Secret inválido" });
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token faltante" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.origen !== 'alexa') {
      return res.status(403).json({ message: "Token no válido para Alexa" });
    }

    // Ahora todos son personas reales: confiamos en el JWT
    req.user = { id: decoded.id, rol: decoded.rol, nombre: decoded.nombre };
    next();
  } catch (error) {
    console.error("Error verifyAlexaToken:", error.message);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

// ════════════════════════════════════════════════════════════
//  POST /api/alexa/login  → valida PIN por rol
// ════════════════════════════════════════════════════════════
export const loginAlexa = async (req, res) => {
  const { pin } = req.body;

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: "PIN debe ser 4 dígitos numéricos" });
  }

  try {
    const lookup = hashPin(pin);

    // Buscamos a la PERSONA dueña de ese PIN
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.cuenta_activa, r.nombre AS rol
       FROM seguridad.personas u
       LEFT JOIN seguridad.roles r ON r.id = u.rol_id
       WHERE u.pin_lookup = $1
       LIMIT 1`,
      [lookup]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "PIN incorrecto" });
    }

    const usuario = result.rows[0];

    if (!usuario.cuenta_activa) {
      return res.status(403).json({ message: "Cuenta inactiva. Actívala antes de usar Alexa." });
    }

    // Log opcional (si no existe la tabla, no rompe)
    try {
      await pool.query(
        `INSERT INTO auditoria.log_alexa (usuario_id, intent_name, exitoso, ip_origen)
         VALUES ($1, 'IniciarSesionIntent', TRUE, $2)`,
        [usuario.id, req.ip]
      );
    } catch (e) { /* tabla opcional */ }

    // JWT con la identidad REAL
    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol || 'rol_cliente', origen: 'alexa' },
      process.env.JWT_SECRET,
      { expiresIn: `${ALEXA_TOKEN_EXP_HOURS}h` }
    );

    return res.json({
      token,
      usuario: { nombre: usuario.nombre, rol: usuario.rol || 'rol_cliente' },
      expira_en_horas: ALEXA_TOKEN_EXP_HOURS
    });
  } catch (error) {
    console.error("Error loginAlexa:", error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ════════════════════════════════════════════════════════════
//  GET /api/alexa/inventario  → mismo query, con JWT
// ════════════════════════════════════════════════════════════
export const getInventarioAutenticado = async (req, res) => {
  try {
    const result = await pool.query(QUERY_INVENTARIO);
    return res.json(result.rows);
  } catch (error) {
    console.error("Error getInventarioAutenticado:", error);
    return res.status(500).json({ message: "Error al obtener inventario" });
  }
};

// ════════════════════════════════════════════════════════════
//  GET /api/alexa/catalogo  → catálogo PÚBLICO (modo invitado)
//  Solo requiere el secret de la skill, sin JWT. Es la misma
//  información que ya es visible en el catálogo web público.
// ════════════════════════════════════════════════════════════
export const getCatalogoPublico = async (req, res) => {
  try {
    const result = await pool.query(QUERY_INVENTARIO);
    return res.json(result.rows);
  } catch (error) {
    console.error("Error getCatalogoPublico:", error);
    return res.status(500).json({ message: "Error al obtener catálogo" });
  }
};

// ════════════════════════════════════════════════════════════
//  GET /api/alexa/health  → keep-alive para que Render no duerma
// ════════════════════════════════════════════════════════════
export const healthCheck = (req, res) => {
  return res.json({ ok: true, ts: Date.now() });
};

// ════════════════════════════════════════════════════════════
//  GET /api/alexa/perfil  → info del rol logueado
// ════════════════════════════════════════════════════════════
export const getPerfilAlexa = (req, res) => {
  return res.json({
    nombre: req.user.nombre,
    rol: req.user.rol
  });
};

// ════════════════════════════════════════════════════════════
//  GET /api/alexa/ultimos-ingresos  → variantes por fecha real de entrada
// ════════════════════════════════════════════════════════════
export const getUltimosIngresos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (vp.id)
             vp.id, vp.sku, vp.stock, vp.stock_apartado,
             p.nombre AS producto_nombre,
             m.nombre AS marca_nombre,
             t.valor AS talla,
             col.nombre AS color,
             p.id AS producto_id,
             -- Foto: primero la de la variante (si el color tiene la suya),
             -- si no, la portada del producto. NULL si aun no sube ninguna.
             COALESCE(
               (SELECT ip.url FROM inventario.imagenes_producto ip
                 WHERE ip.variante_id = vp.id
                 ORDER BY ip.principal DESC, ip.orden ASC, ip.id ASC LIMIT 1),
               (SELECT ip.url FROM inventario.imagenes_producto ip
                 WHERE ip.producto_id = p.id
                 ORDER BY ip.principal DESC, ip.orden ASC, ip.id ASC LIMIT 1)
             ) AS imagen,
             ei.fecha_entrada
      FROM inventario.detalle_entrada de
      JOIN inventario.entradas_inventario ei ON ei.id = de.entrada_id
      JOIN inventario.variantes_producto vp ON vp.id = de.variante_id
      JOIN inventario.productos p ON p.id = vp.producto_id
      LEFT JOIN catalogo.marcas m ON m.id = p.marca_id
      JOIN catalogo.tallas t ON t.id = vp.talla_id
      JOIN catalogo.colores col ON col.id = vp.color_id
      WHERE ei.estado = 'activa' AND vp.activo = TRUE AND p.activo = TRUE
      ORDER BY vp.id, ei.fecha_entrada DESC
    `);

    // Reordenar por fecha (el DISTINCT ON obliga a ordenar por vp.id primero)
    const ordenados = result.rows
      .sort((a, b) => new Date(b.fecha_entrada) - new Date(a.fecha_entrada))
      .slice(0, 10);

    return res.json(ordenados);
  } catch (error) {
    console.error("Error getUltimosIngresos:", error);
    return res.status(500).json({ message: "Error al obtener últimos ingresos" });
  }
};