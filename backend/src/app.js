import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet"; 
import xss from "xss-clean"; 
import rateLimit from "express-rate-limit"; 
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: true, 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(helmet());
app.use(express.json());
app.use(xss()); 

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor backend en puerto ${PORT}`)
);