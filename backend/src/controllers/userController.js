import connection from "../config/db.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const registrarUsuario = async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);

    const { nombre, email, password, pregunta_secreta, respuesta_secreta } = req.body;

    if (!nombre || !email || !password || !pregunta_secreta || !respuesta_secreta) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const hashedRespuesta = bcrypt.hashSync(respuesta_secreta, 10);
    const token = crypto.randomBytes(32).toString("hex");

    console.log("Insertando usuario...");

    connection.query(
      "INSERT INTO usuarios (nombre, email, password, pregunta_secreta, respuesta_secreta, token_activacion) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, email, hashedPassword, pregunta_secreta, hashedRespuesta, token],
      async (err) => {
        if (err) {
          console.error("Error al registrar usuario:", err);
          return res.status(500).json({ message: "Error al registrar usuario", error: err });
        }

        const linkActivacion = `${process.env.BASE_URL}/api/users/activar/${token}`;
        console.log("📨 Enviando correo con Brevo SMTP a:", email);

        try {
          await transporter.sendMail({
            from: `"Módulo Usuarios" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Activa tu cuenta",
            html: `
              <h2>¡Bienvenido, ${nombre}!</h2>
              <p>Por favor, haz clic en el siguiente enlace para activar tu cuenta:</p>
              <a href="${linkActivacion}" target="_blank">Activar cuenta</a>
            `,
          });

          console.log("Correo enviado correctamente a:", email);

          res.status(201).json({
            message: "Usuario registrado. Revisa tu correo para activar la cuenta.",
          });

        } catch (error) {
          console.error("Error al enviar correo con Brevo SMTP:", error);
          res.status(500).json({ message: "Error al enviar correo", error });
        }
      }
    );
  } catch (error) {
    console.error("Error general en registrarUsuario:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

export const activarCuenta = (req, res) => {
  const { token } = req.params;

  connection.query(
    "UPDATE usuarios SET cuenta_activa = 1, token_activacion = NULL WHERE token_activacion = ?",
    [token],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error del servidor" });
      if (result.affectedRows === 0)
        return res.status(400).json({ message: "Token inválido o expirado" });

      res.json({ message: "Cuenta activada correctamente. Ya puedes iniciar sesión." });
    }
  );
};

export const loginUsuario = (req, res) => {
  const { email, password } = req.body;

  connection.query("SELECT * FROM usuarios WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Error en el servidor" });
    if (results.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const user = results[0];

    if (!user.cuenta_activa) {
      return res.status(403).json({ message: "Debes activar tu cuenta antes de iniciar sesión." });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

    res.json({
      message: "Login exitoso",
      usuario: { id: user.id, nombre: user.nombre, email: user.email },
    });
  });
};

export const buscarPregunta = (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Falta el correo electrónico" });

  connection.query(
    "SELECT pregunta_secreta FROM usuarios WHERE email = ?",
    [email],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error del servidor" });
      if (results.length === 0) return res.status(404).json({ message: "Correo no encontrado" });

      res.json({ pregunta: results[0].pregunta_secreta });
    }
  );
};

export const validarRespuesta = (req, res) => {
  const { email, respuesta } = req.body;

  if (!email || !respuesta)
    return res.status(400).json({ message: "Faltan datos" });

  connection.query(
    "SELECT respuesta_secreta FROM usuarios WHERE email = ?",
    [email],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error del servidor" });
      if (results.length === 0) return res.status(404).json({ message: "Correo no encontrado" });

      const respuestaHash = results[0].respuesta_secreta;
      const esCorrecta = bcrypt.compareSync(respuesta, respuestaHash);

      if (!esCorrecta)
        return res.status(401).json({ message: "Respuesta incorrecta" });

      res.json({ message: "Respuesta correcta" });
    }
  );
};

export const actualizarPassword = (req, res) => {
  const { email, nueva_password } = req.body;

  if (!email || !nueva_password)
    return res.status(400).json({ message: "Faltan datos" });

  const hashedPassword = bcrypt.hashSync(nueva_password, 10);

  connection.query(
    "UPDATE usuarios SET password = ? WHERE email = ?",
    [hashedPassword, email],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error del servidor" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Correo no encontrado" });

      res.json({ message: "Contraseña actualizada correctamente" });
    }
  );
};
