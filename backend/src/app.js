import "dotenv/config";
import express from "express";
import cors    from "cors";
import helmet  from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import pool from "./config/db.js";
import { resetStats } from "./controllers/monitorController.js";

import userRoutes  from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import ventasRoutes from "./routes/ventasRoutes.js";
import { raspProtection } from "./middlewares/rasp.js";

const app = express();

app.set("trust proxy", 1);
const isProduction = process.env.NODE_ENV === 'production';

// 🔥 CONFIGURACIÓN DE CORS REFORZADA
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173", process.env.BASE_URL].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(helmet());
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(raspProtection);

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ventas", ventasRoutes);
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("⏳ [CRON] Guardando punto de control de estadísticas diario...");
    await resetStats();
  } catch (error) {
    console.error("❌ [CRON] Error en el reinicio automático:", error);
  }
}, {
  scheduled: true,
  timezone: "America/Mexico_City"
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor backend en puerto ${PORT}`)
);