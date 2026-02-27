import express from "express";
import {
  // Categorías
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  // Productos
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  // Clientes
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  // Inventario
  getInventario,
  createVariante,
  updateVariante,
} from "../controllers/adminController.js";

// ── Middleware ─────────────────────────────────────────────
// ⚠️  TEMPORAL: Sin autenticación para desarrollo / entregable febrero.
// TODO: Añadir verifyToken + requireAdmin antes de producción.
// Ejemplo:
//   import { verifyToken } from "../middlewares/authMiddleware.js";
//   router.use(verifyToken);

const router = express.Router();

// ── CATEGORÍAS ─────────────────────────────────────────────
router.get   ("/categorias",      getCategorias);
router.post  ("/categorias",      createCategoria);
router.put   ("/categorias/:id",  updateCategoria);
router.delete("/categorias/:id",  deleteCategoria);

// ── PRODUCTOS ──────────────────────────────────────────────
router.get   ("/productos",       getProductos);
router.post  ("/productos",       createProducto);
router.put   ("/productos/:id",   updateProducto);
router.delete("/productos/:id",   deleteProducto);

// ── CLIENTES ───────────────────────────────────────────────
router.get   ("/clientes",        getClientes);
router.post  ("/clientes",        createCliente);
router.put   ("/clientes/:id",    updateCliente);
router.delete("/clientes/:id",    deleteCliente);

// ── INVENTARIO (variantes_producto) ───────────────────────
router.get   ("/inventario",      getInventario);
router.post  ("/inventario",      createVariante);
router.put   ("/inventario/:id",  updateVariante);

export default router;