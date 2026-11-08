import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment, validateEnvironmentOrThrow, getAppUrl } from "../lib/config/env";

describe("Environment Variable Validation", () => {
  it("passes when all required variables are present in live mode", () => {
    const result = validateEnvironment({
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
      APP_URL: "https://spendguard.example.com",
      CHANNEL3_API_KEY: "ch3_key_123",
      GEMINI_API_KEY: "gemini_key_123",
      PAYPAL_WEBHOOK_ID: "wh_123",
    });

    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  it("fails and explicitly names missing PayPal variables", () => {
    const result = validateEnvironment({
      APP_URL: "http://localhost:3000",
      CHANNEL3_API_KEY: "ch3_key_123",
      GEMINI_API_KEY: "gemini_key_123",
    });

    assert.equal(result.valid, false);
    assert.ok(result.missing.includes("PAYPAL_CLIENT_ID"));
    assert.ok(result.missing.includes("PAYPAL_CLIENT_SECRET"));
  });

  it("fails when MOCK_PAYPAL_CAPTURE is enabled in production", () => {
    const result = validateEnvironment({
      NODE_ENV: "production",
      MOCK_PAYPAL_CAPTURE: "true",
      APP_URL: "https://spendguard.onrender.com",
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
      CHANNEL3_API_KEY: "ch3_123",
      GEMINI_API_KEY: "gemini_123",
    });

    assert.equal(result.valid, false);
    assert.ok(result.missing.some((m) => m.includes("MOCK_PAYPAL_CAPTURE")));
  });

  it("fails when DEMO_OFFLINE is enabled in production without explicit override", () => {
    const result = validateEnvironment({
      NODE_ENV: "production",
      DEMO_OFFLINE: "true",
      APP_URL: "https://spendguard.onrender.com",
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
    });

    assert.equal(result.valid, false);
    assert.ok(result.missing.some((m) => m.includes("DEMO_OFFLINE")));
  });

  it("passes when DEMO_OFFLINE has explicit ALLOW_OFFLINE_IN_PROD override in production", () => {
    const result = validateEnvironment({
      NODE_ENV: "production",
      DEMO_OFFLINE: "true",
      ALLOW_OFFLINE_IN_PROD: "true",
      APP_URL: "https://spendguard.onrender.com",
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
    });

    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  it("getAppUrl resolves server APP_URL, RENDER_EXTERNAL_URL, and NEXT_PUBLIC_APP_URL with https prefix", () => {
    assert.equal(
      getAppUrl({ APP_URL: "spendguard.onrender.com" }),
      "https://spendguard.onrender.com"
    );

    assert.equal(
      getAppUrl({ RENDER_EXTERNAL_URL: "https://auto.onrender.com" }),
      "https://auto.onrender.com"
    );

    assert.equal(
      getAppUrl({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }),
      "http://localhost:3000"
    );
  });

  it("validateEnvironmentOrThrow throws Error naming the exact missing variables", () => {
    assert.throws(
      () => {
        validateEnvironmentOrThrow({
          APP_URL: "http://localhost:3000",
        });
      },
      (err: any) => {
        return (
          err.message.includes("PAYPAL_CLIENT_ID") &&
          err.message.includes("PAYPAL_CLIENT_SECRET")
        );
      }
    );
  });
});
