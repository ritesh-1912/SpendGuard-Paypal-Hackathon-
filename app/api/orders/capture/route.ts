import { NextRequest, NextResponse } from "next/server";
import { getOrderByPayPalOrderId, updateOrder, updateBudgetSpend, getCurrentBudgetLedger, logAuditEvent } from "@/lib/db/schema";
import { capturePayPalOrder } from "@/lib/paypal/orders";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token; // PayPal Order ID

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

    // Call PayPal capture API
    const captureResult = await capturePayPalOrder(token);

    // Update order record
    const capturedAt = new Date().toISOString();
    updateOrder(order.id, {
      paypal_capture_id: captureResult.captureId,
      status: "CAPTURED",
      captured_at: capturedAt,
    });

    // Deduct from budget ledger
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
