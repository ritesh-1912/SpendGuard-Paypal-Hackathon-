import { NextResponse } from "next/server";
import { getCurrentBudgetLedger, getActivePolicy, getRecentOrders, getAuditLogs } from "@/lib/db/schema";

export async function GET() {
  try {
    const policyData = getActivePolicy();
    const ledger = getCurrentBudgetLedger();
    const recentOrders = getRecentOrders(30);
    const auditLogs = getAuditLogs(20);

    const pendingOrders = recentOrders.filter((o) => o.status === "PENDING_APPROVAL");

    return NextResponse.json({
      success: true,
      budget: {
        limit: ledger.budget_limit,
        spent: ledger.total_spent,
        remaining: Math.max(0, ledger.budget_limit - ledger.total_spent),
      },
      policy: policyData?.policy,
      rawRules: policyData?.raw_rules,
      recentOrders,
      pendingOrders,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
