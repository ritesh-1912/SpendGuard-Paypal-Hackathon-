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
      description: "Transaction amount above which human approval is strictly mandatory",
    },
    maxItemPrice: {
      type: Type.NUMBER,
      description: "Hard maximum ceiling: any single item above this is automatically blocked",
    },
    allowedCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of allowed product categories in lowercase (e.g. electronics, books, office supplies)",
    },
    blockedCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of prohibited product categories (e.g. apparel, weapons, gambling)",
    },
    allowedMerchants: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of permitted merchant domains (e.g. amazon.com, bestbuy.com). Empty if all unblocked merchants are allowed.",
    },
    blockedMerchants: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of prohibited merchant domains (e.g. temu.com, aliexpress.com)",
    },
    allowDuplicatesWithinDays: {
      type: Type.NUMBER,
      description: "Number of days to restrict repurchasing the identical product (e.g. 7)",
    },
    currency: {
      type: Type.STRING,
      enum: ["USD"],
      description: "Currency code (strictly USD for sandbox)",
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

export async function parseSpendingRulesWithGemini(rawRules: string): Promise<Policy> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "") {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

      const prompt = `You are an expert financial policy compiler for SpendGuard.
Analyze the following user-defined spending rules and translate them into a structured policy JSON object adhering strictly to the schema.
Default values if unspecified:
- currency: "USD"
- version: "1.0"
- allowDuplicatesWithinDays: 7
- maxItemPrice: maxMonthlyBudget if not specified

User Rules:
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

      return sanitizePolicy(parsed);
    } catch (err: any) {
      console.warn("[Gemini Policy Parser] API call failed or timed out, using fallback parser:", err.message);
    }
  }

  // Fallback heuristic parser for offline/test environments
  return fallbackRuleParser(rawRules);
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

  // Extract budget: e.g. "$150/month" or "budget $200"
  const budgetMatch = text.match(/\$?(\d+(\.\d+)?)\s*(\/|\s*per\s*)?(month|mo)/i) || text.match(/budget\s*(?:of\s*)?\$?(\d+(\.\d+)?)/i);
  if (budgetMatch) {
    maxMonthlyBudget = parseFloat(budgetMatch[1]);
  }

  // Extract approval threshold: e.g. "over $40" or "above $50"
  const thresholdMatch = text.match(/(?:over|above|ask\s+me\s+before\s+anything\s+over|ask\s+over)\s*\$?(\d+(\.\d+)?)/i);
  if (thresholdMatch) {
    requireApprovalAbove = parseFloat(thresholdMatch[1]);
  }

  // Extract hard cap: e.g. "hard limit $100" or "block anything over $250"
  const capMatch = text.match(/(?:hard\s+limit|hard\s+cap|maximum\s+item|block\s+(?:anything\s+)?over|cap)\s*\$?(\d+(\.\d+)?)/i);
  if (capMatch) {
    maxItemPrice = parseFloat(capMatch[1]);
  } else {
    maxItemPrice = Math.min(maxMonthlyBudget, 100);
  }

  // Extract categories
  if (/electronics/i.test(text)) allowedCategories.push("electronics");
  if (/books?/i.test(text)) allowedCategories.push("books");
  if (/office(?:\s+supplies)?/i.test(text)) allowedCategories.push("office supplies");
  if (/snacks?|coffee|groceries/i.test(text)) allowedCategories.push("groceries");

  if (allowedCategories.length === 0) {
    allowedCategories.push("electronics", "books");
  }

  // Extract merchants
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
