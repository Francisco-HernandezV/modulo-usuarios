import express from "express";
import {
  procesarVenta,
  buscarProductoPos,
  buscarClientePos,
  getHistorialVentas,
  generarTicketPDF
} from "../controllers/ventasController.js";
import {
  crearApartado,
  listarApartados,
  getApartadosVencidos,
  getApartadoDetalle,
  registrarAbono,
  cancelarApartado,
  generarApartadoPDF
} from "../controllers/apartadosController.js";
import {
  getEstadoCaja,
  abrirCaja,
  registrarRetiro,
  getBalanceActual,
  cerrarCaja,
  generarCortePDF
} from "../controllers/cajaController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(verifyToken);
const rolesPermitidos = ["rol_admin", "rol_vendedor"];

// ── Búsquedas Rápidas (Para el escáner y autocomplete) ──
router.get("/buscar-producto", checkRole(rolesPermitidos), buscarProductoPos);
router.get("/buscar-cliente", checkRole(rolesPermitidos), buscarClientePos);

// ── Procesamiento de Venta ──
router.post("/procesar", checkRole(rolesPermitidos), procesarVenta);

// ── Historial y Tickets ──
router.get("/historial", checkRole(rolesPermitidos), getHistorialVentas);
router.get("/ticket/:id/pdf", checkRole(rolesPermitidos), generarTicketPDF);

// ── Módulo de Apartados (Layaway) — solo Admin y Vendedor ──
router.post("/apartados",          checkRole(rolesPermitidos), crearApartado);
router.get("/apartados",           checkRole(rolesPermitidos), listarApartados);
router.get("/apartados/vencidos",  checkRole(rolesPermitidos), getApartadosVencidos);
router.get("/apartados/:id",       checkRole(rolesPermitidos), getApartadoDetalle);
router.post("/apartados/:id/abonos",   checkRole(rolesPermitidos), registrarAbono);
router.post("/apartados/:id/cancelar", checkRole(rolesPermitidos), cancelarApartado);
router.get("/apartados/:id/pdf",   checkRole(rolesPermitidos), generarApartadoPDF);

// ── Corte de Caja Diario — Admin y Vendedor ──
router.get("/caja/estado",          checkRole(rolesPermitidos), getEstadoCaja);
router.get("/caja/balance-actual",  checkRole(rolesPermitidos), getBalanceActual);
router.post("/caja/apertura",       checkRole(rolesPermitidos), abrirCaja);
router.post("/caja/retiro",         checkRole(rolesPermitidos), registrarRetiro);
router.post("/caja/cierre",         checkRole(rolesPermitidos), cerrarCaja);
router.get("/caja/turno/:id/pdf",   checkRole(rolesPermitidos), generarCortePDF);

export default router;