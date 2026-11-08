import { NextRequest, NextResponse } from "next/server";
import { getActivePolicy, getCurrentBudgetLedger, getRecentOrders, logAuditEvent } from "@/lib/db/schema";
import { evaluatePurchaseProposal } from "@/lib/policy/engine";
import { PurchaseProposal } from "@/lib/policy/types";

export async function POST(req: NextRequest) {
  try {
    const proposal = (await req.json()) as PurchaseProposal;

    if (!proposal || !proposal.price || !proposal.productId) {
      return NextResponse.json({ error: "Invalid product proposal payload" }, { status: 400 });
    }

    const activePolicy = getActivePolicy();
    if (!activePolicy) {
      return NextResponse.json({ error: "No active spending policy configured" }, { status: 500 });
    }

    const ledger = getCurrentBudgetLedger();
    const recentOrders = getRecentOrders(activePolicy.policy.allowDuplicatesWithinDays || 7);

    const evaluation = evaluatePurchaseProposal(proposal, activePolicy.policy, {
      currentMonthSpent: ledger.total_spent,
      recentOrders,
    });

    logAuditEvent(
      "POLICY_EVALUATION",
      `Evaluated '${proposal.productTitle}' ($${proposal.price}) -> ${evaluation.decision}`,
      { proposal, evaluation },
      evaluation.decision === "BLOCKED" ? "WARN" : "INFO"
    );

    return NextResponse.json({
      success: true,
      proposal,
      evaluation,
      budget: {
        totalSpent: ledger.total_spent,
        budgetLimit: ledger.budget_limit,
        remaining: Math.max(0, ledger.budget_limit - ledger.total_spent),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
