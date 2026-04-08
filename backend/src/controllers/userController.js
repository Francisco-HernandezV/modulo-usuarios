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
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  REGISTRO (ACTUALIZADO CON LÓGICA DE CLIENTES OMNICANAL)
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  REGISTRO (ACTUALIZADO CON BÚSQUEDA POR TELÉFONO O CORREO)
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  REGISTRO (VINCULACIÓN SILENCIOSA OMNICANAL)
// ════════════════════════════════════════════════════════════
export const registrarUsuario = async (req, res) => {
  const client = await pool.connect(); // Usamos client para manejar la transacción

  try {
    const { nombre, email, password, telefono_contacto } = req.body;
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await client.query('BEGIN');

    // 1. Insertar el usuario en la tabla de acceso web (seguridad.usuarios)
    const userResult = await client.query(
      `INSERT INTO seguridad.usuarios (nombre, email, password_hash, telefono_contacto, cuenta_activa, email_verificado)
       VALUES ($1, $2, $3, $4, FALSE, FALSE)
       RETURNING id`,
      [nombre.trim(), email.trim(), hashedPassword, telefono_contacto || null]
    );
    const userId = userResult.rows[0].id;

    // 2. Asignar el rol de cliente por defecto
    await client.query(
      `INSERT INTO seguridad.usuario_roles (usuario_id, rol_id)
       SELECT $1, id FROM seguridad.roles WHERE nombre = 'rol_cliente'`,
      [userId]
    );

    // 3. 🌟 VINCULACIÓN OMNICANAL SILENCIOSA (De Web a Tienda)
    let clienteId = null;

    // Prioridad 1: Buscar por teléfono en ventas.clientes
    if (telefono_contacto) {
      const clienteRes = await client.query(
        "SELECT id FROM ventas.clientes WHERE telefono = $1 LIMIT 1",
        [telefono_contacto.trim()]
      );
      if (clienteRes.rows.length > 0) clienteId = clienteRes.rows[0].id;
    }

    // Prioridad 2: Buscar por correo en ventas.clientes
    if (!clienteId && email) {
      const clienteRes = await client.query(
        "SELECT id FROM ventas.clientes WHERE email = $1 LIMIT 1",
        [email.trim()]
      );
      if (clienteRes.rows.length > 0) clienteId = clienteRes.rows[0].id;
    }

    if (clienteId) {
      // Escenario A: El cliente ya existía en la tienda. Lo vinculamos y autocompletamos datos faltantes.
      await client.query(
        `UPDATE ventas.clientes 
         SET usuario_id = $1, 
             email = COALESCE(email, $2),
             telefono = COALESCE(telefono, $3)
         WHERE id = $4`,
        [userId, email.trim(), telefono_contacto || null, clienteId]
      );
    } else {
      // Escenario B: Es totalmente nuevo. Se inserta en ventas.clientes con su usuario_id.
      await client.query(
        `INSERT INTO ventas.clientes (nombre, email, telefono, usuario_id) 
         VALUES ($1, $2, $3, $4)`,
        [nombre.trim(), email.trim(), telefono_contacto || null, userId]
      );
    }

    // 4. Generar token de verificación por correo
    const token    = generateToken(32);
    const tokenExp = nowPlusHours(VERIF_EXP_HOURS);

    await client.query(
      `INSERT INTO seguridad.tokens (usuario_id, tipo, token_hash, expira_en, usado)
       VALUES ($1, 'verificacion', $2, $3, FALSE)`,
      [userId, token, tokenExp]
    );

    await client.query('COMMIT'); // Todo salió bien, guardamos los cambios

    // 5. Enviar el correo electrónico (No detiene el registro si falla)
    try {
      await sendVerificationEmail(email, nombre, token);
    } catch (error_) {
      console.error("Error enviando email:", error_);
    }

    return res.status(201).json({
      message: "Registro exitoso. Recibirás un correo con instrucciones para activar tu cuenta.",
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Deshacemos todo si hay un error
    
    if (error.code === "23505") {
      // Código 23505 = Unique Violation. Significa que el correo ya está en seguridad.usuarios
      // Mensaje seguro que no revela más información de la necesaria.
      return res.status(400).json({ message: "Este correo electrónico ya se encuentra registrado." });
    }
    
    console.error("Error registrarUsuario:", error);
    return res.status(500).json({ message: "Error interno del servidor al procesar el registro." });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════════════
//  ACTIVAR CUENTA
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
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════
export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔥 Modificación: Añadimos requiere_cambio_password y apuntamos al esquema seguridad
    const result = await pool.query(
      `SELECT u.id, u.password_hash, u.cuenta_activa, u.login_attempts, u.lock_until, u.token_version, u.requiere_cambio_password, r.nombre AS rol
       FROM seguridad.usuarios u
       LEFT JOIN seguridad.usuario_roles ur ON u.id = ur.usuario_id
       LEFT JOIN seguridad.roles r ON ur.rol_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      await bcrypt.hash("dummy", 12); // prevenir timing attack
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    const user = result.rows[0];

    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(423).json({
        message: `Cuenta bloqueada temporalmente por intentos fallidos. Intenta en 15 minutos.`,
      });
    }
    if (!user.cuenta_activa) {
      return res.status(403).json({ message: "Cuenta inactiva. Revisa tu correo para activarla." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const attempts  = (user.login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await pool.query(
        "UPDATE seguridad.usuarios SET login_attempts = $1, lock_until = $2 WHERE id = $3",
        [attempts, lockUntil, user.id]
      );
      return res.status(401).json({
        message: `Credenciales inválidas. Intento ${attempts} de 5`,
      });
    }

    // Resetear intentos
    await pool.query(
      `UPDATE seguridad.usuarios
       SET login_attempts = 0, lock_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );

    // 🔥 NUEVA LÓGICA: Si requiere cambio de contraseña, enviamos un token temporal (15 min) y la bandera
    if (user.requiere_cambio_password) {
      const tokenTemp = jwt.sign(
        { id: user.id, email, token_version: user.token_version, temp: true },
        process.env.JWT_SECRET || "secreto_super_seguro",
        { expiresIn: "15m" }
      );
      
      return res.json({
        message: "Cambio de contraseña requerido",
        requirePasswordChange: true,
        token: tokenTemp,
        usuario: { id: user.id, email, rol: user.rol || 'rol_cliente' }
      });
    }

    // Login normal si no requiere cambio
    const tokenPayload = { id: user.id, email, token_version: user.token_version };
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "secreto_super_seguro",
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Login exitoso",
      requirePasswordChange: false,
      token,
      usuario: { id: user.id, email, rol: user.rol || 'rol_cliente' },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ════════════════════════════════════════════════════════════
//  LOGOUT
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

// ════════════════════════════════════════════════════════════
//  RECUPERACIÓN DE CONTRASEÑA
// ════════════════════════════════════════════════════════════
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id, nombre FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ message: "Si el correo existe, se enviaron instrucciones." });
    }
    const user = result.rows[0];

    // Invalidar tokens anteriores
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
    } catch (error_) {
      console.error("Error enviando email:", error_);
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

    await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashed, row.usuario_id]
    );

    await pool.query(`UPDATE tokens SET usado = TRUE WHERE id = $1`, [row.id]);

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error interno" });
  }
};

// ════════════════════════════════════════════════════════════
//  PERFIL
// ════════════════════════════════════════════════════════════
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, telefono_contacto FROM usuarios WHERE id = $1",
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
    const { nombre, email, telefono_contacto } = req.body;
    await pool.query(
      `UPDATE usuarios
       SET nombre = $1, email = $2, telefono_contacto = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [nombre, email, telefono_contacto || null, req.user.id]
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

// ════════════════════════════════════════════════════════════
//  CAMBIO DE CONTRASEÑA FORZADO (EMPLEADOS)
// ════════════════════════════════════════════════════════════
export const forcePasswordChange = async (req, res) => {
  try {
    const { nueva_password } = req.body;
    const userId = req.user.id; // Extraído del token temporal por el middleware authMiddleware

    if (!nueva_password || nueva_password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });
    }

    // 1. Encriptar la nueva contraseña
    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(nueva_password, salt);

    // 2. Actualizar la contraseña, quitar la bandera y aumentar la versión del token
    const query = `
      UPDATE seguridad.usuarios 
      SET password_hash = $1, 
          requiere_cambio_password = FALSE, 
          token_version = token_version + 1, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING email;
    `;
    const { rows } = await pool.query(query, [hashedNewPassword, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // 3. Opcional: Generar de una vez el token definitivo para que no tenga que volver a loguearse
    const userEmail = rows[0].email;
    
    // Obtenemos el rol actualizado y la nueva versión del token
    const rolQuery = await pool.query(`
       SELECT u.token_version, r.nombre AS rol
       FROM seguridad.usuarios u
       LEFT JOIN seguridad.usuario_roles ur ON u.id = ur.usuario_id
       LEFT JOIN seguridad.roles r ON ur.rol_id = r.id
       WHERE u.id = $1
    `, [userId]);

    const finalUser = rolQuery.rows[0];

    const tokenDefinitivo = jwt.sign(
      { id: userId, email: userEmail, token_version: finalUser.token_version },
      process.env.JWT_SECRET || "secreto_super_seguro",
      { expiresIn: "8h" }
    );

    return res.json({ 
      message: "Contraseña actualizada exitosamente. Redirigiendo...",
      token: tokenDefinitivo,
      usuario: { id: userId, email: userEmail, rol: finalUser.rol || 'rol_cliente' }
    });

  } catch (error) {
    console.error("Error en forcePasswordChange:", error);
    return res.status(500).json({ message: "Error interno al actualizar la contraseña." });
  }
};