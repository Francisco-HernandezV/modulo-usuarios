import express from "express";
import { 
  procesarVenta, 
  buscarProductoPos, 
  buscarClientePos,
  getHistorialVentas,
  generarTicketPDF
} from "../controllers/ventasController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas las rutas de ventas requieren estar autenticado
router.use(verifyToken);

// El POS lo pueden operar Admin y Vendedor.
const rolesPermitidos = ["rol_admin", "rol_vendedor"];

// ── Búsquedas Rápidas (Para el escáner y autocomplete) ──
router.get("/buscar-producto", checkRole(rolesPermitidos), buscarProductoPos);
router.get("/buscar-cliente", checkRole(rolesPermitidos), buscarClientePos);

// ── Procesamiento de Venta ──
router.post("/procesar", checkRole(rolesPermitidos), procesarVenta);

// ── Historial y Tickets ──
router.get("/historial", checkRole(rolesPermitidos), getHistorialVentas);
router.get("/ticket/:id/pdf", checkRole(rolesPermitidos), generarTicketPDF); // <--- Nueva ruta del PDF

// 👇 ESTA ES LA LÍNEA QUE FALTABA PARA QUE NODE.JS NO CRASHEE
export default router;