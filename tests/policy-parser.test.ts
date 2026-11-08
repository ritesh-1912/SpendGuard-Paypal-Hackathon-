import test from "node:test";
import assert from "node:assert/strict";
import { parseSpendingRulesWithGemini } from "../lib/policy/parser";

test("Policy Parser: Parses natural language rules into structured Policy", async () => {
  const rules = "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress.";
  const policy = await parseSpendingRulesWithGemini(rules);

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
  const policy = await parseSpendingRulesWithGemini(rules);

  assert.equal(policy.maxMonthlyBudget, 500);
  assert.equal(policy.requireApprovalAbove, 75);
  assert.equal(policy.maxItemPrice, 250);
  assert.ok(policy.allowedCategories.includes("office supplies"));
  assert.equal(policy.currency, "USD");
});

test("Policy Parser: Sanitizes empty or extreme inputs with safe defaults", async () => {
  const rules = "Just buy whatever I want";
  const policy = await parseSpendingRulesWithGemini(rules);

  assert.ok(policy.maxMonthlyBudget > 0);
  assert.ok(policy.requireApprovalAbove > 0);
  assert.ok(policy.allowedCategories.length > 0);
  assert.equal(policy.currency, "USD");
});
