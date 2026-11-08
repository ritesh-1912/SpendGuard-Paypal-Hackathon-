import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, logAuditEvent } from "@/lib/db/schema";
import { createPayPalOrder } from "@/lib/paypal/orders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "CAPTURED") {
      return NextResponse.json({ error: "Order is already captured" }, { status: 400 });
    }

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      internalOrderId: order.id,
      title: order.product_title,
      amount: order.product_price,
      currency: order.currency,
    });

    updateOrder(order.id, {
      status: "CREATED",
      paypal_order_id: paypalOrder.paypalOrderId,
    });

    logAuditEvent(
      "HUMAN_APPROVED",
      `User approved purchase of '${order.product_title}' ($${order.product_price.toFixed(2)})`,
      { orderId: order.id, paypalOrderId: paypalOrder.paypalOrderId, approveUrl: paypalOrder.approveUrl },
      "INFO",
      order.id
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paypalOrderId: paypalOrder.paypalOrderId,
      approveUrl: paypalOrder.approveUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
