import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail, sendResetEmail } from "../services/mailService.js";
import { generateToken, hashToken } from "../services/tokenService.js";

const VERIF_EXP_HOURS = parseInt(process.env.VERIFICATION_TOKEN_EXP_HOURS || "24", 10);
const RESET_EXP_HOURS = parseInt(process.env.RESET_TOKEN_EXP_HOURS || "1", 10);
const LOGIN_MAX = parseInt(process.env.LOGIN_MAX_ATTEMPTS || "5", 10);
const LOGIN_LOCK_MIN = parseInt(process.env.LOGIN_LOCK_MINUTES || "15", 10);
const BCRYPT_ROUNDS = 12;

function nowPlusHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
function nowPlusMinutes(mins) {
  return new Date(Date.now() + mins * 60 * 1000);
}

export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, password, pregunta_secreta, respuesta_secreta } = req.body;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const hashedRespuesta = await bcrypt.hash(respuesta_secreta, BCRYPT_ROUNDS);

    const token = generateToken(32);
    const tokenExp = nowPlusHours(VERIF_EXP_HOURS);

    await pool.query(
      "INSERT INTO usuarios (nombre, email, password, pregunta_secreta, respuesta_secreta, token_activacion, token_activacion_exp, cuenta_activa) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      [nombre, email, hashedPassword, pregunta_secreta, hashedRespuesta, token, tokenExp]
    );
    try {
      await sendVerificationEmail(email, nombre, token);
    } catch (mailErr) {
      console.error("Error enviando email de verificación:", mailErr);
    }

    return res.status(201).json({ message: "Si la cuenta fue creada, recibirás un correo con instrucciones para activar." });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Datos inválidos o usuario ya existente" }); 
    }
    console.error("Error registrarUsuario:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const activarCuenta = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: "Token inválido" });
    const [results] = await pool.query(
      "SELECT id, token_activacion_exp FROM usuarios WHERE token_activacion = ?",
      [token]
    );

    if (results.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });

    const row = results[0];
    if (!row.token_activacion_exp || new Date(row.token_activacion_exp) < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    await pool.query(
      "UPDATE usuarios SET cuenta_activa = 1, token_activacion = NULL, token_activacion_exp = NULL WHERE id = ?",
      [row.id]
    );

    return res.json({ message: "Cuenta activada correctamente. Ya puedes iniciar sesión." });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al activar cuenta" });
  }
};

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [results] = await pool.query(
      "SELECT id, password, cuenta_activa, login_attempts, lock_until FROM usuarios WHERE email = ?", 
      [email]
    );

    if (results.length === 0) {
      await bcrypt.hash("dummy", BCRYPT_ROUNDS);
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const user = results[0];

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(423).json({ message: "Cuenta bloqueada temporalmente. Intenta más tarde." });
    }

    if (!user.cuenta_activa) {
      return res.status(403).json({ message: "Debes activar tu cuenta antes de iniciar sesión." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      const attempts = (user.login_attempts || 0) + 1;
      const lockUntil = attempts >= LOGIN_MAX ? nowPlusMinutes(LOGIN_LOCK_MIN) : null;
      
      await pool.query("UPDATE usuarios SET login_attempts = ?, lock_until = ? WHERE id = ?", [attempts, lockUntil, user.id]);
      
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    await pool.query("UPDATE usuarios SET login_attempts = 0, lock_until = NULL WHERE id = ?", [user.id]);

    return res.json({ message: "Login exitoso", usuario: { id: user.id, email } });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

// 1. Verificar si el usuario existe y devolver su pregunta (O enviar correo si se elige esa opción después)
export const obtenerPregunta = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requerido" });

    const [results] = await pool.query("SELECT id, pregunta_secreta FROM usuarios WHERE email = ?", [email]);

    if (results.length === 0) {
      return res.status(404).json({ message: "Correo no encontrado" });
    }

    return res.json({ 
      message: "Usuario encontrado", 
      pregunta: results[0].pregunta_secreta 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const validarRespuestaSecreta = async (req, res) => {
  try {
    const { email, respuesta } = req.body;
    
    const [results] = await pool.query(
      "SELECT id, respuesta_secreta, recovery_lock_until FROM usuarios WHERE email = ?", 
      [email]
    );

    if (results.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = results[0];

    if (user.recovery_lock_until && new Date(user.recovery_lock_until) > new Date()) {
      return res.status(429).json({ message: "Demasiados intentos. Intenta más tarde." });
    }

    const match = await bcrypt.compare(respuesta, user.respuesta_secreta);
    
    if (!match) {
        return res.status(400).json({ message: "Respuesta incorrecta" });
    }

    const token = generateToken(32);
    const tokenHash = hashToken(token);
    const expiry = nowPlusHours(RESET_EXP_HOURS);

    await pool.query(
      "UPDATE usuarios SET reset_token_hash = ?, reset_token_exp = ? WHERE id = ?", 
      [tokenHash, expiry, user.id]
    );

    return res.json({ message: "Respuesta correcta", token: token });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const [results] = await pool.query("SELECT id, nombre, recovery_lock_until FROM usuarios WHERE email = ?", [email]);
    if (results.length === 0) return res.json({ message: "Si el correo existe, se enviaron instrucciones." });
    const user = results[0];
    // const token = generateToken(32);
    const token = crypto.randomInt(100000, 999999).toString();
    const tokenHash = hashToken(token);
    const expiry = nowPlusHours(RESET_EXP_HOURS);
    await pool.query(
      "UPDATE usuarios SET reset_token_hash = ?, reset_token_exp = ? WHERE id = ?", 
      [tokenHash, expiry, user.id]
    );
    try {
      await sendResetEmail(email, user.nombre || "Usuario", token);
    } catch (mailErr) {
      console.error(mailErr);
    }
    return res.json({ message: "Correo enviado con éxito. Revisa tu bandeja." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token inválido" });
    
    const tokenHash = hashToken(token);

    const [results] = await pool.query(
      "SELECT id, reset_token_exp FROM usuarios WHERE reset_token_hash = ?", 
      [tokenHash]
    );

    if (results.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });
    
    const row = results[0];
    if (!row.reset_token_exp || new Date(row.reset_token_exp) < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    return res.json({ message: "Token válido" });

  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Error al validar token" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, nueva_password } = req.body;
    if (!token || !nueva_password) return res.status(400).json({ message: "Faltan datos" });

    if (nueva_password.length < parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10)) {
      return res.status(400).json({ message: "Contraseña no cumple requisitos" });
    }

    const tokenHash = hashToken(token);
    
    const [results] = await pool.query(
      "SELECT id, reset_token_exp FROM usuarios WHERE reset_token_hash = ?", 
      [tokenHash]
    );

    if (results.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });
    
    const row = results[0];
    if (!row.reset_token_exp || new Date(row.reset_token_exp) < new Date()) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    const hashed = await bcrypt.hash(nueva_password, BCRYPT_ROUNDS);
    
    await pool.query(
      "UPDATE usuarios SET password = ?, reset_token_hash = NULL, reset_token_exp = NULL WHERE id = ?", 
      [hashed, row.id]
    );

    return res.json({ message: "Contraseña actualizada correctamente" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};