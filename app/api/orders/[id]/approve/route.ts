import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, logAuditEvent } from "@/lib/db/schema";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { getAppUrl } from "@/lib/config/env";

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

    // Idempotency: If this pending order already has an active PayPal order, return it without creating another
    if (order.paypal_order_id && order.status === "CREATED") {
      const isMock = process.env.MOCK_PAYPAL_CAPTURE === "true" || order.paypal_order_id.startsWith("MOCK_ORDER_");
      const appUrl = getAppUrl();
      const approveUrl = isMock
        ? `${appUrl}/checkout/success?token=${order.paypal_order_id}&mock=true`
        : `https://www.sandbox.paypal.com/checkoutnow?token=${order.paypal_order_id}`;

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paypalOrderId: order.paypal_order_id,
        approveUrl,
        idempotent: true,
      });
    }

    const paypalOrder = await createPayPalOrder({
      internalOrderId: order.id,
      title: order.product_title,
      amount: order.product_price,
      currency: order.currency,
      idempotencyKey: `approve_${order.id}`,
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
