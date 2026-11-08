import { NextRequest, NextResponse } from "next/server";
import { getActivePolicy, getCurrentBudgetLedger, getRecentOrders, insertOrder, updateOrder, logAuditEvent } from "@/lib/db/schema";
import { evaluatePurchaseProposal } from "@/lib/policy/engine";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { PurchaseProposal } from "@/lib/policy/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const proposal = body.proposal as PurchaseProposal;
    const userConfirmed = Boolean(body.userConfirmed);

    if (!proposal || !proposal.price || !proposal.productId) {
      return NextResponse.json({ error: "Invalid product proposal payload" }, { status: 400 });
    }

    const activePolicy = getActivePolicy();
    if (!activePolicy) {
      return NextResponse.json({ error: "No active spending policy configured" }, { status: 500 });
    }

    const ledger = getCurrentBudgetLedger();
    const recentOrders = getRecentOrders(activePolicy.policy.allowDuplicatesWithinDays || 7);

    // Deterministic gate: LLM proposes, code decides!
    const evaluation = evaluatePurchaseProposal(proposal, activePolicy.policy, {
      currentMonthSpent: ledger.total_spent,
      recentOrders,
    });

    // 1. BLOCKED: Never call PayPal!
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

    // 2. NEEDS_APPROVAL: If user hasn't explicitly approved, return status for confirmation
    const internalOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (evaluation.decision === "NEEDS_APPROVAL" && !userConfirmed) {
      insertOrder({
        id: internalOrderId,
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
        { internalOrderId, proposal, evaluation },
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

    // 3. AUTO_APPROVE or User Confirmed: Stage order and create PayPal sandbox order
    const initialStatus = evaluation.decision === "AUTO_APPROVE" ? "APPROVED" : "APPROVED";

    insertOrder({
      id: internalOrderId,
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

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      internalOrderId,
      title: proposal.productTitle,
      amount: proposal.price,
      currency: proposal.currency,
    });

    updateOrder(internalOrderId, {
      paypal_order_id: paypalOrder.paypalOrderId,
      status: "CREATED",
    });

    logAuditEvent(
      "PAYPAL_ORDER_CREATED",
      `Created PayPal Sandbox order ${paypalOrder.paypalOrderId} for '${proposal.productTitle}' ($${proposal.price})`,
      { internalOrderId, paypalOrderId: paypalOrder.paypalOrderId, approveUrl: paypalOrder.approveUrl },
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
