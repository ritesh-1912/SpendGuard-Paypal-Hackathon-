import { NextRequest, NextResponse } from "next/server";
import { parseSpendingRulesWithGemini } from "@/lib/policy/parser";
import { logAuditEvent } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawRules = (body.rawRules || "").trim();

    if (!rawRules) {
      return NextResponse.json({ error: "Spending rules text is required" }, { status: 400 });
    }

    const parsedPolicy = await parseSpendingRulesWithGemini(rawRules);

    logAuditEvent(
      "RULE_PARSED",
      "Parsed spending rules with Gemini structured output",
      { rawRules, parsedPolicy }
    );

    return NextResponse.json({
      success: true,
      rawRules,
      parsedPolicy,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
