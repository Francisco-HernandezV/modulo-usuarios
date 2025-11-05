import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import connection from "./config/db.js";
import googleRoutes from "./routes/googleRoutes.js";

dotenv.config();

const app = express();

// ✅ Configuración CORS
const allowedOrigins = [
  "https://modulo-usuarios.vercel.app", // tu frontend en producción
  "http://localhost:5173"               // para desarrollo local
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// ✅ Rutas principales
app.use("/api/users", userRoutes);
app.use("/api/auth", googleRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor backend en puerto ${PORT}`));