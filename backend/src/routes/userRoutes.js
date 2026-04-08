import express from "express";
import {
  registrarUsuario,
  loginUsuario,
  activarCuenta,
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  logoutUsuario,
  getProfile,
  updateProfile,
  forcePasswordChange // 🔥 NUEVA IMPORTACIÓN
} from "../controllers/userController.js";
import { registerValidator, loginValidator, recoverValidator, resetPasswordValidator } from "../middlewares/validators.js";
import { loginLimiter, recoverLimiter } from "../middlewares/rateLimiter.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ── Rutas Públicas ────────────────────────────────────────────────────────
router.post("/register", registerValidator, registrarUsuario);
router.post("/login", loginLimiter, loginValidator, loginUsuario);
router.get("/activar/:token", activarCuenta);

// ── Recuperación de Contraseña ────────────────────────────────────────────
router.post("/recover/send-email",    recoverLimiter, requestPasswordReset);
router.post("/recover/validate-token", recoverLimiter, validateResetToken);
router.post("/recover/reset",          resetPasswordValidator, resetPassword);

// ── Rutas Protegidas (Requieren Token) ────────────────────────────────────
router.post("/logout", verifyToken, logoutUsuario);
router.get("/verify",  verifyToken, (req, res) => res.sendStatus(200));
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

// 🔥 NUEVA RUTA: Cambio forzado de contraseña para nuevos empleados
// Usa verifyToken porque el usuario ya hizo login y recibió un token temporal
router.post("/force-password-change", verifyToken, forcePasswordChange);

export default router;