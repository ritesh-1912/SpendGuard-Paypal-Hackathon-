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
    throw new Error("No active spending policy is configured. Set and confirm your rules first.");
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

      const systemInstruction = `You are the SpendGuard shopping agent.
Help users find products matching their request.
Rules:
1. Search products using the searchProducts tool.
2. Check budget limits using getBudgetSummary.
3. You cannot execute payments or call PayPal directly.
4. When recommending a product, state its exact title, price in USD, and merchant.
5. All proposals are intercepted and evaluated by deterministic code before checkout.`;

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

        const secondTurn = await ai.models.generateContent({
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

        const replyText = secondTurn.text || "Found products matching your request.";
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

          const evaluation = evaluatePurchaseProposal(proposal, activePolicy, {
            currentMonthSpent: ledger.total_spent,
            recentOrders,
          });

          logAuditEvent(
            "AGENT_PROPOSAL",
            `Proposed '${proposal.productTitle}' ($${proposal.price.toFixed(2)}) -> ${evaluation.decision}`,
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

      return {
        reply: response.text || "Tell me what product you are looking for.",
        proposal: null,
        evaluation: null,
        toolsUsed,
      };
    } catch {
      // Fall back to deterministic catalog matching if API call fails
    }
  }

  toolsUsed.push("searchProducts");
  foundProducts = await searchProducts(userMessage);
  const candidate = selectCandidateProduct(foundProducts, userMessage);

  if (!candidate) {
    return {
      reply: `No products found matching "${userMessage}". Try another search term.`,
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

  const reply = `Found ${candidate.title} from ${candidate.merchant} for $${candidate.price.toFixed(2)} USD. Submitted to guardrail policy engine for evaluation.`;

  logAuditEvent(
    "AGENT_PROPOSAL",
    `Proposed '${proposal.productTitle}' ($${proposal.price.toFixed(2)}) -> ${evaluation.decision}`,
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

  if (/keyboard/i.test(query)) {
    const kb = products.find((p) => /keyboard/i.test(p.title));
    if (kb) return kb;
  }

  if (/headphone|audio/i.test(query)) {
    const hp = products.find((p) => /headphone/i.test(p.title));
    if (hp) return hp;
  }

  if (/shoes|sneakers|runner/i.test(query)) {
    const sh = products.find((p) => /shoes/i.test(p.title));
    if (sh) return sh;
  }

  return products[0];
}
