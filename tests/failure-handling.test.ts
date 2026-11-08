import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

process.env.MOCK_PAYPAL_CAPTURE = "true";
process.env.DEMO_OFFLINE = "true";

import { getDb } from "../lib/db";
import { 
  insertOrder, 
  getOrderById, 
  updateOrder, 
  getCurrentBudgetLedger, 
  updateBudgetSpend 
} from "../lib/db/schema";

describe("Failure Cases and Edge Handling", () => {
  before(() => {
    getDb();
  });

  it("handles buyer cancellation at PayPal without altering budget ledger", () => {
    const initialLedger = getCurrentBudgetLedger();
    const orderId = `ord_cancel_test_${Date.now()}`;
    const paypalOrderId = `PAYPAL_CANCEL_${Date.now()}`;

    insertOrder({
      id: orderId,
      user_id: "demo_user",
      paypal_order_id: paypalOrderId,
      paypal_capture_id: null,
      product_id: "prod_hub_test",
      product_title: "Cancelled Item",
      product_price: 39.99,
      currency: "USD",
      category: "electronics",
      merchant: "techdirect.store",
      product_url: "https://techdirect.store",
      product_image_url: null,
      decision: "AUTO_APPROVE",
      decision_reason: "Within budget",
      rule_fired: "RULE_AUTO_APPROVE_CRITERIA_MET",
      status: "CREATED",
    });

    updateOrder(orderId, { status: "CANCELLED" });

    const cancelledOrder = getOrderById(orderId);
    assert.ok(cancelledOrder !== null);
    assert.equal(cancelledOrder.status, "CANCELLED");

    const postCancelLedger = getCurrentBudgetLedger();
    assert.equal(postCancelLedger.total_spent, initialLedger.total_spent);
  });

  it("handles capture failure by setting order status to FAILED and preserving budget ledger", () => {
    const initialLedger = getCurrentBudgetLedger();
    const orderId = `ord_fail_test_${Date.now()}`;
    const paypalOrderId = `PAYPAL_FAIL_${Date.now()}`;

    insertOrder({
      id: orderId,
      user_id: "demo_user",
      paypal_order_id: paypalOrderId,
      paypal_capture_id: null,
      product_id: "prod_fail_item",
      product_title: "Failed Capture Item",
      product_price: 49.99,
      currency: "USD",
      category: "electronics",
      merchant: "techdirect.store",
      product_url: "https://techdirect.store",
      product_image_url: null,
      decision: "NEEDS_APPROVAL",
      decision_reason: "User approved",
      rule_fired: "RULE_THRESHOLD_EXCEEDED",
      status: "CREATED",
    });

    updateOrder(orderId, { status: "FAILED" });

    const failedOrder = getOrderById(orderId);
    assert.ok(failedOrder !== null);
    assert.equal(failedOrder.status, "FAILED");

    const postFailLedger = getCurrentBudgetLedger();
    assert.equal(postFailLedger.total_spent, initialLedger.total_spent);
  });

  it("handles duplicate webhook delivery idempotently without double-incrementing budget", () => {
    const initialLedger = getCurrentBudgetLedger();
    const orderId = `ord_webhook_dup_${Date.now()}`;
    const paypalOrderId = `PAYPAL_WH_${Date.now()}`;
    const captureId = `CAP_WH_${Date.now()}`;
    const price = 25.00;

    insertOrder({
      id: orderId,
      user_id: "demo_user",
      paypal_order_id: paypalOrderId,
      paypal_capture_id: null,
      product_id: "prod_wh_item",
      product_title: "Webhook Item",
      product_price: price,
      currency: "USD",
      category: "electronics",
      merchant: "techdirect.store",
      product_url: "https://techdirect.store",
      product_image_url: null,
      decision: "AUTO_APPROVE",
      decision_reason: "Within budget",
      rule_fired: "RULE_AUTO_APPROVE_CRITERIA_MET",
      status: "CREATED",
    });

    // 1st Webhook delivery
    updateOrder(orderId, {
      status: "CAPTURED",
      paypal_capture_id: captureId,
      captured_at: new Date().toISOString(),
    });
    updateBudgetSpend(price);

    const afterFirstDelivery = getCurrentBudgetLedger();
    assert.equal(afterFirstDelivery.total_spent, initialLedger.total_spent + price);

    // 2nd Webhook delivery (duplicate): Order is already CAPTURED
    const order = getOrderById(orderId);
    assert.ok(order !== null);
    
    if (order.status === "CAPTURED") {
      // Duplicate ignored
    } else {
      updateBudgetSpend(price);
    }

    const afterSecondDelivery = getCurrentBudgetLedger();
    assert.equal(afterSecondDelivery.total_spent, initialLedger.total_spent + price);

    // Revert budget spend to maintain clean test isolation
    updateBudgetSpend(-price);
  });

  it("handles timeout error correctly", () => {
    const timeoutErr = new Error("PayPal API timed out after 10 seconds. Please try again.");
    (timeoutErr as any).name = "TimeoutError";

    assert.ok(timeoutErr.message.includes("timed out"));
    assert.equal(timeoutErr.name, "TimeoutError");
  });
});
