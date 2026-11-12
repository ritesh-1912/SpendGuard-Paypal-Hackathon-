import test from "node:test";
import assert from "node:assert/strict";
import { parseSpendingRulesWithGemini } from "../lib/policy/parser";

test("Policy Parser: Parses natural language rules into structured Policy", async () => {
  const rules = "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress.";
  const result = await parseSpendingRulesWithGemini(rules);
  const policy = result.policy;

  assert.ok(result.parser === "gemini" || result.parser === "rules-fallback");
  assert.equal(policy.version, "1.0");
  assert.equal(policy.maxMonthlyBudget, 150);
  assert.equal(policy.requireApprovalAbove, 40);
  assert.equal(policy.maxItemPrice, 100);
  assert.ok(policy.allowedCategories.includes("electronics"));
  assert.ok(policy.allowedCategories.includes("books"));
  assert.ok(policy.blockedMerchants?.includes("temu.com"));
  assert.equal(policy.currency, "USD");
});

test("Policy Parser: Office supplies preset with higher budget", async () => {
  const rules = "Monthly budget $500 for office supplies and hardware. Auto-approve under $75. Ask over $75. Block anything over $250.";
  const result = await parseSpendingRulesWithGemini(rules);
  const policy = result.policy;

  assert.equal(policy.maxMonthlyBudget, 500);
  assert.equal(policy.requireApprovalAbove, 75);
  assert.equal(policy.maxItemPrice, 250);
  assert.ok(policy.allowedCategories.includes("office supplies"));
  assert.equal(policy.currency, "USD");
});

test("Policy Parser: Sanitizes empty or extreme inputs with safe defaults", async () => {
  const rules = "Just buy whatever I want";
  const result = await parseSpendingRulesWithGemini(rules);
  const policy = result.policy;

  assert.ok(policy.maxMonthlyBudget > 0);
  assert.ok(policy.requireApprovalAbove > 0);
  assert.ok(policy.allowedCategories.length > 0);
  assert.equal(policy.currency, "USD");
});

test("Policy Parser: Explicitly reports fallback parser and reason when GEMINI_API_KEY is not set", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await parseSpendingRulesWithGemini("Budget $100, ask above $25");
    assert.equal(result.parser, "rules-fallback");
    assert.ok(result.fallbackNotice?.includes("GEMINI_API_KEY"));
    assert.equal(result.policy.maxMonthlyBudget, 100);
    assert.equal(result.policy.requireApprovalAbove, 25);
  } finally {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }
});
