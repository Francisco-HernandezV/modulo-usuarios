import express from "express";
import multer from "multer";
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  getInventario,
  createVariante,
  updateVariante,
  importarProductos,
} from "../controllers/adminController.js";

import {
  generarRespaldo,
  getHistorialRespaldos,
} from "../controllers/respaldosController.js";

import {
  getActivity,
  getLocks,
  killProcess,
  runExplain,
  getHealth,
  getAutovacuum,
} from "../controllers/monitorController.js";

import { verifyToken, checkRole } from "../middlewares/authMiddleware.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.get("/categorias", getCategorias);
router.get("/productos", getProductos);
router.use(verifyToken);
router.post(
  "/categorias",
  checkRole(["rol_admin", "rol_gestor_inventario"]),
  createCategoria
);
router.put(
  "/categorias/:id",
  checkRole(["rol_admin", "rol_gestor_inventario"]),
  updateCategoria
);
router.delete("/categorias/:id", checkRole(["rol_admin"]), deleteCategoria);
router.post(
  "/productos",
  checkRole(["rol_admin", "rol_gestor_inventario"]),
  createProducto
);
router.put(
  "/productos/:id",
  checkRole(["rol_admin", "rol_gestor_inventario"]),
  updateProducto
);
router.delete("/productos/:id", checkRole(["rol_admin"]), deleteProducto);

router.post(
  "/productos/importar",
  checkRole(["rol_admin"]),
  upload.single("archivo"),
  importarProductos
);

router.get(
  "/inventario",
  checkRole(["rol_admin", "rol_gestor_inventario", "rol_vendedor"]),
  getInventario
);
router.post(
  "/inventario",
  checkRole(["rol_admin", "rol_gestor_inventario"]),
  createVariante
);
router.put(
  "/inventario/:id",
  checkRole(["rol_admin", "rol_gestor_inventario"]),
  updateVariante
);

router.get(
  "/clientes",
  checkRole(["rol_admin", "rol_vendedor"]),
  getClientes
);
router.post(
  "/clientes",
  checkRole(["rol_admin", "rol_vendedor"]),
  createCliente
);
router.put(
  "/clientes/:id",
  checkRole(["rol_admin", "rol_vendedor"]),
  updateCliente
);
router.delete("/clientes/:id", checkRole(["rol_admin"]), deleteCliente);
router.get("/respaldos", checkRole(["rol_admin"]), getHistorialRespaldos);
router.get("/respaldos/generar", checkRole(["rol_admin"]), generarRespaldo);

router.get("/monitor/activity", checkRole(["rol_admin"]), getActivity);
router.get("/monitor/locks", checkRole(["rol_admin"]), getLocks);
router.post("/monitor/kill", checkRole(["rol_admin"]), killProcess);
router.post("/monitor/explain", checkRole(["rol_admin"]), runExplain);
router.get("/monitor/health", checkRole(["rol_admin"]), getHealth);
router.get("/monitor/autovacuum", checkRole(["rol_admin"]), getAutovacuum);

export default router;