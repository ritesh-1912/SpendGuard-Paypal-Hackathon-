import { Policy, PurchaseProposal, EvaluationResult, EvaluationContext } from "./types";

/**
 * Deterministic Policy Evaluation Engine
 * Pure function: LLM proposes, deterministic code decides.
 */
export function evaluatePurchaseProposal(
  proposal: PurchaseProposal,
  policy: Policy,
  context: EvaluationContext
): EvaluationResult {
  // 1. Currency Check
  if (proposal.currency.toUpperCase() !== policy.currency.toUpperCase()) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_CURRENCY_MISMATCH",
      reason: `Currency ${proposal.currency} does not match required policy currency ${policy.currency}.`,
    };
  }

  // 2. Non-positive or Anomaly Price Check
  if (proposal.price <= 0) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_INVALID_PRICE",
      reason: `Invalid product price: $${proposal.price.toFixed(2)}. Must be greater than 0.`,
    };
  }

  // 3. Merchant Domain Blacklist Check
  if (policy.blockedMerchants && policy.blockedMerchants.length > 0) {
    const isBlocked = policy.blockedMerchants.some((m) =>
      proposal.merchantDomain.toLowerCase().includes(m.toLowerCase())
    );
    if (isBlocked) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_MERCHANT_BLOCKED",
        reason: `Merchant '${proposal.merchantDomain}' is explicitly prohibited by policy.`,
      };
    }
  }

  // 4. Merchant Domain Whitelist Check
  if (policy.allowedMerchants && policy.allowedMerchants.length > 0) {
    const isAllowed = policy.allowedMerchants.some((m) =>
      proposal.merchantDomain.toLowerCase().includes(m.toLowerCase())
    );
    if (!isAllowed) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_MERCHANT_NOT_ALLOWED",
        reason: `Merchant '${proposal.merchantDomain}' is not in the approved merchant list.`,
      };
    }
  }

  // 5. Explicit Category Blacklist Check
  if (policy.blockedCategories && policy.blockedCategories.length > 0) {
    const isCategoryBlocked = policy.blockedCategories.some((cat) =>
      proposal.category.toLowerCase().includes(cat.toLowerCase())
    );
    if (isCategoryBlocked) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_CATEGORY_BLOCKED",
        reason: `Category '${proposal.category}' is explicitly blacklisted.`,
      };
    }
  }

  // 6. Category Whitelist Check
  const isCategoryAllowed = policy.allowedCategories.some((cat) =>
    proposal.category.toLowerCase().includes(cat.toLowerCase())
  );
  if (!isCategoryAllowed) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_CATEGORY_NOT_ALLOWED",
      reason: `Category '${proposal.category}' is not included in allowed categories: [${policy.allowedCategories.join(", ")}].`,
    };
  }

  // 7. Hard Max Item Price Ceiling
  if (proposal.price > policy.maxItemPrice) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_MAX_ITEM_PRICE_EXCEEDED",
      reason: `Item price ($${proposal.price.toFixed(2)}) exceeds hard maximum limit of $${policy.maxItemPrice.toFixed(2)}.`,
    };
  }

  // 8. Monthly Budget Overflow Check
  const projectedTotal = context.currentMonthSpent + proposal.price;
  // Use epsilon rounding for floating point safety
  if (Math.round(projectedTotal * 100) > Math.round(policy.maxMonthlyBudget * 100)) {
    const remaining = Math.max(0, policy.maxMonthlyBudget - context.currentMonthSpent);
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_MONTHLY_BUDGET_EXCEEDED",
      reason: `Purchase of $${proposal.price.toFixed(2)} exceeds remaining monthly budget of $${remaining.toFixed(2)} (Spent: $${context.currentMonthSpent.toFixed(2)} / Cap: $${policy.maxMonthlyBudget.toFixed(2)}).`,
    };
  }

  // 9. Duplicate Purchase Detection Check
  if (policy.allowDuplicatesWithinDays && policy.allowDuplicatesWithinDays > 0) {
    const duplicateWindowMs = policy.allowDuplicatesWithinDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const recentDuplicate = context.recentOrders.find((order) => {
      const orderTime = new Date(order.created_at).getTime();
      return (
        order.product_id === proposal.productId &&
        now - orderTime < duplicateWindowMs &&
        order.status !== "REJECTED" &&
        order.status !== "REFUNDED"
      );
    });

    if (recentDuplicate) {
      return {
        decision: "NEEDS_APPROVAL",
        ruleFired: "RULE_DUPLICATE_PURCHASE_DETECTED",
        reason: `Duplicate detected: this item was already ordered within the last ${policy.allowDuplicatesWithinDays} days (Order ID: ${recentDuplicate.id}). Requires manual confirmation.`,
      };
    }
  }

  // 10. Approval Threshold Check
  if (proposal.price > policy.requireApprovalAbove) {
    return {
      decision: "NEEDS_APPROVAL",
      ruleFired: "RULE_THRESHOLD_EXCEEDED",
      reason: `Price ($${proposal.price.toFixed(2)}) exceeds auto-approval threshold of $${policy.requireApprovalAbove.toFixed(2)}. Human confirmation required.`,
    };
  }

  // 11. Auto Approval Passed
  return {
    decision: "AUTO_APPROVE",
    ruleFired: "RULE_AUTO_APPROVE_CRITERIA_MET",
    reason: `Price ($${proposal.price.toFixed(2)}) is within auto-approval threshold ($${policy.requireApprovalAbove.toFixed(2)}) and monthly budget ($${policy.maxMonthlyBudget.toFixed(2)}).`,
  };
}
