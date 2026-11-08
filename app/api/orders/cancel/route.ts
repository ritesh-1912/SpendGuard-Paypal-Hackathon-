import { NextRequest, NextResponse } from "next/server";
import { getOrderByPayPalOrderId, updateOrder, logAuditEvent } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = (body.token || "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing PayPal token" }, { status: 400 });
    }

    const order = getOrderByPayPalOrderId(token);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "CAPTURED") {
      updateOrder(order.id, {
        status: "CANCELLED",
      });

      logAuditEvent(
        "ORDER_CANCELLED",
        `Buyer cancelled checkout at PayPal for '${order.product_title}' ($${order.product_price.toFixed(2)})`,
        { orderId: order.id, paypalOrderId: token },
        "INFO",
        order.id
      );
    }

    return NextResponse.json({
      success: true,
      message: "Checkout session cancelled successfully. No funds were captured.",
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to cancel order" }, { status: 500 });
  }
}
