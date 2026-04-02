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
  getActivity, getLocks, killProcess, runExplain, getHealth, getAutovacuum 
} from "../controllers/monitorController.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
router.get   ("/categorias",      getCategorias);
router.post  ("/categorias",      createCategoria);
router.put   ("/categorias/:id",  updateCategoria);
router.delete("/categorias/:id",  deleteCategoria);
router.get   ("/productos",       getProductos);
router.post  ("/productos",       createProducto);
router.post  ("/productos/importar", upload.single('archivo'), importarProductos); 
router.put   ("/productos/:id",   updateProducto);
router.delete("/productos/:id",   deleteProducto);
router.put   ("/productos/:id",   updateProducto);
router.delete("/productos/:id",   deleteProducto);
router.get   ("/clientes",        getClientes);
router.post  ("/clientes",        createCliente);
router.put   ("/clientes/:id",    updateCliente);
router.delete("/clientes/:id",    deleteCliente);
router.get   ("/inventario",      getInventario);
router.post  ("/inventario",      createVariante);
router.put   ("/inventario/:id",  updateVariante);
router.get("/respaldos", getHistorialRespaldos);
router.get("/respaldos/generar", generarRespaldo);
router.get("/monitor/activity", getActivity);
router.get("/monitor/locks", getLocks);
router.post("/monitor/kill", killProcess);
router.post("/monitor/explain", runExplain);
router.get("/monitor/health", getHealth);
router.get("/monitor/autovacuum", getAutovacuum);
export default router;