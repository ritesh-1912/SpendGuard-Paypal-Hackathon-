import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/health/route";

describe("Health Check API Route (/api/health)", () => {
  it("returns read-only health metrics for database, paypal, and channel3", async () => {
    process.env.MOCK_PAYPAL_CAPTURE = "true";
    process.env.DEMO_OFFLINE = "true";

    const response = await GET();
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.ok(data.status === "healthy" || data.status === "degraded");
    assert.ok(data.timestamp);
    assert.equal(data.version, "0.1.0");

    assert.ok(data.services.database);
    assert.equal(data.services.database.status, "reachable");
    assert.ok(typeof data.services.database.latencyMs === "number");

    assert.ok(data.services.paypal);
    assert.equal(data.services.paypal.status, "mock_enabled");

    assert.ok(data.services.channel3);
    assert.equal(data.services.channel3.status, "offline_sample_catalog");
  });

  it("never includes secrets or sensitive credentials in health output", async () => {
    process.env.PAYPAL_CLIENT_SECRET = "super_secret_paypal_key_xyz";
    process.env.GEMINI_API_KEY = "super_secret_gemini_key_123";
    process.env.CHANNEL3_API_KEY = "super_secret_channel3_key_456";

    const response = await GET();
    const rawText = await response.text();

    assert.ok(!rawText.includes("super_secret_paypal_key_xyz"));
    assert.ok(!rawText.includes("super_secret_gemini_key_123"));
    assert.ok(!rawText.includes("super_secret_channel3_key_456"));
  });
});
