import express from "express";
import {
  loginAlexa,
  getInventarioAutenticado,
  getPerfilAlexa,
  verifyAlexaSecret,
  verifyAlexaToken,
  getUltimosIngresos
} from "../controllers/alexaController.js";

const router = express.Router();

// LOGIN — solo requiere secret compartido
router.post("/login", verifyAlexaSecret, loginAlexa);

// ENDPOINTS PROTEGIDOS — requieren secret + JWT de Alexa
router.get("/inventario", verifyAlexaToken, getInventarioAutenticado);
router.get("/perfil", verifyAlexaToken, getPerfilAlexa);
router.get("/ultimos-ingresos", verifyAlexaToken, getUltimosIngresos);
export default router;