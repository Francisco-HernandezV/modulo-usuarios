import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendVerificationEmail(to, name, token) {
  const link = `${process.env.BASE_URL}/activar/${token}`;
  const html = `
    <h2>¡Hola ${name}!</h2>
    <p>Haz clic en el siguiente enlace para activar tu cuenta (válido por ${process.env.VERIFICATION_TOKEN_EXP_HOURS || 24} horas):</p>
    <a href="${link}" target="_blank">Activar cuenta</a>
  `;
  await transporter.sendMail({
    from: `"Módulo Usuarios" <${process.env.SMTP_USER}>`,
    to,
    subject: "Activa tu cuenta",
    html
  });
}

export async function sendResetEmail(to, name, token) {
  const link = `${process.env.BASE_URL}/recover?token=${token}`;
  const html = `
    <h2>Hola ${name}</h2>
    <p>Haz clic en el siguiente enlace para restablecer tu contraseña (válido ${process.env.RESET_TOKEN_EXP_HOURS || 1} hora):</p>
    <a href="${link}" target="_blank">Restablecer contraseña</a>
  `;
  await transporter.sendMail({
    from: `"Módulo Usuarios" <${process.env.SMTP_USER}>`,
    to,
    subject: "Recuperación de contraseña",
    html
  });
}
