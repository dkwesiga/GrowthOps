// Vercel serverless entry point.
//
// All real imports are deferred into buildApp() inside a try/catch so that any
// initialization/import failure is surfaced in the HTTP response body instead
// of collapsing into an opaque FUNCTION_INVOCATION_FAILED. The module itself
// has no top-level side effects.

let appPromise: Promise<(req: unknown, res: unknown) => void> | null = null;

async function buildApp() {
  const express = (await import("express")).default;
  const { createExpressMiddleware } = await import(
    "@trpc/server/adapters/express"
  );
  const { registerOAuthRoutes } = await import("../server/_core/oauth");
  const { registerStorageProxy } = await import("../server/_core/storageProxy");
  const { appRouter } = await import("../server/routers");
  const { createContext } = await import("../server/_core/context");

  const app = express();
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

  return app as unknown as (req: unknown, res: unknown) => void;
}

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) appPromise = buildApp();
    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    appPromise = null; // let the next invocation retry initialization
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        initError: String(err?.message ?? err),
        stack: String(err?.stack ?? ""),
      })
    );
  }
}
