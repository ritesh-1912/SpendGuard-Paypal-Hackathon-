"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { XCircle, ArrowLeft } from "lucide-react";

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-6">
        <div className="h-12 w-12 bg-amber-950/40 border border-amber-800/60 rounded-full flex items-center justify-center mx-auto text-amber-400">
          <XCircle className="h-6 w-6" />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-medium bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
            Payment cancelled
          </span>
          <h2 className="text-xl font-semibold text-zinc-100 mt-2">No charges incurred</h2>
          <p className="text-xs text-zinc-400 mt-1">
            The PayPal sandbox session was cancelled. Your budget balance remains unchanged.
          </p>
        </div>

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
