import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPayPalAccessToken } from "@/lib/paypal/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const services: Record<string, any> = {};

  // 1. Database Reachability Check
  const dbStart = Date.now();
  try {
    const db = getDb();
    const result = db.prepare("SELECT 1 as alive").get() as any;
    const dbLatency = Date.now() - dbStart;

    if (result && result.alive === 1) {
      services.database = {
        status: "reachable",
        latencyMs: dbLatency,
      };
    } else {
      services.database = {
        status: "unreachable",
        error: "Unexpected query result",
      };
    }
  } catch (err: any) {
    services.database = {
      status: "unreachable",
      error: err.message || "Database connection failed",
    };
  }

  // 2. PayPal Reachability Check
  const isMockPayPal = process.env.MOCK_PAYPAL_CAPTURE === "true";
  const paypalStart = Date.now();

  if (isMockPayPal) {
    services.paypal = {
      status: "mock_enabled",
      environment: "mock",
    };
  } else if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    services.paypal = {
      status: "unconfigured",
      error: "PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing",
    };
  } else {
    try {
      await getPayPalAccessToken();
      const paypalLatency = Date.now() - paypalStart;
      services.paypal = {
        status: "reachable",
        environment: process.env.PAYPAL_ENVIRONMENT || "sandbox",
        latencyMs: paypalLatency,
      };
    } catch (err: any) {
      services.paypal = {
        status: "unreachable",
        error: err.message || "Failed to authenticate with PayPal",
      };
    }
  }

  // 3. Channel3 Reachability Check
  const isOfflineDemo = process.env.DEMO_OFFLINE === "true";
  const ch3Start = Date.now();

  if (isOfflineDemo) {
    services.channel3 = {
      status: "offline_sample_catalog",
      note: "DEMO_OFFLINE=true",
    };
  } else if (!process.env.CHANNEL3_API_KEY) {
    services.channel3 = {
      status: "unconfigured",
      error: "CHANNEL3_API_KEY is not set",
    };
  } else {
    try {
      const baseUrl = process.env.CHANNEL3_BASE_URL || "https://api.trychannel3.com/v1";
      const res = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CHANNEL3_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "ping" }),
        signal: AbortSignal.timeout(5000),
      });

      const ch3Latency = Date.now() - ch3Start;

      if (res.ok) {
        services.channel3 = {
          status: "reachable",
          latencyMs: ch3Latency,
        };
      } else {
        services.channel3 = {
          status: "degraded",
          statusCode: res.status,
          latencyMs: ch3Latency,
        };
      }
    } catch (err: any) {
      services.channel3 = {
        status: "unreachable",
        error: err.message || "Failed to reach Channel3 API",
      };
    }
  }

  const isDbHealthy = services.database?.status === "reachable";
  const isPayPalOk = services.paypal?.status === "reachable" || services.paypal?.status === "mock_enabled";
  const isCh3Ok = services.channel3?.status === "reachable" || services.channel3?.status === "offline_sample_catalog";

  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (!isDbHealthy) {
    overallStatus = "unhealthy";
  } else if (!isPayPalOk || !isCh3Ok) {
    overallStatus = "degraded";
  }

  const statusCode = isDbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp,
      version: "0.1.0",
      services,
    },
    { status: statusCode }
  );
}
