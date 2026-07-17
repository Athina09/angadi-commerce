import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express, { type Express } from "express";
import cors from "cors";
import { createServer, type Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import authRoutes from "./routes/auth.js";
import productsRoutes from "./routes/products.js";
import catalogRoutes from "./routes/catalog.js";
import vendorRoutes from "./routes/vendor.js";
import ordersRoutes from "./routes/orders.js";
import reportsRoutes from "./routes/reports.js";
import { initIO } from "./lib/io.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

/** Allow localhost, configured origin, and Vercel preview/production URLs */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (CLIENT_ORIGIN && origin === CLIENT_ORIGIN.replace(/\/$/, "")) return true;
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export type CreateAppOptions = {
  /** Skip Socket.IO + demo sim (Vercel serverless) */
  serverless?: boolean;
};

export type CreateAppResult = {
  app: Express;
  httpServer?: HttpServer;
  io?: SocketServer;
};

function requireEnv(): { jwtSecret: string; databaseUrl: string } | null {
  const jwtSecret = process.env.JWT_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  if (!jwtSecret || !databaseUrl) return null;
  return { jwtSecret, databaseUrl };
}

export function createApp(options: CreateAppOptions = {}): CreateAppResult {
  const { serverless = false } = options;

  if (!CLIENT_ORIGIN && !serverless) {
    console.warn("CLIENT_ORIGIN is not set — using localhost/127.0.0.1 allowlist");
  }

  const app = express();
  let httpServer: HttpServer | undefined;
  let io: SocketServer | undefined;

  if (!serverless) {
    httpServer = createServer(app);
    io = new SocketServer(httpServer, {
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

      socket.on("join-product", (productId: string) => {
        if (typeof productId === "string" && productId.length > 0) {
          socket.join(`product:${productId}`);
        }
      });

      socket.on("leave-product", (productId: string) => {
        if (typeof productId === "string" && productId.length > 0) {
          socket.leave(`product:${productId}`);
        }
      });
    });
  }

  app.use(
    cors({
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) {
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
    const env = requireEnv();
    res.status(env ? 200 : 503).json({
      status: env ? "ok" : "misconfigured",
      service: "angadi-server",
      serverless,
      missing: env
        ? []
        : [
            ...(!process.env.JWT_SECRET ? ["JWT_SECRET"] : []),
            ...(!process.env.DATABASE_URL ? ["DATABASE_URL"] : []),
          ],
    });
  });

  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    if (!requireEnv()) {
      res.status(503).json({
        error: "Server misconfigured",
        message: "Set JWT_SECRET and DATABASE_URL in environment variables",
      });
      return;
    }
    next();
  });

  app.use("/auth", authRoutes);
  app.use("/catalog", catalogRoutes);
  app.use("/products", productsRoutes);
  app.use("/vendor", vendorRoutes);
  app.use("/vendor/reports", reportsRoutes);
  app.use("/orders", ordersRoutes);

  return { app, httpServer, io };
}
