import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhookSignature } from "@/lib/paypal/webhooks";
import { 
  getOrderByPayPalOrderId, 
  updateOrder, 
  updateBudgetSpend, 
  logAuditEvent 
} from "@/lib/db/schema";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    const authAlgo = req.headers.get("paypal-auth-algo") || "";
    const certUrl = req.headers.get("paypal-cert-url") || "";
    const transmissionId = req.headers.get("paypal-transmission-id") || "";
    const transmissionSig = req.headers.get("paypal-transmission-sig") || "";
    const transmissionTime = req.headers.get("paypal-transmission-time") || "";
    const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID || "";

    // 1. Verify signature
    const isValid = await verifyPayPalWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookId: configuredWebhookId,
      webhookEvent: rawBody,
    });

    if (!isValid) {
      logAuditEvent(
        "WEBHOOK_REJECTED",
        "PayPal webhook signature verification failed",
        { transmissionId, eventType: rawBody.event_type },
        "WARN"
      );
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const eventType = rawBody.event_type;
    const resource = rawBody.resource || {};

    logAuditEvent(
      "WEBHOOK_RECEIVED",
      `Received valid PayPal webhook: ${eventType}`,
      { eventType, resourceId: resource.id, transmissionId },
      "INFO"
    );

    // 2. Handle specific webhook events
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const captureId = resource.id;
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      const amount = parseFloat(resource.amount?.value || "0");

      if (orderId) {
        const order = getOrderByPayPalOrderId(orderId);
        if (order && order.status !== "CAPTURED") {
          updateOrder(order.id, {
            status: "CAPTURED",
            paypal_capture_id: captureId,
            captured_at: new Date().toISOString(),
          });
          updateBudgetSpend(order.product_price);

          logAuditEvent(
            "WEBHOOK_CAPTURE_SYNC",
            `Webhook synced capture for '${order.product_title}' ($${order.product_price.toFixed(2)})`,
            { orderId: order.id, captureId, amount }
          );
        }
      }
    } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = resource.id;
      const refundAmount = parseFloat(resource.amount?.value || "0");

      // Find order by captureId
      const db = getDb();
      const order = db.prepare("SELECT * FROM orders WHERE paypal_capture_id = ?").get(captureId) as any;

      if (order) {
        updateOrder(order.id, {
          status: "REFUNDED",
          refunded_at: new Date().toISOString(),
        });
        // Reverse spent amount from budget ledger
        updateBudgetSpend(-refundAmount);

        logAuditEvent(
          "WEBHOOK_REFUND_SYNC",
          `Webhook synced refund of $${refundAmount.toFixed(2)} for '${order.product_title}'`,
          { orderId: order.id, captureId, refundAmount }
        );
      }
    }

    return NextResponse.json({ status: "success", received: true, eventType });
  } catch (err: any) {
    console.error("[PayPal Webhook] Error processing event:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
