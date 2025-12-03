import connection from "../config/db.js";
import bcrypt from "bcryptjs";
import { sendVerificationEmail, sendResetEmail } from "../services/mailService.js";
import { generateToken, hashToken } from "../services/tokenService.js";

const VERIF_EXP_HOURS = parseInt(process.env.VERIFICATION_TOKEN_EXP_HOURS || "24", 10);
const RESET_EXP_HOURS = parseInt(process.env.RESET_TOKEN_EXP_HOURS || "1", 10);
const LOGIN_MAX = parseInt(process.env.LOGIN_MAX_ATTEMPTS || "5", 10);
const LOGIN_LOCK_MIN = parseInt(process.env.LOGIN_LOCK_MINUTES || "15", 10);
const RECOVERY_MAX = parseInt(process.env.RECOVERY_MAX_ATTEMPTS || "3", 10);
const RECOVERY_LOCK_MIN = parseInt(process.env.RECOVERY_LOCK_MINUTES || "15", 10);
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

    // Nota: validación ya hecha por middleware
    // Hasheos (async)
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const hashedRespuesta = await bcrypt.hash(respuesta_secreta, BCRYPT_ROUNDS);

    // generar token de verificación y expiración
    const token = generateToken(32);
    const tokenExp = nowPlusHours(VERIF_EXP_HOURS);

    // Insertar usuario (cuenta_activa = 0 por defecto)
    connection.query(
      "INSERT INTO usuarios (nombre, email, password, pregunta_secreta, respuesta_secreta, token_activacion, token_activacion_exp, cuenta_activa) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      [nombre, email, hashedPassword, pregunta_secreta, hashedRespuesta, token, tokenExp],
      async (err, result) => {
        if (err) {
          console.error("Error al registrar usuario:", err);
          // evitar leak de detalles
          return res.status(500).json({ message: "Error al registrar usuario" });
        }

        // enviar correo (si fallo, no revelemos al cliente)
        try {
          await sendVerificationEmail(email, nombre, token);
        } catch (mailErr) {
          console.error("Error enviando email de verificación:", mailErr);
        }

        return res.status(201).json({ message: "Si la cuenta fue creada, recibirás un correo con instrucciones para activar." });
      }
    );

  } catch (error) {
    console.error("Error registrarUsuario:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const activarCuenta = (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ message: "Token inválido" });

  // Buscar usuario con token
  connection.query(
    "SELECT id, token_activacion_exp FROM usuarios WHERE token_activacion = ?",
    [token],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error del servidor" });
      }
      if (results.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });

      const row = results[0];
      if (!row.token_activacion_exp || new Date(row.token_activacion_exp) < new Date()) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      connection.query(
        "UPDATE usuarios SET cuenta_activa = 1, token_activacion = NULL, token_activacion_exp = NULL WHERE id = ?",
        [row.id],
        (uErr) => {
          if (uErr) {
            console.error(uErr);
            return res.status(500).json({ message: "Error al activar cuenta" });
          }
          return res.json({ message: "Cuenta activada correctamente. Ya puedes iniciar sesión." });
        }
      );
    }
  );
};

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    connection.query("SELECT id, password, cuenta_activa, login_attempts, lock_until FROM usuarios WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error del servidor" });
      }

      // Do not reveal if user exists
      if (results.length === 0) {
        // Simulate delay to mitigate timing attacks
        await bcrypt.hash("dummy", BCRYPT_ROUNDS);
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      const user = results[0];

      // Check lock
      if (user.lock_until && new Date(user.lock_until) > new Date()) {
        return res.status(423).json({ message: "Cuenta bloqueada temporalmente. Intenta más tarde." });
      }

      // Check activated
      if (!user.cuenta_activa) {
        return res.status(403).json({ message: "Debes activar tu cuenta antes de iniciar sesión." });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        // increment login_attempts and maybe lock
        const attempts = (user.login_attempts || 0) + 1;
        const lockUntil = attempts >= LOGIN_MAX ? nowPlusMinutes(LOGIN_LOCK_MIN) : null;
        connection.query("UPDATE usuarios SET login_attempts = ?, lock_until = ? WHERE id = ?", [attempts, lockUntil, user.id], (uerr) => {
          if (uerr) console.error("Error actualizando intentos login:", uerr);
        });
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      // success: reset attempts
      connection.query("UPDATE usuarios SET login_attempts = 0, lock_until = NULL WHERE id = ?", [user.id], (uerr) => {
        if (uerr) console.error("Error reseteando intentos:", uerr);
      });

      // return minimal user info
      return res.json({ message: "Login exitoso", usuario: { id: user.id, email } });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ---------- RECUPERACIÓN (generar token y enviar email) ----------
export const requestPasswordReset = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "OK" }); // mensaje genérico

  // First check if user exists
  connection.query("SELECT id, nombre, recovery_attempts, recovery_lock_until FROM usuarios WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "OK" });
    }

    // Always respond generically at the end
    if (results.length === 0) {
      return res.json({ message: "Si existe la cuenta, recibirás un correo con instrucciones." });
    }

    const user = results[0];

    // Check recovery lock
    if (user.recovery_lock_until && new Date(user.recovery_lock_until) > new Date()) {
      return res.json({ message: "Si existe la cuenta, recibirás un correo con instrucciones." });
    }

    // generate token, store hash and expiry
    const token = generateToken(32);
    const tokenHash = hashToken(token);
    const expiry = nowPlusHours(RESET_EXP_HOURS);

    connection.query("UPDATE usuarios SET reset_token_hash = ?, reset_token_exp = ?, recovery_attempts = 0, recovery_lock_until = NULL WHERE id = ?", [tokenHash, expiry, user.id], async (uerr) => {
      if (uerr) {
        console.error(uerr);
        return res.json({ message: "Si existe la cuenta, recibirás un correo con instrucciones." });
      }
      // send email (do not fail on mail error)
      try {
        await sendResetEmail(email, user.nombre || "usuario", token);
      } catch (mailErr) {
        console.error("Error enviando reset email:", mailErr);
      }
      return res.json({ message: "Si existe la cuenta, recibirás un correo con instrucciones." });
    });
  });
};

export const validateResetToken = (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token inválido" });
  const tokenHash = hashToken(token);

  connection.query("SELECT id, reset_token_exp FROM usuarios WHERE reset_token_hash = ?", [tokenHash], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ message: "Token inválido o expirado" });
    }
    if (results.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });
    const row = results[0];
    if (!row.reset_token_exp || new Date(row.reset_token_exp) < new Date()) return res.status(400).json({ message: "Token inválido o expirado" });
    return res.json({ message: "Token válido" });
  });
};

export const resetPassword = async (req, res) => {
  try {
    const { token, nueva_password } = req.body;
    if (!token || !nueva_password) return res.status(400).json({ message: "Faltan datos" });

    // Check password strength server-side
    // (assume validators did it; double-check)
    if (nueva_password.length < parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10)) {
      return res.status(400).json({ message: "Contraseña no cumple requisitos" });
    }

    const tokenHash = hashToken(token);
    connection.query("SELECT id, reset_token_exp FROM usuarios WHERE reset_token_hash = ?", [tokenHash], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: "Token inválido o expirado" });
      }
      if (results.length === 0) return res.status(400).json({ message: "Token inválido o expirado" });
      const row = results[0];
      if (!row.reset_token_exp || new Date(row.reset_token_exp) < new Date()) return res.status(400).json({ message: "Token inválido o expirado" });

      const hashed = await bcrypt.hash(nueva_password, BCRYPT_ROUNDS);
      connection.query("UPDATE usuarios SET password = ?, reset_token_hash = NULL, reset_token_exp = NULL WHERE id = ?", [hashed, row.id], (uerr) => {
        if (uerr) {
          console.error(uerr);
          return res.status(500).json({ message: "Error actualizando contraseña" });
        }
        return res.json({ message: "Contraseña actualizada correctamente" });
      });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};
