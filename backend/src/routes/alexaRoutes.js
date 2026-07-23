import express from "express";
import {
  loginAlexa,
  getInventarioAutenticado,
  getCatalogoPublico,
  getPerfilAlexa,
  verifyAlexaSecret,
  verifyAlexaToken,
  getUltimosIngresos,
  healthCheck
} from "../controllers/alexaController.js";

const router = express.Router();

// HEALTH — sin autenticación, para el ping de keep-alive (UptimeRobot)
router.get("/health", healthCheck);

// LOGIN — solo requiere secret compartido
router.post("/login", verifyAlexaSecret, loginAlexa);

// CATÁLOGO PÚBLICO (modo invitado) — solo requiere secret compartido
router.get("/catalogo", verifyAlexaSecret, getCatalogoPublico);

// ENDPOINTS PROTEGIDOS — requieren secret + JWT de Alexa
router.get("/inventario", verifyAlexaToken, getInventarioAutenticado);
router.get("/perfil", verifyAlexaToken, getPerfilAlexa);
router.get("/ultimos-ingresos", verifyAlexaToken, getUltimosIngresos);
export default router;