import express from "express";
import {
  registrarUsuario,
  loginUsuario,
  activarCuenta,
  obtenerPregunta,         // Mantenido en el import pero devuelve 410
  validarRespuestaSecreta, // Mantenido en el import pero devuelve 410
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  logoutUsuario,
  getProfile,
  updateProfile
} from "../controllers/userController.js";
import { registerValidator, loginValidator, recoverValidator, resetPasswordValidator } from "../middlewares/validators.js";
import { loginLimiter, recoverLimiter } from "../middlewares/rateLimiter.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerValidator, registrarUsuario);
router.post("/login", loginLimiter, loginValidator, loginUsuario);
router.get("/activar/:token", activarCuenta);

// ⚠️  Rutas de pregunta secreta desactivadas (feature eliminado en migración).
//     Se mantienen para no romper clientes existentes, devuelven 410 Gone.
router.post("/recover/check",  recoverLimiter, recoverValidator, obtenerPregunta);
router.post("/recover/answer", recoverLimiter, validarRespuestaSecreta);

// Recuperación por correo (flujo activo)
router.post("/recover/send-email",    recoverLimiter, requestPasswordReset);
router.post("/recover/validate-token", recoverLimiter, validateResetToken);
router.post("/recover/reset",          resetPasswordValidator, resetPassword);

router.post("/logout", verifyToken, logoutUsuario);
router.get("/verify",  verifyToken, (req, res) => res.sendStatus(200));

// Rutas de Perfil
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

export default router;
