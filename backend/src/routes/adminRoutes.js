import express from "express";
import multer from "multer";
import {
  getCategorias, createCategoria, updateCategoria, deleteCategoria,
  getProductos, createProducto, updateProducto, deleteProducto, createProductoCompleto, 
  getClientes, createCliente, updateCliente, deleteCliente,
  getInventario, createVariante, updateVariante, deleteVariante,
  importarCatalogos, exportarInventario,
  getMarcas, getDepartamentos, getColores,
  getTallas, getTiposTalla, createTalla, deleteTalla,
  createCatalogoItem, deleteCatalogoItem,
  getRolesActivos, createEmpleado, getEmpleados, updateEmpleado, deleteEmpleado
} from "../controllers/adminController.js";

import { generarRespaldo, getHistorialRespaldos, registrarRespaldoExterno } from "../controllers/respaldosController.js";
import { getActivity, getLocks, killProcess, runExplain, getHealth, getAutovacuum } from "../controllers/monitorController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";
import { productoCompletoValidator, varianteValidator } from "../middlewares/validators.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// ── Rutas públicas (No requieren Token JWT) ───────────────────────────────
router.get("/categorias", getCategorias);
router.get("/productos",  getProductos);
router.get("/respaldos/generar", generarRespaldo);

// 🔥 NUEVA RUTA PARA POWERSHELL (Protegida por x-backup-secret)
router.post("/respaldos/registrar", registrarRespaldoExterno);

// ── Middleware de autenticación (A partir de aquí, todo exige login) ──────
router.use(verifyToken);

// ── Gestión de Empleados y Roles ──
router.get("/roles", checkRole(["rol_admin"]), getRolesActivos);
router.post("/empleados", checkRole(["rol_admin"]), createEmpleado);
router.get("/empleados", checkRole(["rol_admin"]), getEmpleados);
router.put("/empleados/:id", checkRole(["rol_admin"]), updateEmpleado);
router.delete("/empleados/:id", checkRole(["rol_admin"]), deleteEmpleado); 

// ── Categorías ──
router.post("/categorias",    checkRole(["rol_admin","rol_gestor_inventario"]), createCategoria);
router.put("/categorias/:id", checkRole(["rol_admin","rol_gestor_inventario"]), updateCategoria);
router.delete("/categorias/:id", checkRole(["rol_admin"]), deleteCategoria);

// ── Productos ──
router.post("/productos/completo", checkRole(["rol_admin","rol_gestor_inventario"]), productoCompletoValidator, createProductoCompleto);
router.post("/productos",     checkRole(["rol_admin","rol_gestor_inventario"]), createProducto);
router.put("/productos/:id",  checkRole(["rol_admin","rol_gestor_inventario"]), updateProducto);
router.delete("/productos/:id", checkRole(["rol_admin"]), deleteProducto);

// ── Exportación / Importación (Excel) ──
router.get("/inventario/exportar", checkRole(["rol_admin", "rol_gestor_inventario"]), exportarInventario);
router.post("/catalogos/importar", checkRole(["rol_admin"]), upload.single("archivo"), importarCatalogos);

// ── Inventario ──
router.get("/inventario",     checkRole(["rol_admin","rol_gestor_inventario","rol_vendedor"]), getInventario);
router.put("/inventario/:id", checkRole(["rol_admin","rol_gestor_inventario"]), varianteValidator, updateVariante);
router.delete("/inventario/:id", checkRole(["rol_admin"]), deleteVariante); 

// ── Clientes ──
router.get("/clientes",      checkRole(["rol_admin","rol_vendedor"]), getClientes);
router.post("/clientes",     checkRole(["rol_admin","rol_vendedor"]), createCliente);
router.put("/clientes/:id",  checkRole(["rol_admin","rol_vendedor"]), updateCliente);
router.delete("/clientes/:id", checkRole(["rol_admin"]), deleteCliente);

// ── Respaldos (Historial) ──
router.get("/respaldos", checkRole(["rol_admin"]), getHistorialRespaldos);

// ── Lectura de catálogos base ──
router.get("/marcas",       getMarcas);
router.get("/departamentos", getDepartamentos);
router.get("/colores",      getColores);
router.get("/tipos-talla",  getTiposTalla);
router.get("/tallas",       getTallas);

// ── Catálogos dinámicos ──
router.post("/tallas",       checkRole(["rol_admin","rol_gestor_inventario"]), createTalla);
router.delete("/tallas/:id", checkRole(["rol_admin"]), deleteTalla);
router.post("/:tabla",       checkRole(["rol_admin","rol_gestor_inventario"]), createCatalogoItem);
router.delete("/:tabla/:id", checkRole(["rol_admin"]), deleteCatalogoItem);

// ── Monitor DB ──
router.get("/monitor/activity",   checkRole(["rol_admin"]), getActivity);
router.get("/monitor/locks",      checkRole(["rol_admin"]), getLocks);
router.post("/monitor/kill",      checkRole(["rol_admin"]), killProcess);
router.post("/monitor/explain",   checkRole(["rol_admin"]), runExplain);
router.get("/monitor/health",     checkRole(["rol_admin"]), getHealth);
router.get("/monitor/autovacuum", checkRole(["rol_admin"]), getAutovacuum);

export default router;