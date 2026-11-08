import { NextRequest, NextResponse } from "next/server";
import { getActivePolicy, getCurrentBudgetLedger, logAuditEvent } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { Policy } from "@/lib/policy/types";

export async function GET() {
  try {
    const policyData = getActivePolicy();
    const ledger = getCurrentBudgetLedger();

    if (!policyData) {
      return NextResponse.json({ error: "No active policy found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      policyId: policyData.id,
      rawRules: policyData.raw_rules,
      policy: policyData.policy,
      budget: ledger,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const policy = body.policy as Policy;
    const rawRules = (body.rawRules || "").trim();

    if (!policy || !policy.maxMonthlyBudget || !policy.allowedCategories) {
      return NextResponse.json({ error: "Invalid policy payload" }, { status: 400 });
    }

    const db = getDb();
    const policyId = `policy_${Date.now()}`;

    // Deactivate previous policies
    db.prepare("UPDATE policies SET is_active = 0").run();

    // Insert new active confirmed policy
    db.prepare(`
      INSERT INTO policies (id, user_id, raw_rules, structured_policy, is_active, created_at, updated_at)
      VALUES (?, 'demo_user', ?, ?, 1, datetime('now'), datetime('now'))
    `).run(policyId, rawRules, JSON.stringify(policy));

    // Update monthly budget ledger with new limit
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    db.prepare(`
      INSERT INTO budget_ledger (month_year, user_id, budget_limit, total_spent, updated_at)
      VALUES (?, 'demo_user', ?, 0.0, datetime('now'))
      ON CONFLICT(month_year) DO UPDATE SET
        budget_limit = excluded.budget_limit,
        updated_at = datetime('now')
    `).run(currentMonthYear, policy.maxMonthlyBudget);

    logAuditEvent(
      "POLICY_CONFIRMED",
      `Activated confirmed policy with $${policy.maxMonthlyBudget} limit`,
      { policyId, rawRules, policy }
    );

    const updatedLedger = getCurrentBudgetLedger();

    return NextResponse.json({
      success: true,
      policyId,
      policy,
      budget: updatedLedger,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
