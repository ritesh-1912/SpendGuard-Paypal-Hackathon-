"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [isCapturing, setIsCapturing] = useState(true);
  const [captureData, setCaptureData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No transaction token received from PayPal.");
      setIsCapturing(false);
      return;
    }

    captureOrder(token);
  }, [token]);

  async function captureOrder(orderToken: string) {
    try {
      const res = await fetch("/api/orders/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: orderToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to finalize PayPal capture.");
      }

      setCaptureData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while capturing the payment.");
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        
        {isCapturing ? (
          <div className="py-12 text-center space-y-3">
            <h2 className="text-base font-semibold text-zinc-100">Capturing PayPal payment...</h2>
            <p className="text-xs text-zinc-400">
              Finalizing order capture via PayPal Orders v2 sandbox API.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4 text-center">
            <div className="h-12 w-12 bg-red-950/40 border border-red-800/60 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">Capture failed</h2>
            <p className="text-xs text-red-300 bg-red-950/40 p-3 rounded-lg border border-red-800/60 font-mono">
              {error}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium py-2.5 px-4 rounded-lg text-xs transition"
            >
              Return to dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="h-12 w-12 bg-emerald-950/40 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                Payment captured
              </span>
              <h2 className="text-xl font-semibold text-zinc-100 mt-2">Order confirmed</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Validated by policy engine and captured through PayPal sandbox.
              </p>
            </div>

            {captureData?.order && (
              <div className="bg-zinc-950 rounded-lg p-3.5 border border-zinc-800 text-left space-y-2 text-xs">
                <div className="flex justify-between pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Item</span>
                  <span className="text-zinc-100 font-medium truncate max-w-[180px]">
                    {captureData.order.product_title}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Amount</span>
                  <span className="text-emerald-400 font-medium font-mono">
                    ${captureData.order.product_price.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Capture ID</span>
                  <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[180px]">
                    {captureData.captureId}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Decision</span>
                  <span className="text-emerald-400 font-medium">
                    {captureData.order.decision}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Remaining budget</span>
                  <span className="text-zinc-100 font-medium font-mono">
                    ${(captureData.budget?.budget_limit - captureData.budget?.total_spent).toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs">
        Loading checkout status...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
