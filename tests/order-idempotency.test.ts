import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

process.env.MOCK_PAYPAL_CAPTURE = "true";
process.env.DEMO_OFFLINE = "true";

import { getDb } from "../lib/db";
import { insertOrder, getOrderByIdempotencyKey } from "../lib/db/schema";
import { createPayPalOrder } from "../lib/paypal/orders";

describe("Order Creation Idempotency", () => {
  before(() => {
    getDb();
  });

  it("stores and retrieves orders by idempotency key", () => {
    const testKey = `test_idemp_${Date.now()}_${Math.random()}`;
    const orderId = `ord_test_${Date.now()}_${Math.random()}`;

    insertOrder({
      id: orderId,
      idempotency_key: testKey,
      user_id: "demo_user",
      paypal_order_id: "MOCK_PAYPAL_123",
      paypal_capture_id: null,
      product_id: "prod_idemp_isolated_sample",
      product_title: "Isolated Test Item",
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

    const retrieved = getOrderByIdempotencyKey(testKey);
    assert.ok(retrieved !== null);
    assert.equal(retrieved.id, orderId);
    assert.equal(retrieved.idempotency_key, testKey);
    assert.equal(retrieved.paypal_order_id, "MOCK_PAYPAL_123");
  });

  it("double createPayPalOrder call with same idempotency key produces identical PayPal order reference", async () => {
    const internalId = `ord_double_${Date.now()}`;
    const idempotencyKey = `idemp_${internalId}`;

    const res1 = await createPayPalOrder({
      internalOrderId: internalId,
      title: "USB-C Hub",
      amount: 39.99,
      idempotencyKey,
    });

    const res2 = await createPayPalOrder({
      internalOrderId: internalId,
      title: "USB-C Hub",
      amount: 39.99,
      idempotencyKey,
    });

    assert.equal(res1.paypalOrderId, res2.paypalOrderId);
    assert.equal(res1.status, res2.status);
    assert.equal(res1.approveUrl, res2.approveUrl);
  });

  it("prevent duplicate order records when idempotency key is already registered", () => {
    const key = `key_dup_${Date.now()}_${Math.random()}`;
    const id1 = `ord_dup_1_${Date.now()}_${Math.random()}`;
    const id2 = `ord_dup_2_${Date.now()}_${Math.random()}`;

    insertOrder({
      id: id1,
      idempotency_key: key,
      user_id: "demo_user",
      paypal_order_id: null,
      paypal_capture_id: null,
      product_id: "prod_idemp_isolated_sample_2",
      product_title: "Item",
      product_price: 39.99,
      currency: "USD",
      category: "electronics",
      merchant: "techdirect.store",
      product_url: "https://techdirect.store",
      product_image_url: null,
      decision: "AUTO_APPROVE",
      decision_reason: "Within limits",
      rule_fired: "RULE_AUTO_APPROVE_CRITERIA_MET",
      status: "APPROVED",
    });

    assert.throws(
      () => {
        insertOrder({
          id: id2,
          idempotency_key: key,
          user_id: "demo_user",
          paypal_order_id: null,
          paypal_capture_id: null,
          product_id: "prod_idemp_isolated_sample_2",
          product_title: "Item",
          product_price: 39.99,
          currency: "USD",
          category: "electronics",
          merchant: "techdirect.store",
          product_url: "https://techdirect.store",
          product_image_url: null,
          decision: "AUTO_APPROVE",
          decision_reason: "Within limits",
          rule_fired: "RULE_AUTO_APPROVE_CRITERIA_MET",
          status: "APPROVED",
        });
      },
      (err: any) => err.message.includes("UNIQUE constraint failed")
    );
  });
});
