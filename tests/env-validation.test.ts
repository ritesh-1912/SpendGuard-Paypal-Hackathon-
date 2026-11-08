import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment, validateEnvironmentOrThrow } from "../lib/config/env";

describe("Environment Variable Validation", () => {
  it("passes when all required variables are present in live mode", () => {
    const result = validateEnvironment({
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
      NEXT_PUBLIC_APP_URL: "https://spendguard.example.com",
      CHANNEL3_API_KEY: "ch3_key_123",
      GEMINI_API_KEY: "gemini_key_123",
      PAYPAL_WEBHOOK_ID: "wh_123",
    });

    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  it("fails and explicitly names missing PayPal variables", () => {
    const result = validateEnvironment({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      CHANNEL3_API_KEY: "ch3_key_123",
      GEMINI_API_KEY: "gemini_key_123",
    });

    assert.equal(result.valid, false);
    assert.ok(result.missing.includes("PAYPAL_CLIENT_ID"));
    assert.ok(result.missing.includes("PAYPAL_CLIENT_SECRET"));
  });

  it("fails and explicitly names missing Channel3 variable when DEMO_OFFLINE is false", () => {
    const result = validateEnvironment({
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DEMO_OFFLINE: "false",
    });

    assert.equal(result.valid, false);
    assert.ok(result.missing.includes("CHANNEL3_API_KEY"));
    assert.ok(result.missing.includes("GEMINI_API_KEY"));
  });

  it("passes without Channel3 key if DEMO_OFFLINE is true", () => {
    const result = validateEnvironment({
      PAYPAL_CLIENT_ID: "client_123",
      PAYPAL_CLIENT_SECRET: "secret_123",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DEMO_OFFLINE: "true",
    });

    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  });

  it("validateEnvironmentOrThrow throws Error naming the exact missing variables", () => {
    assert.throws(
      () => {
        validateEnvironmentOrThrow({
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
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
