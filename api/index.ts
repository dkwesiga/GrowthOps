// Vercel serverless entry point.
//
// Static top-level imports let esbuild bundle everything at build time so
// Vercel never has to resolve modules at runtime. The try/catch around
// route setup still surfaces any initialization error in the HTTP response.

import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

let app: ReturnType<typeof express> | null = null;
let initError: Error | null = null;

try {
  app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );
} catch (err: any) {
  console.error("[api] setup failed:", err);
  initError = err;
}

export default function handler(req: any, res: any) {
  if (initError || !app) {
    console.error("[api] handler called but app failed to init:", initError);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        initError: String(initError?.message ?? "App failed to initialize"),
        code: (initError as any)?.code ?? null,
        stack: String(initError?.stack ?? "").split("\n").slice(0, 8),
      })
    );
    return;
  }
  app(req, res);
}
