import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import catalogRoutes from "./routes/catalog.js";
import vendorRoutes from "./routes/vendor.js";
import ordersRoutes from "./routes/orders.js";
import reportsRoutes from "./routes/reports.js";
import { initIO } from "./lib/io.js";
import { startDemoSimulation } from "./lib/demoSim.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

/** Allow localhost + 127.0.0.1 (browsers treat them as different CORS origins) */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (CLIENT_ORIGIN && origin === CLIENT_ORIGIN.replace(/\/$/, "")) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

if (!CLIENT_ORIGIN) {
  console.warn("CLIENT_ORIGIN is not set — using localhost/127.0.0.1 allowlist");
}
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) {
        cb(null, origin || CLIENT_ORIGIN || "http://localhost:5173");
        return;
      }
      cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});
initIO(io);

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) {
        // Reflect request origin when credentials are used
        cb(null, origin || CLIENT_ORIGIN || "http://localhost:5173");
        return;
      }
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "nextgen-server" });
});

app.use("/auth", authRoutes);
app.use("/catalog", catalogRoutes);
app.use("/products", productsRoutes);
app.use("/vendor", vendorRoutes);
app.use("/vendor/reports", reportsRoutes);
app.use("/orders", ordersRoutes);

io.on("connection", (socket) => {
  socket.join("listings");
  socket.join("products");

  socket.on("join-vendor", (vendorId: string) => {
    if (typeof vendorId === "string" && vendorId.length > 0) {
      socket.join(`vendor:${vendorId}`);
    }
  });

  socket.on("join-customer", (customerId: string) => {
    if (typeof customerId === "string" && customerId.length > 0) {
      socket.join(`customer:${customerId}`);
    }
  });

  socket.on("disconnect", () => {
    /* no-op */
  });
});

httpServer.listen(PORT, () => {
  console.log(`NextGen Commerce API listening on :${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN ?? "(none)"}`);
  startDemoSimulation();
});
