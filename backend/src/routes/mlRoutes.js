/**
 * mlRoutes.js — Rutas de los modelos de Machine Learning
 * ======================================================
 * Se montan en app.js con:
 *     import mlRoutes from "./routes/mlRoutes.js";
 *     app.use("/api/ml", mlRoutes);
 *
 * Endpoints resultantes:
 *   POST /api/ml/riesgo-apartado     -> riesgo de cancelación (Propuesta 2)
 *   GET  /api/ml/segmento/:cliente_id-> segmento del cliente  (Propuesta 3)
 *   GET  /api/ml/estado              -> estado del servicio Flask
 */

import express from "express";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";
import {
  riesgoApartado,
  segmentoCliente,
  estadoML,
} from "../controllers/mlController.js";

const router = express.Router();

// Todas las rutas requieren sesión iniciada.
router.use(verifyToken);

// Caja y apartados: administrador y vendedor.
const rolesPermitidos = ["rol_admin", "rol_vendedor"];

router.post("/riesgo-apartado", checkRole(rolesPermitidos), riesgoApartado);
router.get("/segmento/:cliente_id", checkRole(rolesPermitidos), segmentoCliente);

// El estado del servicio solo lo consulta el administrador.
router.get("/estado", checkRole(["rol_admin"]), estadoML);

export default router;