import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Bloquear tras 5 intentos fallidos
    message: {
        message: "Demasiados intentos de inicio de sesión, por favor intente nuevamente en 15 minutos"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const recoverLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Bloquear tras 3 intentos de recuperación
    message: {
        message: "Demasiados intentos de recuperación de contraseña, intente más tarde"
    },
    standardHeaders: true,
    legacyHeaders: false,
});