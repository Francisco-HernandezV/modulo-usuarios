import express from "express";
import { 
  buscarProductoParaIngreso,
  getMatrizVariantes,
  calcularSugerenciaProducto,
  registrarEntrada,
  getHistorialEntradas,
  getDetalleEntrada,
  anularEntrada
} from "../controllers/inventarioController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

const rolesAutorizados = ["rol_admin", "rol_gestor_inventario"];

// ── Búsqueda de productos y matriz de variantes ──
router.get("/buscar-producto", checkRole(rolesAutorizados), buscarProductoParaIngreso);
router.get("/producto/:id/matriz", checkRole(rolesAutorizados), getMatrizVariantes);

// ── Cálculo de sugerencia en vivo ──
router.post("/calcular-sugerencia", checkRole(rolesAutorizados), calcularSugerenciaProducto);

// ── Operación principal ──
router.post("/entradas", checkRole(rolesAutorizados), registrarEntrada);

// ── Historial ──
router.get("/entradas", checkRole(rolesAutorizados), getHistorialEntradas);
router.get("/entradas/:id", checkRole(rolesAutorizados), getDetalleEntrada);

// ── Anulación (solo admin) ──
router.put("/entradas/:id/anular", checkRole(["rol_admin"]), anularEntrada);

export default router;