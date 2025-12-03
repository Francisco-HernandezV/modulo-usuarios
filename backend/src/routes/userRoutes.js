import express from "express";
import {
  registrarUsuario,
  loginUsuario,
  activarCuenta,
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

// Recovery flow
router.post("/recover", recoverLimiter, recoverValidator, requestPasswordReset);
router.post("/recover/validate", recoverLimiter, validateResetToken);
router.post("/recover/reset", resetPasswordValidator, resetPassword);

export default router;
