import { FunctionDeclaration, Type } from "@google/genai";

/**
 * Tools available to the Gemini shopping agent.
 * CRITICAL GUARDRAIL PRINCIPLE:
 * The agent has ZERO direct access to PayPal or order creation APIs.
 * It can only discover products and query budget constraints.
 */

export const searchProductsTool: FunctionDeclaration = {
  name: "searchProducts",
  description: "Search live e-commerce products by keyword query, optional category, and maximum price filter.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The product search term or item name (e.g. 'USB-C hub', 'mechanical keyboard', 'data engineering book')",
      },
      category: {
        type: Type.STRING,
        description: "Optional category filter (e.g. 'electronics', 'books', 'apparel')",
      },
      maxPrice: {
        type: Type.NUMBER,
        description: "Optional maximum price filter in USD",
      },
    },
    required: ["query"],
  },
};

export const getBudgetSummaryTool: FunctionDeclaration = {
  name: "getBudgetSummary",
  description: "Check the user's active spending limits, remaining monthly budget, and auto-approval thresholds.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const agentTools = [
  {
    functionDeclarations: [searchProductsTool, getBudgetSummaryTool],
  },
];
