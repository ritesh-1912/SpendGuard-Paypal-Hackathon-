import { NextResponse } from "next/server";
import { getActivePolicy, getCurrentBudgetLedger } from "@/lib/db/schema";

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
