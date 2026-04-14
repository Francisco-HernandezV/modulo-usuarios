import "dotenv/config";
import express from "express";
import cors    from "cors";
import helmet  from "helmet";
import rateLimit from "express-rate-limit";
import cron from "node-cron"; // 🔥 IMPORTAMOS NODE-CRON
import pool from "./config/db.js"; // 🔥 IMPORTAMOS LA BD PARA EL REINICIO AUTOMÁTICO
import { resetStats } from "./controllers/monitorController.js";
import userRoutes  from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import ventasRoutes from "./routes/ventasRoutes.js";
import { raspProtection } from "./middlewares/rasp.js";

const app = express();

app.set("trust proxy", 1);
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProduction ? process.env.BASE_URL : "http://localhost:5173",
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


// Reiniciar la VISTA de las gráficas a la medianoche (Lógica interna)
cron.schedule("0 0 * * *", () => {
  console.log("⏳ [CRON] Reiniciando vista de estadísticas para el nuevo día...");
  // Llamamos a resetStats pero sin req/res (solo la lógica)
  resetStats({ body: {} }, { json: () => {} }); 
}, {
  timezone: "America/Mexico_City"
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor backend en puerto ${PORT}`)
);