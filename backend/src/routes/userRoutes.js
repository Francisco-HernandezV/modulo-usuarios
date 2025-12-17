import express from "express";
import {
  registrarUsuario,
  loginUsuario,
  activarCuenta,
  obtenerPregunta,
  validarRespuestaSecreta,
  requestPasswordReset,
  validateResetToken,
  resetPassword
} from "../controllers/userController.js";
import { registerValidator, loginValidator, recoverValidator, resetPasswordValidator } from "../middlewares/validators.js";
import { loginLimiter, recoverLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/register", registerValidator, registrarUsuario);
router.post("/login", loginLimiter, loginValidator, loginUsuario);
router.get("/activar/:token", activarCuenta);
router.post("/recover/check", recoverLimiter, recoverValidator, obtenerPregunta);
router.post("/recover/answer", recoverLimiter, validarRespuestaSecreta);
router.post("/recover/send-email", recoverLimiter, requestPasswordReset);
router.post("/recover/validate-token", recoverLimiter, validateResetToken);
router.post("/recover/reset", resetPasswordValidator, resetPassword);

export default router;