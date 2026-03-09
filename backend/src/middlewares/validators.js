import { body, validationResult } from "express-validator";
import validator from "validator";

// Middleware auxiliar para manejar los resultados de la validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: "Error de validación", 
      errors: errors.array() 
    });
  }
  next();
};

export const registerValidator = [
  // --- NOMBRE ---
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .matches(/^[A-ZÁÉÍÓÚÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
    .withMessage("El nombre debe iniciar con mayúscula y solo contener letras"),

  // --- EMAIL ---
  body("email")
    .trim()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido (ej: usuario@dominio.com)")
    .normalizeEmail(),

  // --- CONTRASEÑA ---
  body("password")
    .trim()
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 8, max: 16 }).withMessage("La contraseña debe tener entre 8 y 16 caracteres")
    .matches(/[A-Z]/).withMessage("La contraseña debe incluir al menos una letra mayúscula")
    .matches(/[a-z]/).withMessage("La contraseña debe incluir al menos una letra minúscula")
    .matches(/[0-9]/).withMessage("La contraseña debe incluir al menos un número")
    .matches(/[\W_]/).withMessage("La contraseña debe incluir al menos un carácter especial (!@#$%^&*)"),

  // NOTA: pregunta_secreta y respuesta_secreta eliminados.
  // Las columnas fueron removidas en la migración a PostgreSQL.

  handleValidationErrors
];

export const loginValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria"),
  handleValidationErrors
];

export const recoverValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),
  handleValidationErrors
];

export const resetPasswordValidator = [
  body("token").notEmpty().withMessage("Token faltante"),
  
  body("nueva_password")
    .trim()
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 8, max: 16 }).withMessage("La contraseña debe tener entre 8 y 16 caracteres")
    .matches(/[A-Z]/).withMessage("Debe incluir al menos una mayúscula")
    .matches(/[a-z]/).withMessage("Debe incluir al menos una minúscula")
    .matches(/[0-9]/).withMessage("Debe incluir al menos un número")
    .matches(/[\W_]/).withMessage("Debe incluir al menos un carácter especial"),
    
  handleValidationErrors
];
