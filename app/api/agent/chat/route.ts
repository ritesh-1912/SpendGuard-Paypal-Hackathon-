import { NextRequest, NextResponse } from "next/server";
import { runShoppingAgentLoop } from "@/lib/agent/coordinator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const history = body.history || [];

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await runShoppingAgentLoop(message, history);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
