import { Policy, PurchaseProposal, EvaluationResult, EvaluationContext } from "./types";

export function evaluatePurchaseProposal(
  proposal: PurchaseProposal,
  policy: Policy,
  context: EvaluationContext
): EvaluationResult {
  if (proposal.currency.toUpperCase() !== policy.currency.toUpperCase()) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_CURRENCY_MISMATCH",
      reason: `Currency ${proposal.currency} does not match policy currency ${policy.currency}.`,
    };
  }

  if (proposal.price <= 0) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_INVALID_PRICE",
      reason: `Product price ($${proposal.price.toFixed(2)}) must be greater than zero.`,
    };
  }

  if (policy.blockedMerchants && policy.blockedMerchants.length > 0) {
    const isBlocked = policy.blockedMerchants.some((m) =>
      proposal.merchantDomain.toLowerCase().includes(m.toLowerCase())
    );
    if (isBlocked) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_MERCHANT_BLOCKED",
        reason: `Merchant ${proposal.merchantDomain} is blocked by your policy.`,
      };
    }
  }

  if (policy.allowedMerchants && policy.allowedMerchants.length > 0) {
    const isAllowed = policy.allowedMerchants.some((m) =>
      proposal.merchantDomain.toLowerCase().includes(m.toLowerCase())
    );
    if (!isAllowed) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_MERCHANT_NOT_ALLOWED",
        reason: `Merchant ${proposal.merchantDomain} is not on the allowed merchant list.`,
      };
    }
  }

  if (policy.blockedCategories && policy.blockedCategories.length > 0) {
    const isCategoryBlocked = policy.blockedCategories.some((cat) =>
      proposal.category.toLowerCase().includes(cat.toLowerCase())
    );
    if (isCategoryBlocked) {
      return {
        decision: "BLOCKED",
        ruleFired: "RULE_CATEGORY_BLOCKED",
        reason: `Category '${proposal.category}' is blocked by your policy.`,
      };
    }
  }

  const isCategoryAllowed = policy.allowedCategories.some((cat) =>
    proposal.category.toLowerCase().includes(cat.toLowerCase())
  );
  if (!isCategoryAllowed) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_CATEGORY_NOT_ALLOWED",
      reason: `Category '${proposal.category}' is not in allowed categories: ${policy.allowedCategories.join(", ")}.`,
    };
  }

  if (proposal.price > policy.maxItemPrice) {
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_MAX_ITEM_PRICE_EXCEEDED",
      reason: `Item price ($${proposal.price.toFixed(2)}) exceeds single-item ceiling of $${policy.maxItemPrice.toFixed(2)}.`,
    };
  }

  const projectedTotal = context.currentMonthSpent + proposal.price;
  // Compare in cents to avoid IEEE-754 precision issues on exact boundary amounts
  if (Math.round(projectedTotal * 100) > Math.round(policy.maxMonthlyBudget * 100)) {
    const remaining = Math.max(0, policy.maxMonthlyBudget - context.currentMonthSpent);
    return {
      decision: "BLOCKED",
      ruleFired: "RULE_MONTHLY_BUDGET_EXCEEDED",
      reason: `Purchase of $${proposal.price.toFixed(2)} exceeds remaining monthly budget of $${remaining.toFixed(2)} ($${context.currentMonthSpent.toFixed(2)} spent of $${policy.maxMonthlyBudget.toFixed(2)} budget).`,
    };
  }

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
        reason: `Duplicate detected: this item was ordered within the last ${policy.allowDuplicatesWithinDays} days (Order ${recentDuplicate.id}). Confirmation required.`,
      };
    }
  }

  if (proposal.price > policy.requireApprovalAbove) {
    return {
      decision: "NEEDS_APPROVAL",
      ruleFired: "RULE_THRESHOLD_EXCEEDED",
      reason: `Price ($${proposal.price.toFixed(2)}) exceeds auto-approval threshold of $${policy.requireApprovalAbove.toFixed(2)}. Confirmation required.`,
    };
  }

  return {
    decision: "AUTO_APPROVE",
    ruleFired: "RULE_AUTO_APPROVE_CRITERIA_MET",
    reason: `Price ($${proposal.price.toFixed(2)}) is within the $${policy.requireApprovalAbove.toFixed(2)} auto-approval threshold and $${policy.maxMonthlyBudget.toFixed(2)} monthly budget.`,
  };
}
