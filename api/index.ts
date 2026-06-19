// Vercel serverless entry point.
//
// On Vercel the app is split into a static frontend (built by `vite build`
// into dist/public) and this single serverless function, which handles every
// /api/* and /manus-storage/* request. vercel.json rewrites route those paths
// here while preserving the original URL, so the Express router below matches
// exactly as it does in local development.
//
// We export an explicit (req, res) handler that delegates to the Express app,
// rather than exporting the app directly — @vercel/node invokes the default
// export as a plain request handler, and this leaves no ambiguity.
import express, { type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dependency-free health check — no tRPC/DB/context — useful to confirm the
// function initializes and to identify which deployment is live.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
