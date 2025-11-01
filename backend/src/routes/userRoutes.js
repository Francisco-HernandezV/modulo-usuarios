import express from "express";
import {
  registrarUsuario,
  loginUsuario,
  activarCuenta,
  buscarPregunta,
  validarRespuesta,
  actualizarPassword
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registrarUsuario);
router.post("/login", loginUsuario);
router.get("/activar/:token", activarCuenta);
router.post("/recover", buscarPregunta);
router.post("/recover/validate", validarRespuesta);
router.post("/recover/reset", actualizarPassword);

export default router;