import { GoogleGenAI } from "@google/genai";
import { agentTools } from "./tools";
import { searchProducts } from "../catalog/channel3";
import { CatalogProduct } from "../catalog/types";
import { getActivePolicy, getCurrentBudgetLedger, getRecentOrders, logAuditEvent } from "../db/schema";
import { evaluatePurchaseProposal } from "../policy/engine";
import { PurchaseProposal, EvaluationResult } from "../policy/types";

export interface AgentChatResult {
  reply: string;
  proposal: PurchaseProposal | null;
  evaluation: EvaluationResult | null;
  toolsUsed: string[];
}

export async function runShoppingAgentLoop(
  userMessage: string,
  history: Array<{ role: "user" | "model"; content: string }> = []
): Promise<AgentChatResult> {
  const activePolicyData = getActivePolicy();
  if (!activePolicyData) {
    throw new Error("No active spending policy is configured. Please configure and confirm rules first.");
  }

  const activePolicy = activePolicyData.policy;
  const ledger = getCurrentBudgetLedger();
  const recentOrders = getRecentOrders(activePolicy.allowDuplicatesWithinDays || 7);

  const apiKey = process.env.GEMINI_API_KEY;
  const toolsUsed: string[] = [];
  let foundProducts: CatalogProduct[] = [];

  if (apiKey && apiKey.trim() !== "") {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

      const systemInstruction = `You are SpendGuard Shopping Assistant, an AI purchasing agent.
You help users find products according to their goals.
IMPORTANT CONSTRAINTS:
1. You can search products using the 'searchProducts' tool.
2. You can check budget limits using 'getBudgetSummary'.
3. You do NOT have any ability or tool to charge payment methods, create PayPal orders, or execute transactions.
4. When you recommend a product to buy, describe it clearly, mention the price and merchant, and propose it to the user.
5. All proposals will be strictly evaluated by SpendGuard's deterministic guardrail engine.`;

      // Build conversation turns
      const contents: any[] = [
        ...history.map((h) => ({
          role: h.role,
          parts: [{ text: h.content }],
        })),
        {
          role: "user",
          parts: [{ text: userMessage }],
        },
      ];

      // Turn 1: Call Gemini with tools
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: agentTools,
          temperature: 0.2,
        },
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const functionResponses: any[] = [];

        for (const call of functionCalls) {
          if (call.name) {
            toolsUsed.push(call.name);
          }

          if (call.name === "searchProducts") {
            const args = (call.args || {}) as any;
            const results = await searchProducts(args.query || userMessage, args.maxPrice);
            foundProducts = results;
            functionResponses.push({
              name: "searchProducts",
              response: { products: results.slice(0, 5) },
            });
          } else if (call.name === "getBudgetSummary") {
            functionResponses.push({
              name: "getBudgetSummary",
              response: {
                monthlyBudget: activePolicy.maxMonthlyBudget,
                totalSpent: ledger.total_spent,
                remainingBudget: Math.max(0, activePolicy.maxMonthlyBudget - ledger.total_spent),
                requireApprovalAbove: activePolicy.requireApprovalAbove,
                allowedCategories: activePolicy.allowedCategories,
              },
            });
          }
        }

        // Turn 2: Feed tool responses back to Gemini
        const turn2 = await ai.models.generateContent({
          model,
          contents: [
            ...contents,
            {
              role: "model",
              parts: functionCalls.map((fc) => ({ functionCall: fc })),
            },
            {
              role: "tool",
              parts: functionResponses.map((fr) => ({
                functionResponse: fr,
              })),
            },
          ],
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        const replyText = turn2.text || "Here is what I found based on your request.";
        const candidate = selectCandidateProduct(foundProducts, userMessage);

        if (candidate) {
          const proposal: PurchaseProposal = {
            productId: candidate.id,
            productTitle: candidate.title,
            price: candidate.price,
            currency: candidate.currency,
            category: candidate.category,
            merchantDomain: candidate.merchant,
            productUrl: candidate.url,
            imageUrl: candidate.imageUrl,
          };

          // Deterministic policy engine gate (NO LLM decides approval!)
          const evaluation = evaluatePurchaseProposal(proposal, activePolicy, {
            currentMonthSpent: ledger.total_spent,
            recentOrders,
          });

          logAuditEvent(
            "AGENT_PROPOSAL",
            `Agent proposed '${proposal.productTitle}' ($${proposal.price}) -> ${evaluation.decision}`,
            { userMessage, proposal, evaluation, toolsUsed },
            evaluation.decision === "BLOCKED" ? "WARN" : "INFO"
          );

          return {
            reply: replyText,
            proposal,
            evaluation,
            toolsUsed,
          };
        }

        return {
          reply: replyText,
          proposal: null,
          evaluation: null,
          toolsUsed,
        };
      }

      // No function calls emitted
      return {
        reply: response.text || "How can I help you find and safely purchase products today?",
        proposal: null,
        evaluation: null,
        toolsUsed,
      };
    } catch (err: any) {
      console.warn("[Gemini Agent] Error calling live API, using deterministic fallback loop:", err.message);
    }
  }

  // Fallback Agent Loop (Simulates function calling offline)
  toolsUsed.push("searchProducts");
  foundProducts = await searchProducts(userMessage);
  const candidate = selectCandidateProduct(foundProducts, userMessage);

  if (!candidate) {
    return {
      reply: `I searched the product catalog for "${userMessage}", but couldn't find a matching product. Could you try a different keyword?`,
      proposal: null,
      evaluation: null,
      toolsUsed,
    };
  }

  const proposal: PurchaseProposal = {
    productId: candidate.id,
    productTitle: candidate.title,
    price: candidate.price,
    currency: candidate.currency,
    category: candidate.category,
    merchantDomain: candidate.merchant,
    productUrl: candidate.url,
    imageUrl: candidate.imageUrl,
  };

  const evaluation = evaluatePurchaseProposal(proposal, activePolicy, {
    currentMonthSpent: ledger.total_spent,
    recentOrders,
  });

  const reply = `I searched Channel3 and found **${candidate.title}** from ${candidate.merchant} for **$${candidate.price.toFixed(2)} USD**. I have submitted it to SpendGuard's guardrail layer for policy validation.`;

  logAuditEvent(
    "AGENT_PROPOSAL",
    `Agent proposed '${proposal.productTitle}' ($${proposal.price}) -> ${evaluation.decision}`,
    { userMessage, proposal, evaluation, toolsUsed },
    evaluation.decision === "BLOCKED" ? "WARN" : "INFO"
  );

  return {
    reply,
    proposal,
    evaluation,
    toolsUsed,
  };
}

function selectCandidateProduct(products: CatalogProduct[], query: string): CatalogProduct | null {
  if (products.length === 0) return null;

  // If query mentions keyboard
  if (/keyboard/i.test(query)) {
    const kb = products.find((p) => /keyboard/i.test(p.title));
    if (kb) return kb;
  }

  // If query mentions headphone or sony
  if (/headphone|sony/i.test(query)) {
    const hp = products.find((p) => /headphone|sony/i.test(p.title));
    if (hp) return hp;
  }

  // If query mentions shoes or nike
  if (/shoes|sneakers|nike/i.test(query)) {
    const sh = products.find((p) => /shoes|nike/i.test(p.title));
    if (sh) return sh;
  }

  // Default to first result
  return products[0];
}
