import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return res.status(401).json({ message: "Acceso denegado. No hay token." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secreto_super_seguro");
    
    // Postgres: $1 y result.rows
    const result = await pool.query("SELECT token_version FROM usuarios WHERE id = $1", [decoded.id]);
    
    if (result.rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado." });
    
    const user = result.rows[0];
    if (decoded.token_version !== user.token_version) {
        return res.status(401).json({ message: "Sesión revocada. Inicia sesión nuevamente." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido o expirado." });
  }
};