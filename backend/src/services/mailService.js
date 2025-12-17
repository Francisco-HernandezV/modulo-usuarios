import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configuración del transporte (Gmail, Outlook, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: parseInt(process.env.SMTP_PORT) === 465, // True para 465, false para otros
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Ayuda a evitar errores de certificados en desarrollo
  }
});

// Verificar conexión al iniciar el servidor
transporter.verify().then(() => {
  console.log("✅ Servidor de Correos listo");
}).catch((error) => {
  console.error("❌ Error conectando al servidor de correos:", error);
});

export async function sendVerificationEmail(to, name, token) {
  const link = `${process.env.BASE_URL}/activar/${token}`;
  
  const html = `
    <h1>Hola ${name},</h1>
    <p>Por favor activa tu cuenta haciendo clic aquí:</p>
    <a href="${link}">Activar Cuenta</a>
  `;

  try {
    await transporter.sendMail({
      from: `"Soporte" <${process.env.SMTP_USER}>`,
      to,
      subject: "Activa tu cuenta",
      html,
    });
    console.log("✅ Correo de verificación enviado");
  } catch (error) {
    console.error("❌ Error enviando verificación:", error);
  }
}

export async function sendResetEmail(to, name, token) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0d47a1;">Recuperación de Contraseña</h2>
      <p>Hola ${name || "Usuario"},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Este es tu código de recuperación:</p>
      
      <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${token}
      </div>

      <p>Copia este código y pégalo (automáticamente) si usaste la pregunta secreta, o úsalo si se te solicita.</p>
      <p style="font-size: 12px; color: #888;">Este código expira en 1 hora.</p>
    </div>
  `;

  console.log(`Intentando enviar correo de recuperación a: ${to}`);

  try {
    const info = await transporter.sendMail({
      from: `"Soporte Seguridad" <${process.env.SMTP_USER}>`,
      to,
      subject: "Recupera tu contraseña",
      html,
    });
    console.log("Correo enviado. MessageID:", info.messageId);
  } catch (error) {
    console.error("Error enviando correo de recuperación:", error);
    throw error;
  }
}