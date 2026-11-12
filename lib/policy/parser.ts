import { GoogleGenAI, Type } from "@google/genai";
import { Policy } from "./types";

export const policySchema = {
  type: Type.OBJECT,
  properties: {
    version: { type: Type.STRING, enum: ["1.0"] },
    maxMonthlyBudget: {
      type: Type.NUMBER,
      description: "Total monthly spending budget ceiling in USD",
    },
    requireApprovalAbove: {
      type: Type.NUMBER,
      description: "Transaction amount above which human approval is mandatory",
    },
    maxItemPrice: {
      type: Type.NUMBER,
      description: "Hard maximum ceiling: any single item above this is blocked",
    },
    allowedCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of allowed product categories in lowercase",
    },
    blockedCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of prohibited product categories",
    },
    allowedMerchants: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of permitted merchant domains",
    },
    blockedMerchants: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of prohibited merchant domains",
    },
    allowDuplicatesWithinDays: {
      type: Type.NUMBER,
      description: "Days to restrict repurchasing the identical product",
    },
    currency: {
      type: Type.STRING,
      enum: ["USD"],
      description: "Currency code",
    },
  },
  required: [
    "version",
    "maxMonthlyBudget",
    "requireApprovalAbove",
    "maxItemPrice",
    "allowedCategories",
    "currency",
  ],
};

export interface PolicyParseResult {
  policy: Policy;
  parser: "gemini" | "rules-fallback";
  model?: string;
  fallbackNotice?: string;
}

export async function parseSpendingRulesWithGemini(rawRules: string): Promise<PolicyParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "") {
    const candidateModels = Array.from(
      new Set([process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(Boolean))
    ) as string[];

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

        const prompt = `Convert these spending rules into a structured policy JSON object adhering strictly to the schema.
Default values if unspecified:
- currency: "USD"
- version: "1.0"
- allowDuplicatesWithinDays: 7
- maxItemPrice: maxMonthlyBudget

Rules:
"${rawRules}"`;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: policySchema,
            temperature: 0.1,
          },
        });

        const responseText = response.text?.trim() || "";
        const parsed = JSON.parse(responseText) as Policy;

        return {
          policy: sanitizePolicy(parsed),
          parser: "gemini",
          model,
        };
      } catch (err: any) {
        lastError = err;
      }
    }

    const errorMsg = lastError?.message || "Gemini model execution failed";
    return {
      policy: fallbackRuleParser(rawRules),
      parser: "rules-fallback",
      fallbackNotice: `Gemini API error: ${errorMsg}`,
    };
  }

  return {
    policy: fallbackRuleParser(rawRules),
    parser: "rules-fallback",
    fallbackNotice: "GEMINI_API_KEY is not configured",
  };
}

function sanitizePolicy(policy: Policy): Policy {
  return {
    version: "1.0",
    maxMonthlyBudget: Math.max(1, Number(policy.maxMonthlyBudget) || 150),
    requireApprovalAbove: Math.max(1, Number(policy.requireApprovalAbove) || 40),
    maxItemPrice: Math.max(1, Number(policy.maxItemPrice) || 100),
    allowedCategories: Array.isArray(policy.allowedCategories) && policy.allowedCategories.length > 0
      ? policy.allowedCategories.map((c) => String(c).toLowerCase().trim())
      : ["electronics", "books"],
    blockedCategories: Array.isArray(policy.blockedCategories)
      ? policy.blockedCategories.map((c) => String(c).toLowerCase().trim())
      : ["apparel", "weapons"],
    allowedMerchants: Array.isArray(policy.allowedMerchants)
      ? policy.allowedMerchants.map((m) => String(m).toLowerCase().trim())
      : [],
    blockedMerchants: Array.isArray(policy.blockedMerchants)
      ? policy.blockedMerchants.map((m) => String(m).toLowerCase().trim())
      : ["temu.com", "aliexpress.com"],
    allowDuplicatesWithinDays: Number(policy.allowDuplicatesWithinDays) || 7,
    currency: "USD",
  };
}

function fallbackRuleParser(text: string): Policy {
  let maxMonthlyBudget = 150.0;
  let requireApprovalAbove = 40.0;
  let maxItemPrice = 100.0;
  const allowedCategories: string[] = [];
  const blockedMerchants: string[] = [];
  const blockedCategories: string[] = ["apparel", "weapons"];

  const budgetMatch = text.match(/\$?(\d+(\.\d+)?)\s*(\/|\s*per\s*)?(month|mo)/i) || text.match(/budget\s*(?:of\s*)?\$?(\d+(\.\d+)?)/i);
  if (budgetMatch) {
    maxMonthlyBudget = parseFloat(budgetMatch[1]);
  }

  const thresholdMatch = text.match(/(?:over|above|ask\s+me\s+before\s+anything\s+over|ask\s+over)\s*\$?(\d+(\.\d+)?)/i);
  if (thresholdMatch) {
    requireApprovalAbove = parseFloat(thresholdMatch[1]);
  }

  const capMatch = text.match(/(?:hard\s+limit|hard\s+cap|maximum\s+item|block\s+(?:anything\s+)?over|cap)\s*\$?(\d+(\.\d+)?)/i);
  if (capMatch) {
    maxItemPrice = parseFloat(capMatch[1]);
  } else {
    maxItemPrice = Math.min(maxMonthlyBudget, 100);
  }

  if (/electronics/i.test(text)) allowedCategories.push("electronics");
  if (/books?/i.test(text)) allowedCategories.push("books");
  if (/office(?:\s+supplies)?/i.test(text)) allowedCategories.push("office supplies");
  if (/snacks?|coffee|groceries/i.test(text)) allowedCategories.push("groceries");

  if (allowedCategories.length === 0) {
    allowedCategories.push("electronics", "books");
  }

  if (/temu/i.test(text)) blockedMerchants.push("temu.com");
  if (/aliexpress/i.test(text)) blockedMerchants.push("aliexpress.com");

  return {
    version: "1.0",
    maxMonthlyBudget,
    requireApprovalAbove,
    maxItemPrice,
    allowedCategories,
    blockedCategories,
    allowedMerchants: [],
    blockedMerchants,
    allowDuplicatesWithinDays: 7,
    currency: "USD",
  };
}
