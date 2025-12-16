import { body, validationResult } from "express-validator";
import validator from "validator";

// Middleware auxiliar para manejar los resultados de la validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Retornamos el array de errores para que el frontend pueda mostrarlos por campo
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
    // Regex: Empieza con mayúscula, permite letras (incluyendo tildes/ñ) y espacios. No números ni símbolos.
    .matches(/^[A-ZÁÉÍÓÚÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
    .withMessage("El nombre debe iniciar con mayúscula y solo contener letras"),

  // --- EMAIL ---
  body("email")
    .trim()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido (ej: usuario@dominio.com)")
    .normalizeEmail(),

  // --- CONTRASEÑA (Validaciones granulares para mensajes específicos) ---
  body("password")
    .trim()
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 8, max: 16 }).withMessage("La contraseña debe tener entre 8 y 16 caracteres")
    .matches(/[A-Z]/).withMessage("La contraseña debe incluir al menos una letra mayúscula")
    .matches(/[a-z]/).withMessage("La contraseña debe incluir al menos una letra minúscula")
    .matches(/[0-9]/).withMessage("La contraseña debe incluir al menos un número")
    .matches(/[\W_]/).withMessage("La contraseña debe incluir al menos un carácter especial (!@#$%^&*)"),

  // --- PREGUNTA SECRETA ---
  body("pregunta_secreta")
    .trim()
    .notEmpty().withMessage("Debes seleccionar una pregunta secreta")
    .customSanitizer((v) => validator.escape(v)),

  // --- RESPUESTA SECRETA ---
  body("respuesta_secreta")
    .trim()
    .notEmpty().withMessage("La respuesta secreta es obligatoria")
    // Regex: Empieza con mayúscula, permite letras y números. No símbolos especiales.
    .matches(/^[A-ZÁÉÍÓÚÑ][a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]*$/)
    .withMessage("La respuesta debe iniciar con mayúscula y no contener caracteres especiales (solo letras y números)")
    .customSanitizer((v) => validator.escape(v)),

  // Middleware de manejo de errores
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
  
  // Reutilizamos las mismas reglas estrictas para la nueva contraseña
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