"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { XCircle, ArrowLeft } from "lucide-react";

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
          <XCircle className="h-10 w-10" />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            Payment Cancelled
          </span>
          <h2 className="text-2xl font-bold text-white mt-3">No Charges Incurred</h2>
          <p className="text-xs text-slate-400 mt-2">
            The PayPal Sandbox session was cancelled. Your SpendGuard budget ledger remains unchanged.
          </p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to SpendGuard
        </button>
      </div>
    </div>
  );
}
