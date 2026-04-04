import express from "express";
import multer from "multer";
import {
  getCategorias, createCategoria, updateCategoria, deleteCategoria,
  getProductos, createProducto, updateProducto, deleteProducto, createProductoCompleto, // 🔥 Importamos la nueva función
  getClientes, createCliente, updateCliente, deleteCliente,
  getInventario, createVariante, updateVariante, deleteVariante,
  importarProductos,
  getMarcas, getDepartamentos, getColores,
  getTallas, getTiposTalla, createTalla, deleteTalla,
  createCatalogoItem, deleteCatalogoItem,
} from "../controllers/adminController.js";

import { generarRespaldo, getHistorialRespaldos } from "../controllers/respaldosController.js";
import { getActivity, getLocks, killProcess, runExplain, getHealth, getAutovacuum } from "../controllers/monitorController.js";
import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// ── Rutas públicas ────────────────────────────────────────────────────────
router.get("/categorias", getCategorias);
router.get("/productos",  getProductos);
router.get("/respaldos/generar", generarRespaldo);

// ── Middleware de autenticación ───────────────────────────────────────────
router.use(verifyToken);

// Categorías
router.post("/categorias",    checkRole(["rol_admin","rol_gestor_inventario"]), createCategoria);
router.put("/categorias/:id", checkRole(["rol_admin","rol_gestor_inventario"]), updateCategoria);
router.delete("/categorias/:id", checkRole(["rol_admin"]), deleteCategoria);

// Productos
// 🔥 NUEVA RUTA: Recibe todo el paquete del Wizard
router.post("/productos/completo", checkRole(["rol_admin","rol_gestor_inventario"]), createProductoCompleto);

router.post("/productos",     checkRole(["rol_admin","rol_gestor_inventario"]), createProducto);
router.put("/productos/:id",  checkRole(["rol_admin","rol_gestor_inventario"]), updateProducto);
router.delete("/productos/:id", checkRole(["rol_admin"]), deleteProducto);
router.post("/productos/importar", checkRole(["rol_admin"]), upload.single("archivo"), importarProductos);

// Inventario
router.get("/inventario",     checkRole(["rol_admin","rol_gestor_inventario","rol_vendedor"]), getInventario);
router.put("/inventario/:id", checkRole(["rol_admin","rol_gestor_inventario"]), updateVariante);
router.delete("/inventario/:id", checkRole(["rol_admin"]), deleteVariante); // 🔥 Nueva ruta para eliminar


// Clientes
router.get("/clientes",      checkRole(["rol_admin","rol_vendedor"]), getClientes);
router.post("/clientes",     checkRole(["rol_admin","rol_vendedor"]), createCliente);
router.put("/clientes/:id",  checkRole(["rol_admin","rol_vendedor"]), updateCliente);
router.delete("/clientes/:id", checkRole(["rol_admin"]), deleteCliente);

// Respaldos
router.get("/respaldos", checkRole(["rol_admin"]), getHistorialRespaldos);

// Lectura de catálogos base
router.get("/marcas",       getMarcas);
router.get("/departamentos", getDepartamentos);
router.get("/colores",      getColores);
router.get("/tipos-talla",  getTiposTalla);
router.get("/tallas",       getTallas);

// ⚠️ Rutas específicas de tallas ANTES del catch-all /:tabla
router.post("/tallas",       checkRole(["rol_admin","rol_gestor_inventario"]), createTalla);
router.delete("/tallas/:id", checkRole(["rol_admin"]), deleteTalla);

// Catch-all dinámico para marcas, departamentos y colores
router.post("/:tabla",       checkRole(["rol_admin","rol_gestor_inventario"]), createCatalogoItem);
router.delete("/:tabla/:id", checkRole(["rol_admin"]), deleteCatalogoItem);

// Monitor DB
router.get("/monitor/activity",   checkRole(["rol_admin"]), getActivity);
router.get("/monitor/locks",      checkRole(["rol_admin"]), getLocks);
router.post("/monitor/kill",      checkRole(["rol_admin"]), killProcess);
router.post("/monitor/explain",   checkRole(["rol_admin"]), runExplain);
router.get("/monitor/health",     checkRole(["rol_admin"]), getHealth);
router.get("/monitor/autovacuum", checkRole(["rol_admin"]), getAutovacuum);

export default router;