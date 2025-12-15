import nodemailer from "nodemailer";

// Debug: Verificar si las variables existen (sin revelar la contraseña real)
console.log("🔧 Configurando transporte de correo...");
console.log(`Host: ${process.env.SMTP_HOST}`);
console.log(`Port: ${process.env.SMTP_PORT}`);
console.log(`User: ${process.env.SMTP_USER}`);
console.log(`Pass length: ${process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'FALTA'}`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // false para puerto 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verificar conexión al iniciar (esto nos dirá si Brevo nos rechaza de entrada)
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ Error de conexión SMTP al inicio:", error);
  } else {
    console.log("✅ Servidor SMTP listo para enviar mensajes");
  }
});

export async function sendVerificationEmail(to, name, token) {
  const link = `${process.env.BASE_URL}/activar/${token}`;
  const html = `
    <h2>¡Hola ${name}!</h2>
    <p>Haz clic en el siguiente enlace para activar tu cuenta (válido por 24 horas):</p>
    <a href="${link}" target="_blank">Activar cuenta</a>
  `;

  console.log(`📨 Intentando enviar correo a: ${to}`);
  
  try {
    const info = await transporter.sendMail({
      from: `"Módulo Usuarios" <${process.env.SMTP_USER}>`,
      to,
      subject: "Activa tu cuenta",
      html
    });
    console.log("✅ Correo enviado. ID:", info.messageId);
    console.log("Respuesta del servidor:", info.response);
  } catch (error) {
    console.error("❌ Error FATAL enviando correo:", error);
    // No lanzamos el error para no romper el registro, pero ya lo vimos en consola
  }
}

export async function sendResetEmail(to, name, token) {
  // ... (puedes dejar esto igual por ahora o añadir logs similares)
}