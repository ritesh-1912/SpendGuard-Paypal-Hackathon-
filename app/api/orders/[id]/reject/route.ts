import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, logAuditEvent } from "@/lib/db/schema";

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

    updateOrder(order.id, {
      status: "REJECTED",
    });

    logAuditEvent(
      "HUMAN_REJECTED",
      `User rejected purchase of '${order.product_title}' ($${order.product_price.toFixed(2)})`,
      { orderId: order.id, productTitle: order.product_title, price: order.product_price },
      "INFO",
      order.id
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: "REJECTED",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
