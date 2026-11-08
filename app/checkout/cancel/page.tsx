"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, ArrowLeft } from "lucide-react";

function CancelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [cancelledItem, setCancelledItem] = useState<{ title: string; price: number } | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch("/api/orders/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.order) {
          setCancelledItem({
            title: data.order.product_title,
            price: data.order.product_price,
          });
        }
      })
      .catch(() => {
        // Silently handled; cancellation notice still renders
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-6">
        <div className="h-12 w-12 bg-amber-950/40 border border-amber-800/60 rounded-full flex items-center justify-center mx-auto text-amber-400">
          <XCircle className="h-6 w-6" />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-medium bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
            Checkout cancelled
          </span>
          <h2 className="text-xl font-semibold text-zinc-100 mt-2">No charges incurred</h2>
          <p className="text-xs text-zinc-400 mt-1">
            The checkout session was cancelled at PayPal. Your SpendGuard budget ledger remains unchanged.
          </p>
        </div>

        {cancelledItem && (
          <div className="bg-zinc-950 rounded-lg p-3.5 border border-zinc-800 text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Item</span>
              <span className="text-zinc-100 font-medium truncate max-w-[200px]">{cancelledItem.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount</span>
              <span className="text-zinc-200 font-mono font-medium">${cancelledItem.price.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Status</span>
              <span className="text-amber-400 font-medium">Cancelled by buyer</span>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to dashboard
        </button>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs">
        Loading...
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
