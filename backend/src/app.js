import "dotenv/config"; // 👈 IMPORTANTE: Esto va en la línea 1
import express from "express";
import cors from "cors";
// import dotenv from "dotenv"; // Ya no lo necesitamos aquí abajo
import userRoutes from "./routes/userRoutes.js";
import googleRoutes from "./routes/googleRoutes.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// dotenv.config(); // Lo movimos arriba del todo

const app = express();

// 🔹 Configuración de Proxy (Vital para Render)
app.set('trust proxy', 1);

// 🔹 Configuración CORS permisiva para depuración
app.use(cors({
  origin: true, // Acepta automáticamente el origen que hace la petición
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(helmet());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

app.use("/api/users", userRoutes);
app.use("/api/auth", googleRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor backend en puerto ${PORT}`)
);