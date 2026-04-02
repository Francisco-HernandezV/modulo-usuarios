import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// ... (Tu función verifyToken se queda exactamente igual) ...
export const verifyToken = async (req, res, next) => {
  // ... tu código actual de verifyToken ...
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  
  if (!token) return res.status(401).json({ message: "Acceso denegado. No hay token." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secreto_super_seguro");
    const result = await pool.query("SELECT token_version FROM usuarios WHERE id = $1", [decoded.id]);
    
    if (result.rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado." });
    
    const user = result.rows[0];
    if (decoded.token_version !== user.token_version) {
        return res.status(401).json({ message: "Sesión revocada. Inicia sesión nuevamente." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error validando token JWT:", error);
    return res.status(403).json({ message: "Token inválido o expirado." });
  }
};

export const checkRole = (rolesPermitidos) => {
  return async (req, res, next) => {
    try {b
      const query = `
        SELECT r.nombre 
        FROM usuario_roles ur
        JOIN roles r ON ur.rol_id = r.id
        WHERE ur.usuario_id = $1
      `;
      const { rows } = await pool.query(query, [req.user.id]);

      if (rows.length === 0) {
        return res.status(403).json({ message: "Acceso denegado: No tienes un rol asignado en el sistema." });
      }

      const userRole = rows[0].nombre;

      if (!rolesPermitidos.includes(userRole)) {
        return res.status(403).json({ 
          message: `Acceso denegado. Requiere privilegios de: ${rolesPermitidos.join(" o ")}` 
        });
      }
      req.user.rol = userRole;
      next();

    } catch (error) {
      console.error("Error en checkRole:", error);
      return res.status(500).json({ message: "Error verificando permisos de acceso" });
    }
  };
};