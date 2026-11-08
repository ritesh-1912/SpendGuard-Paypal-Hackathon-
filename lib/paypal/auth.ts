import { PayPalOAuthResponse } from "./types";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PayPal credentials. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file."
    );
  }

  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  const baseUrl = environment === "live" 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

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
    throw new Error(
      `PayPal authentication failed with status ${response.status}. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET: ${errorText}`
    );
  }

  const data = (await response.json()) as PayPalOAuthResponse;
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken;
}
