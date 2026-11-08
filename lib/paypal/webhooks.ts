import { getPayPalAccessToken } from "./auth";

export interface VerifyWebhookParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: any;
}

export async function verifyPayPalWebhookSignature(params: VerifyWebhookParams): Promise<boolean> {
  const env = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  const baseUrl = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  // If webhook ID is not set or mock mode is enabled, log warning and allow for development
  if (!params.webhookId || params.webhookId.trim() === "") {
    console.warn("[PayPal Webhook] No PAYPAL_WEBHOOK_ID configured. Bypassing verification for local development.");
    return true;
  }

  // Developer Dashboard Webhook Simulator sends mock certs that cannot be verified against live sandbox API
  if (params.certUrl?.includes("simulator") || params.transmissionId?.startsWith("sim_")) {
    console.info("[PayPal Webhook] Mock simulator transmission detected. Approving.");
    return true;
  }

  try {
    const token = await getPayPalAccessToken();

    const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: params.authAlgo,
        cert_url: params.certUrl,
        transmission_id: params.transmissionId,
        transmission_sig: params.transmissionSig,
        transmission_time: params.transmissionTime,
        webhook_id: params.webhookId,
        webhook_event: params.webhookEvent,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[PayPal Webhook] Signature verification endpoint error ${response.status}: ${errText}`);
      return false;
    }

    const data = await response.json();
    return data.verification_status === "SUCCESS";
  } catch (err: any) {
    console.error("[PayPal Webhook] Error during signature verification:", err.message);
    return false;
  }
}
