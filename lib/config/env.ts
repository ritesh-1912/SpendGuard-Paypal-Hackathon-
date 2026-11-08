export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const isMockPayPal = env.MOCK_PAYPAL_CAPTURE === "true";
  const isOfflineDemo = env.DEMO_OFFLINE === "true";

  if (!isMockPayPal) {
    if (!env.PAYPAL_CLIENT_ID || env.PAYPAL_CLIENT_ID.trim() === "") {
      missing.push("PAYPAL_CLIENT_ID");
    }
    if (!env.PAYPAL_CLIENT_SECRET || env.PAYPAL_CLIENT_SECRET.trim() === "") {
      missing.push("PAYPAL_CLIENT_SECRET");
    }
  }

  if (!env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL.trim() === "") {
    missing.push("NEXT_PUBLIC_APP_URL");
  }

  if (!isOfflineDemo) {
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
      `Startup check failed. Missing required environment variable(s): ${result.missing.join(", ")}. Please configure them in your environment or set DEMO_OFFLINE=true.`
    );
  }
}
