import { NextRequest, NextResponse } from "next/server";
import { 
  getOrderByPayPalOrderId, 
  updateOrder, 
  updateBudgetSpend, 
  getCurrentBudgetLedger, 
  logAuditEvent 
} from "@/lib/db/schema";
import { capturePayPalOrder } from "@/lib/paypal/orders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: "Missing PayPal token (Order ID)" }, { status: 400 });
    }

    const order = getOrderByPayPalOrderId(token);
    if (!order) {
      return NextResponse.json({ error: `No internal order found for PayPal token ${token}` }, { status: 404 });
    }

    if (order.status === "CAPTURED") {
      return NextResponse.json({
        success: true,
        alreadyCaptured: true,
        order,
      });
    }

    try {
      const captureResult = await capturePayPalOrder(token);

      const capturedAt = new Date().toISOString();
      updateOrder(order.id, {
        paypal_capture_id: captureResult.captureId,
        status: "CAPTURED",
        captured_at: capturedAt,
      });

      updateBudgetSpend(order.product_price);
      const updatedLedger = getCurrentBudgetLedger();

      logAuditEvent(
        "PAYPAL_ORDER_CAPTURED",
        `Captured $${order.product_price.toFixed(2)} for '${order.product_title}' (PayPal Capture ID: ${captureResult.captureId})`,
        { orderId: order.id, paypalOrderId: token, captureId: captureResult.captureId, amount: order.product_price },
        "INFO",
        order.id
      );

      const updatedOrder = getOrderByPayPalOrderId(token);

      return NextResponse.json({
        success: true,
        captureId: captureResult.captureId,
        status: captureResult.status,
        order: updatedOrder,
        budget: updatedLedger,
      });
    } catch (err: any) {
      updateOrder(order.id, {
        status: "FAILED",
      });

      const isTimeout = err.message?.includes("timed out") || err.name === "TimeoutError";

      logAuditEvent(
        "PAYPAL_CAPTURE_FAILED",
        `Capture failed for '${order.product_title}': ${err.message}`,
        { orderId: order.id, paypalOrderId: token, error: err.message, isTimeout },
        "ERROR",
        order.id
      );

      const userFacingMessage = isTimeout
        ? "PayPal API timed out while capturing payment. Please verify your connection and try again."
        : `Payment capture failed: ${err.message}. No funds were deducted from your budget.`;

      return NextResponse.json(
        { 
          error: userFacingMessage,
          code: isTimeout ? "GATEWAY_TIMEOUT" : "CAPTURE_FAILED",
          orderId: order.id,
        },
        { status: isTimeout ? 504 : 422 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process capture request" }, { status: 500 });
  }
}
