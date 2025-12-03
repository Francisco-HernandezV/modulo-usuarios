import { body, validationResult } from "express-validator";
import validator from "validator";

const passwordStrong = (value) => {
  // Reglas mínimas (puedes ajustar)
  if (typeof value !== "string") return false;
  const minLen = parseInt(process.env.PASSWORD_MIN_LENGTH || "8", 10);
  if (value.length < minLen) return false;
  // al menos un dígito y una letra
  if (!/[0-9]/.test(value)) return false;
  if (!/[a-zA-Z]/.test(value)) return false;
  // opcional: al menos un símbolo
  return true;
};

export const registerValidator = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ min: 2 }).withMessage("Nombre demasiado corto")
    .customSanitizer((v) => validator.escape(v)),
  body("email")
    .trim()
    .notEmpty().withMessage("Email obligatorio")
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),
  body("password")
    .custom((value) => {
      if (!passwordStrong(value)) throw new Error("Contraseña no cumple requisitos");
      return true;
    }),
  body("pregunta_secreta")
    .trim()
    .notEmpty().withMessage("Pregunta secreta obligatoria")
    .isLength({ min: 3 }).withMessage("Pregunta muy corta")
    .customSanitizer((v) => validator.escape(v)),
  body("respuesta_secreta")
    .trim()
    .notEmpty().withMessage("Respuesta obligatoria")
    .isLength({ min: 2 }).withMessage("Respuesta muy corta")
    .customSanitizer((v) => validator.escape(v)),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Error de validación", errors: errors.array() });
    }
    next();
  }
];

export const loginValidator = [
  body("email").trim().isEmail().normalizeEmail(),
  body("password").exists(),
  (req,res,next)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Datos inválidos", errors: errors.array() });
    next();
  }
];

export const recoverValidator = [
  body("email").trim().isEmail().normalizeEmail(),
  (req,res,next)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Datos inválidos", errors: errors.array() });
    next();
  }
];

export const resetPasswordValidator = [
  body("token").notEmpty(),
  body("nueva_password").custom((value) => {
    if (!passwordStrong(value)) throw new Error("Contraseña no cumple requisitos");
    return true;
  }),
  (req,res,next)=> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Datos inválidos", errors: errors.array() });
    next();
  }
];
