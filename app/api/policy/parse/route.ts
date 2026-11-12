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

    const result = await parseSpendingRulesWithGemini(rawRules);

    const isGemini = result.parser === "gemini";
    const logSummary = isGemini
      ? `Parsed spending rules with Gemini structured output (${result.model || "gemini"})`
      : `Parsed spending rules using fallback parser: ${result.fallbackNotice || "Gemini unavailable"}`;

    logAuditEvent(
      "RULE_PARSED",
      logSummary,
      {
        rawRules,
        parsedPolicy: result.policy,
        parser: result.parser,
        model: result.model,
        fallbackNotice: result.fallbackNotice,
      },
      isGemini ? "INFO" : "WARN"
    );

    return NextResponse.json({
      success: true,
      rawRules,
      parsedPolicy: result.policy,
      parser: result.parser,
      model: result.model,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
