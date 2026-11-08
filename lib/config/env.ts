export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function getAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = (
    env.APP_URL ||
    env.RENDER_EXTERNAL_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const isProduction = env.NODE_ENV === "production";
  const isMockPayPal = !isProduction && env.MOCK_PAYPAL_CAPTURE === "true";
  const hasOfflineProdOverride =
    env.ALLOW_OFFLINE_IN_PROD === "true" || env.ALLOW_DEMO_OFFLINE_IN_PROD === "true";
  const isOfflineDemo = env.DEMO_OFFLINE === "true";

  if (isProduction) {
    if (env.MOCK_PAYPAL_CAPTURE === "true") {
      missing.push("MOCK_PAYPAL_CAPTURE (cannot be enabled in production; mock payments are restricted to test environments)");
    }

    if (isOfflineDemo && !hasOfflineProdOverride) {
      missing.push("DEMO_OFFLINE (cannot be enabled in production without explicit override; set ALLOW_OFFLINE_IN_PROD=true or configure live API keys)");
    }
  }

  if (!isMockPayPal) {
    if (!env.PAYPAL_CLIENT_ID || env.PAYPAL_CLIENT_ID.trim() === "") {
      missing.push("PAYPAL_CLIENT_ID");
    }
    if (!env.PAYPAL_CLIENT_SECRET || env.PAYPAL_CLIENT_SECRET.trim() === "") {
      missing.push("PAYPAL_CLIENT_SECRET");
    }
  }

  const appUrl = env.APP_URL || env.RENDER_EXTERNAL_URL || env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.trim() === "") {
    missing.push("APP_URL (or NEXT_PUBLIC_APP_URL)");
  }

  if (!isOfflineDemo || (isProduction && !hasOfflineProdOverride)) {
    if (!env.CHANNEL3_API_KEY || env.CHANNEL3_API_KEY.trim() === "") {
      missing.push("CHANNEL3_API_KEY");
    }
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === "") {
      missing.push("GEMINI_API_KEY");
    }
  }

  if (!env.PAYPAL_WEBHOOK_ID || env.PAYPAL_WEBHOOK_ID.trim() === "") {
    warnings.push("PAYPAL_WEBHOOK_ID is not configured. Webhook signature validation will reject incoming webhooks.");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function validateEnvironmentOrThrow(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateEnvironment(env);
  if (!result.valid) {
    throw new Error(
      `Startup check failed. Missing or invalid required environment variable(s): ${result.missing.join(", ")}.`
    );
  }
}
