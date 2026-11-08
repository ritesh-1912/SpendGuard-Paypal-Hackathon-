import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePurchaseProposal } from "../lib/policy/engine";
import { Policy, PurchaseProposal, EvaluationContext } from "../lib/policy/types";

const referencePolicy: Policy = {
  version: "1.0",
  maxMonthlyBudget: 150.00,
  requireApprovalAbove: 40.00,
  maxItemPrice: 100.00,
  allowedCategories: ["electronics", "books"],
  blockedCategories: ["apparel", "weapons"],
  allowedMerchants: ["amazon.com", "bestbuy.com", "target.com"],
  blockedMerchants: ["temu.com", "aliexpress.com"],
  allowDuplicatesWithinDays: 7,
  currency: "USD",
};

const emptyContext: EvaluationContext = {
  currentMonthSpent: 0.0,
  recentOrders: [],
};

test("TC-01: Standard Auto-Approve", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_cable_1",
    productTitle: "USB Cable",
    price: 25.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/dp/123",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "AUTO_APPROVE");
  assert.equal(result.ruleFired, "RULE_AUTO_APPROVE_CRITERIA_MET");
});

test("TC-02: Exceeds Approval Threshold", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_kb_2",
    productTitle: "Mechanical Keyboard",
    price: 55.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/dp/456",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 20.00,
    recentOrders: [],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "NEEDS_APPROVAL");
  assert.equal(result.ruleFired, "RULE_THRESHOLD_EXCEEDED");
});

test("TC-03: Exceeds Hard Max Item Ceiling", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_hp_3",
    productTitle: "Noise Cancelling Headphones",
    price: 120.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/dp/789",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_MAX_ITEM_PRICE_EXCEEDED");
});

test("TC-04: Monthly Budget Overflow", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_cam_4",
    productTitle: "Web Camera",
    price: 35.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "bestbuy.com",
    productUrl: "https://bestbuy.com/cam",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 130.00,
    recentOrders: [],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_MONTHLY_BUDGET_EXCEEDED");
});

test("TC-05: Exact Budget Boundary Match", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_eth_5",
    productTitle: "Ethernet Adapter",
    price: 30.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/eth",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 120.00,
    recentOrders: [],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "AUTO_APPROVE");
  assert.equal(result.ruleFired, "RULE_AUTO_APPROVE_CRITERIA_MET");
});

test("TC-06: Budget Boundary + $0.01 Overflow", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_eth_6",
    productTitle: "Ethernet Adapter",
    price: 30.01,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/eth",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 120.00,
    recentOrders: [],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_MONTHLY_BUDGET_EXCEEDED");
});

test("TC-07: Exact Threshold Boundary Match", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_mouse_7",
    productTitle: "Bluetooth Mouse",
    price: 40.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "target.com",
    productUrl: "https://target.com/mouse",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 10.00,
    recentOrders: [],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "AUTO_APPROVE");
  assert.equal(result.ruleFired, "RULE_AUTO_APPROVE_CRITERIA_MET");
});

test("TC-08: Threshold Boundary + $0.01 Escalation", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_mouse_8",
    productTitle: "Bluetooth Mouse",
    price: 40.01,
    currency: "USD",
    category: "electronics",
    merchantDomain: "target.com",
    productUrl: "https://target.com/mouse",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 10.00,
    recentOrders: [],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "NEEDS_APPROVAL");
  assert.equal(result.ruleFired, "RULE_THRESHOLD_EXCEEDED");
});

test("TC-09: Disallowed Category (Not in Whitelist)", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_coffee_9",
    productTitle: "Coffee Beans",
    price: 35.00,
    currency: "USD",
    category: "groceries",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/coffee",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_CATEGORY_NOT_ALLOWED");
});

test("TC-10: Explicit Blacklisted Category", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_shirt_10",
    productTitle: "Cotton T-Shirt",
    price: 30.00,
    currency: "USD",
    category: "apparel",
    merchantDomain: "target.com",
    productUrl: "https://target.com/shirt",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_CATEGORY_BLOCKED");
});

test("TC-11: Currency Mismatch", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_book_11",
    productTitle: "Hardcover Novel",
    price: 35.00,
    currency: "EUR",
    category: "books",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/book",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_CURRENCY_MISMATCH");
});

test("TC-12: Explicit Blocked Merchant Domain", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_usb_12",
    productTitle: "USB Flash Drive",
    price: 25.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "temu.com",
    productUrl: "https://temu.com/usb",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_MERCHANT_BLOCKED");
});

test("TC-13: Non-Whitelisted Merchant", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_usb_13",
    productTitle: "USB Flash Drive",
    price: 25.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "walmart.com",
    productUrl: "https://walmart.com/usb",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.ruleFired, "RULE_MERCHANT_NOT_ALLOWED");
});

test("TC-14: Duplicate Purchase Within 7 Days", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_dup_14",
    productTitle: "USB Cable",
    price: 25.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/cable",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 25.00,
    recentOrders: [
      {
        id: "ord_past_1",
        product_id: "prod_dup_14",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "CAPTURED",
      },
    ],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "NEEDS_APPROVAL");
  assert.equal(result.ruleFired, "RULE_DUPLICATE_PURCHASE_DETECTED");
});

test("TC-15: Duplicate Purchase After Window (> 7 Days)", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_dup_15",
    productTitle: "USB Cable",
    price: 25.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/cable",
  };

  const context: EvaluationContext = {
    currentMonthSpent: 25.00,
    recentOrders: [
      {
        id: "ord_past_2",
        product_id: "prod_dup_15",
        created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        status: "CAPTURED",
      },
    ],
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, context);
  assert.equal(result.decision, "AUTO_APPROVE");
  assert.equal(result.ruleFired, "RULE_AUTO_APPROVE_CRITERIA_MET");
});

test("TC-16: Cumulative Multi-Order Exhaustion", () => {
  const orderA: PurchaseProposal = {
    productId: "prod_a",
    productTitle: "Order A",
    price: 35.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/a",
  };

  const context1: EvaluationContext = {
    currentMonthSpent: 100.00,
    recentOrders: [],
  };

  const resA = evaluatePurchaseProposal(orderA, referencePolicy, context1);
  assert.equal(resA.decision, "AUTO_APPROVE");

  // After order A, total spent is $135.00
  const orderB: PurchaseProposal = {
    productId: "prod_b",
    productTitle: "Order B",
    price: 30.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/b",
  };

  const context2: EvaluationContext = {
    currentMonthSpent: 135.00,
    recentOrders: [],
  };

  const resB = evaluatePurchaseProposal(orderB, referencePolicy, context2);
  assert.equal(resB.decision, "BLOCKED");
  assert.equal(resB.ruleFired, "RULE_MONTHLY_BUDGET_EXCEEDED");
});

test("TC-17: Invalid Zero or Negative Price", () => {
  const proposalZero: PurchaseProposal = {
    productId: "prod_zero",
    productTitle: "Free Glitch Item",
    price: 0.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/zero",
  };

  const resZero = evaluatePurchaseProposal(proposalZero, referencePolicy, emptyContext);
  assert.equal(resZero.decision, "BLOCKED");
  assert.equal(resZero.ruleFired, "RULE_INVALID_PRICE");

  const proposalNeg: PurchaseProposal = {
    productId: "prod_neg",
    productTitle: "Negative Price Item",
    price: -15.00,
    currency: "USD",
    category: "electronics",
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/neg",
  };

  const resNeg = evaluatePurchaseProposal(proposalNeg, referencePolicy, emptyContext);
  assert.equal(resNeg.decision, "BLOCKED");
  assert.equal(resNeg.ruleFired, "RULE_INVALID_PRICE");
});

test("TC-18: Case-Insensitive Category Matching", () => {
  const proposal: PurchaseProposal = {
    productId: "prod_case",
    productTitle: "Python Guide",
    price: 25.00,
    currency: "USD",
    category: "BOOKS", // Uppercase
    merchantDomain: "amazon.com",
    productUrl: "https://amazon.com/py",
  };

  const result = evaluatePurchaseProposal(proposal, referencePolicy, emptyContext);
  assert.equal(result.decision, "AUTO_APPROVE");
  assert.equal(result.ruleFired, "RULE_AUTO_APPROVE_CRITERIA_MET");
});
