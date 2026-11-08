import { NextRequest, NextResponse } from "next/server";
import { 
  getActivePolicy, 
  getCurrentBudgetLedger, 
  getRecentOrders, 
  insertOrder, 
  updateOrder, 
  getOrderByIdempotencyKey,
  logAuditEvent 
} from "@/lib/db/schema";
import { evaluatePurchaseProposal } from "@/lib/policy/engine";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { PurchaseProposal } from "@/lib/policy/types";
import { getAppUrl } from "@/lib/config/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const proposal = body.proposal as PurchaseProposal;
    const userConfirmed = Boolean(body.userConfirmed);
    const idempotencyKey = body.idempotencyKey || `prop_${proposal?.productId}_${proposal?.price}`;

    if (!proposal || !proposal.price || !proposal.productId) {
      return NextResponse.json({ error: "Invalid product proposal payload" }, { status: 400 });
    }

    // Idempotency: Return existing order if identical request was already created
    const existingOrder = getOrderByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      if (existingOrder.paypal_order_id && (existingOrder.status === "CREATED" || existingOrder.status === "APPROVED")) {
        const isProduction = process.env.NODE_ENV === "production";
        const isMock = !isProduction && (process.env.MOCK_PAYPAL_CAPTURE === "true" || existingOrder.paypal_order_id.startsWith("MOCK_ORDER_"));
        const appUrl = getAppUrl();
        const approveUrl = isMock
          ? `${appUrl}/checkout/success?token=${existingOrder.paypal_order_id}&mock=true`
          : `https://www.sandbox.paypal.com/checkoutnow?token=${existingOrder.paypal_order_id}`;

        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          paypalOrderId: existingOrder.paypal_order_id,
          approveUrl,
          idempotent: true,
        });
      }

      if (existingOrder.status === "PENDING_APPROVAL") {
        return NextResponse.json({
          success: true,
          needsApproval: true,
          orderId: existingOrder.id,
          idempotent: true,
        });
      }
    }

    const activePolicy = getActivePolicy();
    if (!activePolicy) {
      return NextResponse.json({ error: "No active spending policy configured" }, { status: 500 });
    }

    const ledger = getCurrentBudgetLedger();
    const recentOrders = getRecentOrders(activePolicy.policy.allowDuplicatesWithinDays || 7);

    // Deterministic gate: LLM proposes, pure code decides!
    const evaluation = evaluatePurchaseProposal(proposal, activePolicy.policy, {
      currentMonthSpent: ledger.total_spent,
      recentOrders,
    });

    if (evaluation.decision === "BLOCKED") {
      logAuditEvent(
        "ORDER_REJECTED",
        `Blocked attempt to buy '${proposal.productTitle}': ${evaluation.reason}`,
        { proposal, evaluation },
        "WARN"
      );
      return NextResponse.json(
        {
          error: "Purchase is blocked by your spending policy",
          evaluation,
        },
        { status: 403 }
      );
    }

    const internalOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (evaluation.decision === "NEEDS_APPROVAL" && !userConfirmed) {
      insertOrder({
        id: internalOrderId,
        idempotency_key: idempotencyKey,
        user_id: "demo_user",
        paypal_order_id: null,
        paypal_capture_id: null,
        product_id: proposal.productId,
        product_title: proposal.productTitle,
        product_price: proposal.price,
        currency: proposal.currency,
        category: proposal.category,
        merchant: proposal.merchantDomain,
        product_url: proposal.productUrl,
        product_image_url: proposal.imageUrl || null,
        decision: "NEEDS_APPROVAL",
        decision_reason: evaluation.reason,
        rule_fired: evaluation.ruleFired,
        status: "PENDING_APPROVAL",
      });

      logAuditEvent(
        "ORDER_ESCALATED",
        `Purchase of '${proposal.productTitle}' ($${proposal.price}) requires user approval: ${evaluation.reason}`,
        { internalOrderId, proposal, evaluation, idempotencyKey },
        "INFO",
        internalOrderId
      );

      return NextResponse.json({
        success: true,
        needsApproval: true,
        orderId: internalOrderId,
        evaluation,
        proposal,
      });
    }

    const initialStatus = "APPROVED";

    insertOrder({
      id: internalOrderId,
      idempotency_key: idempotencyKey,
      user_id: "demo_user",
      paypal_order_id: null,
      paypal_capture_id: null,
      product_id: proposal.productId,
      product_title: proposal.productTitle,
      product_price: proposal.price,
      currency: proposal.currency,
      category: proposal.category,
      merchant: proposal.merchantDomain,
      product_url: proposal.productUrl,
      product_image_url: proposal.imageUrl || null,
      decision: evaluation.decision,
      decision_reason: evaluation.reason,
      rule_fired: evaluation.ruleFired,
      status: initialStatus,
    });

    const paypalOrder = await createPayPalOrder({
      internalOrderId,
      title: proposal.productTitle,
      amount: proposal.price,
      currency: proposal.currency,
      idempotencyKey,
    });

    updateOrder(internalOrderId, {
      paypal_order_id: paypalOrder.paypalOrderId,
      status: "CREATED",
    });

    logAuditEvent(
      "PAYPAL_ORDER_CREATED",
      `Created PayPal Sandbox order ${paypalOrder.paypalOrderId} for '${proposal.productTitle}' ($${proposal.price})`,
      { internalOrderId, paypalOrderId: paypalOrder.paypalOrderId, approveUrl: paypalOrder.approveUrl, idempotencyKey },
      "INFO",
      internalOrderId
    );

    return NextResponse.json({
      success: true,
      orderId: internalOrderId,
      paypalOrderId: paypalOrder.paypalOrderId,
      approveUrl: paypalOrder.approveUrl,
      evaluation,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
