import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import router from "./routes";

const app: Express = express();

app.disable("x-powered-by");

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const configuredAllowedOrigins = (
  process.env.ALLOWED_ORIGINS ??
  process.env.CORS_ORIGINS ??
  ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  configuredAllowedOrigins.length > 0
    ? configuredAllowedOrigins
    : defaultAllowedOrigins,
);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

export default app;
