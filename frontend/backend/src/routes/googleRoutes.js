import express from "express";
import { loginConGoogle } from "../controllers/googleController.js";

const router = express.Router();

router.post("/google", loginConGoogle);

export default router;
