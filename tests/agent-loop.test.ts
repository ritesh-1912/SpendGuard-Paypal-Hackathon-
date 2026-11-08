import test from "node:test";
import assert from "node:assert/strict";
import { runShoppingAgentLoop } from "../lib/agent/coordinator";
import { getDb } from "../lib/db";

test("Agent Loop: Auto-approves USB-C hub within threshold ($39.99 <= $40)", async () => {
  // Ensure DB initialized
  getDb();

  const result = await runShoppingAgentLoop("Buy an Anker USB-C hub under $40");

  assert.ok(result.reply.length > 0);
  assert.ok(result.proposal !== null, "Proposal should be returned");
  assert.equal(result.proposal?.category, "electronics");
  assert.equal(result.evaluation?.decision, "AUTO_APPROVE");
  assert.equal(result.evaluation?.ruleFired, "RULE_AUTO_APPROVE_CRITERIA_MET");
  assert.ok(result.toolsUsed.includes("searchProducts"));
});

test("Agent Loop: Escalates purchase exceeding $40 threshold to NEEDS_APPROVAL", async () => {
  getDb();

  const result = await runShoppingAgentLoop("Buy a Keychron mechanical keyboard around $65");

  assert.ok(result.proposal !== null);
  assert.ok(result.proposal!.price > 40);
  assert.equal(result.evaluation?.decision, "NEEDS_APPROVAL");
  assert.equal(result.evaluation?.ruleFired, "RULE_THRESHOLD_EXCEEDED");
});

test("Agent Loop: Blocks prohibited category (apparel)", async () => {
  getDb();

  const result = await runShoppingAgentLoop("Buy Nike running shoes");

  assert.ok(result.proposal !== null);
  assert.equal(result.proposal?.category, "apparel");
  assert.equal(result.evaluation?.decision, "BLOCKED");
  assert.equal(result.evaluation?.ruleFired, "RULE_CATEGORY_BLOCKED");
});

test("Agent Loop: Blocks hard max ceiling item ($348 > $100 cap)", async () => {
  getDb();

  const result = await runShoppingAgentLoop("Buy Sony noise canceling headphones");

  assert.ok(result.proposal !== null);
  assert.ok(result.proposal!.price > 100);
  assert.equal(result.evaluation?.decision, "BLOCKED");
  assert.equal(result.evaluation?.ruleFired, "RULE_MAX_ITEM_PRICE_EXCEEDED");
});
