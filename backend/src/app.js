import "dotenv/config";
import express from "express";
import cors    from "cors";
import helmet  from "helmet";
import rateLimit from "express-rate-limit";
import userRoutes  from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";  // ← NUEVO

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: true,
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

// ── Rutas ──────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);   // ← NUEVO  →  /api/admin/categorias, etc.

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor backend en puerto ${PORT}`)
);