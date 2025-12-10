import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import googleRoutes from "./routes/googleRoutes.js";
import helmet from "helmet";
import xss from "xss-clean"; // <-- ELIMINADO: Causaba el error 500 en Node 22
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://modulo-usuarios.vercel.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(helmet());
app.use(xss()); // <-- ELIMINADO: Ya no es necesario ni compatible

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