import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * Tras la unificación de usuarios/clientes en seguridad.personas, el rol vive
 * directamente en personas.rol_id (ya no existe usuario_roles).
 *
 * Modelo de permisos:
 *   - rol_admin (1) es superusuario: puede todo.
 *   - rol_vendedor (2) y rol_gestor_inventario (3) son especializaciones
 *     HERMANAS, no una cadena. Un vendedor NO gestiona inventario y un gestor
 *     no cobra en el POS: cada ruta declara explícitamente quién entra.
 *   - rol_cliente (4) solo lo que se le liste de forma explícita.
 */
export const ROL_IDS = {
  rol_admin: 1,
  rol_vendedor: 2,
  rol_gestor_inventario: 3,
  rol_cliente: 4,
};

export const ROL_NOMBRES = {
  1: "rol_admin",
  2: "rol_vendedor",
  3: "rol_gestor_inventario",
  4: "rol_cliente",
};

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Acceso denegado. No hay token." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secreto_super_seguro");

    // Traemos versión de token, estado de la cuenta y rol en una sola consulta
    const result = await pool.query(
      `SELECT p.token_version, p.cuenta_activa, p.rol_id, r.nombre AS rol
         FROM seguridad.personas p
         LEFT JOIN seguridad.roles r ON r.id = p.rol_id
        WHERE p.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado." });

    const user = result.rows[0];

    if (user.cuenta_activa === false) {
      return res.status(401).json({ message: "La cuenta está desactivada." });
    }

    if (decoded.token_version !== user.token_version) {
      return res.status(401).json({ message: "Sesión revocada. Inicia sesión nuevamente." });
    }

    // El rol siempre queda disponible aguas abajo, con o sin checkRole
    req.user = {
      ...decoded,
      rol: user.rol || ROL_NOMBRES[user.rol_id],
      rol_id: user.rol_id,
    };
    next();
  } catch (error) {
    console.error("Error validando token JWT:", error);
    return res.status(403).json({ message: "Token inválido o expirado." });
  }
};

// 🛡️ Guardia de seguridad por roles (RBAC jerárquico)
export const checkRole = (rolesPermitidos) => {
  return async (req, res, next) => {
    try {
      let rolId = req.user?.rol_id;
      let rolNombre = req.user?.rol;

      // Respaldo por si checkRole se usara sin verifyToken previo
      if (!rolId) {
        const { rows } = await pool.query(
          `SELECT p.rol_id, r.nombre AS rol
             FROM seguridad.personas p
             LEFT JOIN seguridad.roles r ON r.id = p.rol_id
            WHERE p.id = $1`,
          [req.user.id]
        );
        if (rows.length === 0) {
          return res.status(403).json({ message: "Acceso denegado: No tienes un rol asignado en el sistema." });
        }
        rolId = rows[0].rol_id;
        rolNombre = rows[0].rol || ROL_NOMBRES[rolId];
      }

      // El admin es superusuario; los demás roles deben estar listados
      // explícitamente (un vendedor no entra a rutas de inventario).
      const esAdmin = rolId === ROL_IDS.rol_admin;
      const estaListado = rolesPermitidos.includes(rolNombre)
        || rolesPermitidos.some((nombre) => ROL_IDS[nombre] === rolId);

      if (!esAdmin && !estaListado) {
        return res.status(403).json({
          message: `Acceso denegado. Requiere privilegios de: ${rolesPermitidos.join(" o ")}`
        });
      }

      req.user.rol = rolNombre;
      req.user.rol_id = rolId;
      next();

    } catch (error) {
      console.error("Error en checkRole:", error);
      return res.status(500).json({ message: "Error verificando permisos de acceso" });
    }
  };
};
