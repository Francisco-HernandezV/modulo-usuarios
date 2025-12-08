import { OAuth2Client } from "google-auth-library";
import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Login con Google
export const loginConGoogle = async (req, res) => {
  try {
    const { token } = req.body;

    // Verificar el token de Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email } = ticket.getPayload();

    // Buscar si ya existe el usuario
    pool.query("SELECT * FROM usuarios WHERE email = ?", [email], (err, results) => {
      if (err) return res.status(500).json({ message: "Error en el servidor" });

      // Si no existe, lo registramos automáticamente
      if (results.length === 0) {
        pool.query(
          "INSERT INTO usuarios (nombre, email, password, cuenta_activa) VALUES (?, ?, '', 1)",
          [name, email],
          (error) => {
            if (error) return res.status(500).json({ message: "Error al registrar usuario con Google" });
            return res.json({ message: "Usuario registrado con Google", usuario: { nombre: name, email } });
          }
        );
      } else {
        // Si ya existe, simplemente devolvemos su info
        const user = results[0];
        return res.json({ message: "Inicio de sesión con Google exitoso", usuario: { id: user.id, nombre: user.nombre, email: user.email } });
      }
    });
  } catch (error) {
    res.status(400).json({ message: "Token de Google no válido", error: error.message });
  }
};
