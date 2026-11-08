export interface Policy {
  version: "1.0";
  maxMonthlyBudget: number;           // Total monthly budget ceiling in USD
  requireApprovalAbove: number;       // Items with price > threshold require explicit human approval
  maxItemPrice: number;               // Hard ceiling: items exceeding this are automatically BLOCKED
  allowedCategories: string[];        // Whitelisted categories (e.g. ["electronics", "books"])
  blockedCategories?: string[];       // Explicit blacklisted categories (e.g. ["apparel", "weapons"])
  allowedMerchants?: string[];        // If specified, only these retailer domains are allowed
  blockedMerchants?: string[];        // Disallowed domains (e.g. ["temu.com", "aliexpress.com"])
  allowDuplicatesWithinDays?: number; // Days to restrict repurchasing the same item (e.g. 7)
  currency: "USD";                    // Standardized sandbox currency
}

export interface PurchaseProposal {
  productId: string;
  productTitle: string;
  price: number;
  currency: string;
  category: string;
  merchantDomain: string;
  productUrl: string;
  imageUrl?: string;
}

export type PolicyDecision = "AUTO_APPROVE" | "NEEDS_APPROVAL" | "BLOCKED";

export interface EvaluationResult {
  decision: PolicyDecision;
  ruleFired: string;
  reason: string;
}

export interface EvaluationContext {
  currentMonthSpent: number;
  recentOrders: Array<{
    id: string;
    product_id: string;
    created_at: string;
    status: string;
  }>;
}
