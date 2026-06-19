// Vercel serverless entry point.
//
// This file is built as CommonJS (see api/package.json) so @vercel/node bundles
// it and all of its relative imports into a single function file. The static
// imports below are therefore inlined at build time — no runtime module
// resolution of ../server/* paths, which is what failed under native ESM.
import express, { type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dependency-free health check — confirms the function initializes.
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
