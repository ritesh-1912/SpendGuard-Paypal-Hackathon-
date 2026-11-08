"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token"); // PayPal Order ID
  const payerId = searchParams.get("PayerID");

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {isCapturing ? (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
            <h2 className="text-lg font-bold text-white">Finalizing PayPal Capture...</h2>
            <p className="text-xs text-slate-400">
              Capturing authorized funds via PayPal Orders v2 sandbox API and logging audit record.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4 text-center">
            <div className="h-14 w-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Capture Failed</h2>
            <p className="text-sm text-red-300 bg-red-950/40 p-3 rounded-xl border border-red-900/60 font-mono text-xs">
              {error}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition"
            >
              Return to SpendGuard
            </button>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Sandbox Payment Captured
              </span>
              <h2 className="text-2xl font-bold text-white mt-3">Transaction Confirmed</h2>
              <p className="text-xs text-slate-400 mt-1">
                Policy engine validated and captured via PayPal Orders v2 REST API.
              </p>
            </div>

            {captureData?.order && (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 text-left space-y-2.5 text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Item</span>
                  <span className="text-white font-medium truncate max-w-[180px]">
                    {captureData.order.product_title}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Amount Charged</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ${captureData.order.product_price.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">PayPal Capture ID</span>
                  <span className="text-slate-200 font-mono text-[11px] truncate max-w-[180px]">
                    {captureData.captureId}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Policy Decision</span>
                  <span className="text-emerald-400 font-semibold">
                    {captureData.order.decision}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining Budget</span>
                  <span className="text-white font-bold font-mono">
                    ${(captureData.budget?.budget_limit - captureData.budget?.total_spent).toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading checkout status...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
