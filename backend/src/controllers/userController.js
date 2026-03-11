import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { sendVerificationEmail, sendResetEmail } from "../services/mailService.js";
import { generateToken, hashToken } from "../services/tokenService.js";

const VERIF_EXP_HOURS = Number.parseInt(process.env.VERIFICATION_TOKEN_EXP_HOURS || "24", 10);
const RESET_EXP_HOURS = Number.parseInt(process.env.RESET_TOKEN_EXP_HOURS || "1", 10);
const LOGIN_MAX        = Number.parseInt(process.env.LOGIN_MAX_ATTEMPTS || "5", 10);
const LOGIN_LOCK_MIN   = Number.parseInt(process.env.LOGIN_LOCK_MINUTES || "15", 10);
const BCRYPT_ROUNDS    = 12;

function nowPlusHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
function nowPlusMinutes(mins) {
  return new Date(Date.now() + mins * 60 * 1000);
}

// ════════════════════════════════════════════════════════════
//  REGISTRO
//  CAMBIOS:
//  - Ya no usa pregunta_secreta / respuesta_secreta (columnas eliminadas)
//  - Token de verificación se guarda en tabla 'tokens', no en usuarios
//  - Columna 'password' renombrada a 'password_hash'
// ════════════════════════════════════════════════════════════
export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 1. Insertar usuario con la nueva estructura
    const userResult = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, cuenta_activa, email_verificado)
       VALUES ($1, $2, $3, FALSE, FALSE)
       RETURNING id`,
      [nombre, email, hashedPassword]
    );
    const userId = userResult.rows[0].id;

    // 2. Generar token de verificación y guardarlo en tabla 'tokens'
    const token    = generateToken(32);
    const tokenExp = nowPlusHours(VERIF_EXP_HOURS);

    await pool.query(
      `INSERT INTO tokens (usuario_id, tipo, token_hash, expira_en, usado)
       VALUES ($1, 'verificacion', $2, $3, FALSE)`,
      [userId, token, tokenExp]
    );

    // 3. Enviar correo (no-fail: si falla el correo el usuario igual fue creado)
    try {
      await sendVerificationEmail(email, nombre, token);
    } catch (error_) {
      console.error("Error enviando email:", error_);
    }
    return res.status(201).json({
      message: "Si la cuenta fue creada, recibirás un correo con instrucciones para activar.",
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Datos inválidos o usuario ya existente" });
    }
    console.error("Error registrarUsuario:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// ════════════════════════════════════════════════════════════
//  ACTIVAR CUENTA
//  CAMBIOS: Busca el token en la tabla 'tokens' en lugar de
//  la columna token_activacion de usuarios
// ════════════════════════════════════════════════════════════
export const activarCuenta = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: "Token inválido" });

    // Buscar token vigente en la tabla tokens
    const tokenResult = await pool.query(
      `SELECT id, usuario_id, expira_en
       FROM tokens
       WHERE token_hash = $1
         AND tipo = 'verificacion'
         AND usado = FALSE`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }
    const tkn = tokenResult.rows[0];

    if (new Date(tkn.expira_en) < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // Activar usuario
    await pool.query(
      `UPDATE usuarios
       SET cuenta_activa = TRUE, email_verificado = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [tkn.usuario_id]
    );

    // Marcar token como usado
    await pool.query(`UPDATE tokens SET usado = TRUE WHERE id = $1`, [tkn.id]);

    return res.json({ message: "Cuenta activada correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al activar cuenta" });
  }
};

// ════════════════════════════════════════════════════════════
//  LOGIN
//  CAMBIOS: SELECT usa 'password_hash' (antes era 'password')
//           bcrypt.compare usa user.password_hash
// ════════════════════════════════════════════════════════════
export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, password_hash, cuenta_activa, login_attempts, lock_until, token_version
       FROM usuarios WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      await bcrypt.hash("dummy", BCRYPT_ROUNDS); // prevenir timing attack
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    const user = result.rows[0];

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(423).json({
        message: "Cuenta bloqueada temporalmente por intentos fallidos. Intenta en 15 minutos.",
      });
    }
    if (!user.cuenta_activa) {
      return res.status(403).json({ message: "Cuenta inactiva. Revisa tu correo." });
    }

    // Comparar contra password_hash (columna renombrada)
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const attempts  = (user.login_attempts || 0) + 1;
      const lockUntil = attempts >= LOGIN_MAX ? nowPlusMinutes(LOGIN_LOCK_MIN) : null;
      await pool.query(
        "UPDATE usuarios SET login_attempts = $1, lock_until = $2 WHERE id = $3",
        [attempts, lockUntil, user.id]
      );
      return res.status(401).json({
        message: `Credenciales inválidas. Intento ${attempts} de ${LOGIN_MAX}`,
      });
    }

    // Resetear intentos y actualizar timestamp
    await pool.query(
      `UPDATE usuarios
       SET login_attempts = 0, lock_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );

    const tokenPayload = { id: user.id, email, token_version: user.token_version };
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "secreto_super_seguro",
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Login exitoso",
      token,
      usuario: { id: user.id, email },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ════════════════════════════════════════════════════════════
//  LOGOUT — sin cambios, pero actualiza updated_at
// ════════════════════════════════════════════════════════════
export const logoutUsuario = async (req, res) => {
  try {
    await pool.query(
      `UPDATE usuarios
       SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.user.id]
    );
    return res.json({ message: "Sesión cerrada y tokens invalidados." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cerrar sesión" });
  }
};
/* ════════════════════════════════════════════════════════════
OBTENER PREGUNTA SECRETA — FUNCIÓN DESACTIVADA
La columna pregunta_secreta fue eliminada en la migración.
Se mantiene el export para no romper las rutas,
pero devuelve 410 Gone con mensaje claro.
════════════════════════════════════════════════════════════
export const obtenerPregunta = async (_req, res) => {
  return res.status(410).json({
    message: "La recuperación por pregunta secreta fue eliminada. Usa la recuperación por correo electrónico.",
  });
};
════════════════════════════════════════════════════════════
VALIDAR RESPUESTA SECRETA — FUNCIÓN DESACTIVADA
 Misma razón que obtenerPregunta
════════════════════════════════════════════════════════════
export const validarRespuestaSecreta = async (_req, res) => {
  return res.status(410).json({
    message: "La recuperación por pregunta secreta fue eliminada. Usa la recuperación por correo electrónico.",
  });
}; */

// ════════════════════════════════════════════════════════════
//  REQUEST PASSWORD RESET (envío de código por correo)
//  CAMBIOS: Token se guarda en tabla 'tokens', no en usuarios
// ════════════════════════════════════════════════════════════
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id, nombre FROM usuarios WHERE email = $1",
      [email]
    );

    // Siempre respondemos igual para no revelar si el correo existe
    if (result.rows.length === 0) {
      return res.json({ message: "Si el correo existe, se enviaron instrucciones." });
    }
    const user = result.rows[0];

    // Invalidar tokens de recuperación anteriores de este usuario
    await pool.query(
      `UPDATE tokens SET usado = TRUE
       WHERE usuario_id = $1 AND tipo = 'recuperacion' AND usado = FALSE`,
      [user.id]
    );

    // Generar nuevo token numérico de 6 dígitos
    const token     = crypto.randomInt(100000, 999999).toString();
    const tokenHash = hashToken(token);
    const expiry    = nowPlusHours(RESET_EXP_HOURS);

    await pool.query(
      `INSERT INTO tokens (usuario_id, tipo, token_hash, expira_en, usado)
       VALUES ($1, 'recuperacion', $2, $3, FALSE)`,
      [user.id, tokenHash, expiry]
    );

    try {
      await sendResetEmail(email, user.nombre || "Usuario", token);
    }catch (error_) {
      console.error("Error enviando email:", error_);
    }

    return res.json({ message: "Correo enviado con éxito. Revisa tu bandeja." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ════════════════════════════════════════════════════════════
//  VALIDATE RESET TOKEN
//  CAMBIOS: Busca en tabla 'tokens', no en columnas de usuarios
// ════════════════════════════════════════════════════════════
export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token inválido" });

    const tokenHash = hashToken(token);

    const result = await pool.query(
      `SELECT id, expira_en
       FROM tokens
       WHERE token_hash = $1
         AND tipo = 'recuperacion'
         AND usado = FALSE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }
    const row = result.rows[0];

    if (new Date(row.expira_en) < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    return res.json({ message: "Token válido" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Error al validar token" });
  }
};

// ════════════════════════════════════════════════════════════
//  RESET PASSWORD
//  CAMBIOS:
//  - Busca token en tabla 'tokens', no en columnas de usuarios
//  - Actualiza 'password_hash' (antes era 'password')
//  - Marca token como usado en tabla 'tokens'
// ════════════════════════════════════════════════════════════
export const resetPassword = async (req, res) => {
  try {
    const { token, nueva_password } = req.body;
    if (!token || !nueva_password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    if (nueva_password.length < Number.parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10)) {
      return res.status(400).json({ message: "Contraseña no cumple requisitos" });
    }

    const tokenHash = hashToken(token);

    // Buscar token válido en tabla tokens
    const result = await pool.query(
      `SELECT id, usuario_id, expira_en
       FROM tokens
       WHERE token_hash = $1
         AND tipo = 'recuperacion'
         AND usado = FALSE`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }
    const row = result.rows[0];

    if (new Date(row.expira_en) < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    const hashed = await bcrypt.hash(nueva_password, BCRYPT_ROUNDS);

    // Actualizar password_hash (columna renombrada)
    await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashed, row.usuario_id]
    );

    // Marcar token como usado
    await pool.query(`UPDATE tokens SET usado = TRUE WHERE id = $1`, [row.id]);

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ════════════════════════════════════════════════════════════
//  PERFIL — sin cambios estructurales
// ════════════════════════════════════════════════════════════
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email FROM usuarios WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener perfil" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { nombre, email } = req.body;
    await pool.query(
      `UPDATE usuarios
       SET nombre = $1, email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [nombre, email, req.user.id]
    );
    return res.json({ message: "Perfil actualizado correctamente" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Ese correo ya está en uso por otro usuario." });
    }
    console.error(error);
    return res.status(500).json({ message: "Error al actualizar perfil" });
  }
};
