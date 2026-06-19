export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM provider (OpenRouter). Falls back to the legacy forge vars for
  // backward compatibility so existing deployments keep working.
  forgeApiUrl:
    process.env.OPENROUTER_API_URL ?? process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey:
    process.env.OPENROUTER_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Default model used when a caller does not specify one. OpenRouter requires
  // an explicit model on every request.
  llmModel: process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",
  // Optional attribution headers OpenRouter uses for rankings/analytics.
  llmReferer: process.env.OPENROUTER_REFERER ?? "https://growthops.ai",
  llmTitle: process.env.OPENROUTER_TITLE ?? "GrowthOps AI",
};
