import { getPayPalAccessToken } from "./auth";
import { PayPalOrderResponse, PayPalCaptureResponse } from "./types";

export interface CreateOrderParams {
  internalOrderId: string;
  title: string;
  amount: number;
  currency?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateOrderResult {
  paypalOrderId: string;
  approveUrl: string;
  status: string;
}

export interface CaptureOrderResult {
  captureId: string;
  status: string;
  rawResponse: PayPalCaptureResponse;
}

function getBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT || "sandbox";
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function createPayPalOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const isMock = process.env.MOCK_PAYPAL_CAPTURE === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const returnUrl = params.returnUrl || `${appUrl}/checkout/success`;
  const cancelUrl = params.cancelUrl || `${appUrl}/checkout/cancel`;

  if (isMock) {
    const mockId = `MOCK_ORDER_${Date.now()}`;
    return {
      paypalOrderId: mockId,
      approveUrl: `${returnUrl}?token=${mockId}&mock=true`,
      status: "CREATED",
    };
  }

  const token = await getPayPalAccessToken();
  const baseUrl = getBaseUrl();

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: params.internalOrderId,
        description: params.title.substring(0, 127),
        amount: {
          currency_code: params.currency || "USD",
          value: params.amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "SpendGuard",
      landing_page: "LOGIN",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `spendguard_${params.internalOrderId}_${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create PayPal order (${response.status}): ${errText}`);
  }

  const orderData = (await response.json()) as PayPalOrderResponse;
  const approveLink = orderData.links.find((l) => l.rel === "approve");

  if (!approveLink) {
    throw new Error("PayPal created the order but did not return an approval link.");
  }

  return {
    paypalOrderId: orderData.id,
    approveUrl: approveLink.href,
    status: orderData.status,
  };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<CaptureOrderResult> {
  const isMock = process.env.MOCK_PAYPAL_CAPTURE === "true" || paypalOrderId.startsWith("MOCK_ORDER_");

  if (isMock) {
    const mockCaptureId = `MOCK_CAP_${Date.now()}`;
    return {
      captureId: mockCaptureId,
      status: "COMPLETED",
      rawResponse: {
        id: paypalOrderId,
        status: "COMPLETED",
      },
    };
  }

  const token = await getPayPalAccessToken();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `capture_${paypalOrderId}_${Date.now()}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to capture PayPal order ${paypalOrderId} (${response.status}): ${errText}`);
  }

  const captureData = (await response.json()) as PayPalCaptureResponse;
  const captureItem = captureData.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = captureItem?.id || captureData.id;

  return {
    captureId: captureId,
    status: captureData.status,
    rawResponse: captureData,
  };
}
