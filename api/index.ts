// Vercel serverless entry point.
//
// On Vercel the app is split into a static frontend (built by `vite build`
// into dist/public) and this single serverless function, which handles every
// /api/* and /manus-storage/* request. vercel.json rewrites route those paths
// here while preserving the original URL, so the Express router below matches
// exactly as it does in local development.
//
// An Express app is itself a (req, res) handler, so exporting it as the default
// export is all @vercel/node needs.
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
