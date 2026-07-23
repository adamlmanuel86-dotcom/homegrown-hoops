import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const ALLOWED_ORIGINS = [
  "https://homegrown-hoops.vercel.app",
  // Additional origins from env (comma-separated), e.g. Railway preview URLs
  ...(process.env.CORS_EXTRA_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, mobile, curl)
      if (!origin) return callback(null, true);
      // Always allow any Replit or localhost origin in development
      if (
        origin.includes(".replit.dev") ||
        origin.includes(".repl.co") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1") ||
        ALLOWED_ORIGINS.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin not allowed — ${origin}`));
    },
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  clerkMiddleware((req) => ({
    proxyUrl: (() => {
      const host = getClerkProxyHost(req);
      if (!host) return undefined;
      const protocol = req.headers["x-forwarded-proto"] || "https";
      return `${protocol}://${host}${CLERK_PROXY_PATH}`;
    })(),
  })),
);

app.use("/api", router);

export default app;
