import { PayPalOAuthResponse } from "./types";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  // Return cached token if valid with 60 second buffer
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PayPal Sandbox credentials. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file."
    );
  }

  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  const baseUrl = environment === "live" 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

  // Create base64 encoded basic authorization header
  const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    // NEVER log secrets or full auth headers
    throw new Error(
      `PayPal OAuth authentication failed with status ${response.status}. Verify your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET. Details: ${errorText}`
    );
  }

  const data = (await response.json()) as PayPalOAuthResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken;
}
