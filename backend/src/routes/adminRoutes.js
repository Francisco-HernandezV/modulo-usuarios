import express from "express";
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
} from "../controllers/adminController.js";
const router = express.Router();

router.get   ("/categorias",      getCategorias);
router.post  ("/categorias",      createCategoria);
router.put   ("/categorias/:id",  updateCategoria);
router.delete("/categorias/:id",  deleteCategoria);
router.get   ("/productos",       getProductos);
router.post  ("/productos",       createProducto);
router.put   ("/productos/:id",   updateProducto);
router.delete("/productos/:id",   deleteProducto);
router.get   ("/clientes",        getClientes);
router.post  ("/clientes",        createCliente);
router.put   ("/clientes/:id",    updateCliente);
router.delete("/clientes/:id",    deleteCliente);
router.get   ("/inventario",      getInventario);
router.post  ("/inventario",      createVariante);
router.put   ("/inventario/:id",  updateVariante);

export default router;