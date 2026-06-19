import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { resolveSupabaseName, verifySupabaseToken } from "./supabaseAuth";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // Supabase Auth bridge: the client signs in with Supabase, then posts the
  // resulting access token here. We verify it with Supabase, upsert the user,
  // and mint our own session cookie so the rest of the app (protectedProcedure,
  // auth.me, auth.logout) works unchanged.
  app.post("/api/auth/supabase", async (req: Request, res: Response) => {
    const accessToken =
      typeof req.body?.accessToken === "string" ? req.body.accessToken : "";

    if (!accessToken) {
      res.status(400).json({ error: "accessToken is required" });
      return;
    }

    try {
      const sbUser = await verifySupabaseToken(accessToken);
      if (!sbUser?.id) {
        res.status(401).json({ error: "Invalid Supabase token" });
        return;
      }

      const name = resolveSupabaseName(sbUser);
      const now = new Date();

      await db.upsertUser({
        openId: sbUser.id,
        name,
        email: sbUser.email ?? null,
        loginMethod: sbUser.app_metadata?.provider ?? "email",
        lastSignedIn: now,
      });

      const sessionToken = await sdk.createSessionToken(sbUser.id, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[OAuth] Supabase bridge failed", error);
      res.status(500).json({ error: "Supabase auth bridge failed" });
    }
  });
}
