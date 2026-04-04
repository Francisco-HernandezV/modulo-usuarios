import { body, validationResult } from "express-validator";

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
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .matches(/^[A-ZÁÉÍÓÚÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
    .withMessage("El nombre debe iniciar con mayúscula y solo contener letras"),
  body("email")
    .trim()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Debe ser un email válido (ej: usuario@dominio.com)")
    .normalizeEmail(),
  body("password")
    .trim()
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 8, max: 16 }).withMessage("La contraseña debe tener entre 8 y 16 caracteres")
    .matches(/[A-Z]/).withMessage("La contraseña debe incluir al menos una letra mayúscula")
    .matches(/[a-z]/).withMessage("La contraseña debe incluir al menos una letra minúscula")
    .matches(/\d/).withMessage("La contraseña debe incluir al menos un número")
    .matches(/[\W_]/).withMessage("La contraseña debe incluir al menos un carácter especial (!@#$%^&*)"),
  
  // 📞 Validación opcional de teléfono de contacto
  body("telefono_contacto")
    .optional({ checkFalsy: true })
    .matches(/^\d{10}$/)
    .withMessage("El teléfono debe contener exactamente 10 dígitos numéricos"),
    
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
    .matches(/\d/).withMessage("La contraseña debe incluir al menos un número")
    .matches(/[\W_]/).withMessage("Debe incluir al menos un carácter especial"),
    
  handleValidationErrors
];

export const productoCompletoValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre del producto es obligatorio"),
  body("precio_base")
    .notEmpty().withMessage("El precio base es obligatorio")
    .isFloat({ min: 0.01 }).withMessage("El precio base no puede ser negativo ni cero")
    // Regex: Empieza con dígitos, opcionalmente un punto y 1 o 2 dígitos. Rechaza la 'e'.
    .matches(/^\d+(\.\d{1,2})?$/).withMessage("El precio base solo acepta números con un máximo de 2 decimales"),
  handleValidationErrors
];

// 🔥 NUEVO: Validador estricto para editar stock y precio en Inventario
export const varianteValidator = [
  body("precio")
    .notEmpty().withMessage("El precio es obligatorio")
    .isFloat({ min: 0 }).withMessage("El precio no puede ser negativo")
    .matches(/^\d+(\.\d{1,2})?$/).withMessage("El precio solo acepta números con un máximo de 2 decimales"),
  body("stock")
    .notEmpty().withMessage("El stock es obligatorio")
    .isInt({ min: 0 }).withMessage("El stock debe ser un número entero (sin decimales) y no negativo"),
  handleValidationErrors
];