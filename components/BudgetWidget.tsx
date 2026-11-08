"use client";

import React from "react";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, PieChart } from "lucide-react";
import { OrderRecord } from "@/lib/db/schema";

interface Props {
  limit: number;
  spent: number;
  remaining: number;
  orders?: OrderRecord[];
  className?: string;
}

export default function BudgetWidget({
  limit,
  spent,
  remaining,
  orders = [],
  className = "",
}: Props) {
  const percentUsed = Math.min(100, Math.max(0, Math.round((spent / limit) * 100)));

  // Calculate category breakdown from captured orders
  const categorySpend: Record<string, number> = {};
  orders
    .filter((o) => o.status === "CAPTURED")
    .forEach((o) => {
      const cat = o.category || "other";
      categorySpend[cat] = (categorySpend[cat] || 0) + o.product_price;
    });

  const isWarning = percentUsed >= 65 && percentUsed < 90;
  const isDanger = percentUsed >= 90;

  const barColor = isDanger
    ? "bg-rose-500 shadow-rose-500/50"
    : isWarning
    ? "bg-amber-500 shadow-amber-500/50"
    : "bg-emerald-500 shadow-emerald-500/50";

  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 ${className}`}>
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Monthly Spend vs Budget</h3>
            <p className="text-xs text-slate-400">Sandbox spending ceiling enforced by policy engine.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDanger ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-3 w-3" /> Near Limit
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="h-3 w-3" /> Caution
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Healthy
            </span>
          )}
        </div>
      </div>

      {/* Metrics Counter Grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Budget Cap
          </span>
          <span className="text-lg font-bold text-white font-mono">
            ${limit.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Spent
          </span>
          <span className={`text-lg font-bold font-mono ${isDanger ? "text-rose-400" : isWarning ? "text-amber-400" : "text-white"}`}>
            ${spent.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Remaining
          </span>
          <span className="text-lg font-bold text-emerald-400 font-mono">
            ${remaining.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>{percentUsed}% Utilized</span>
          <span>${remaining.toFixed(2)} Available</span>
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 shadow-md ${barColor}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Spending by Category Breakdown */}
      {Object.keys(categorySpend).length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <PieChart className="h-3.5 w-3.5 text-blue-400" />
            <span>Spend by Category:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(categorySpend).map(([cat, amt]) => {
              const catPercent = Math.round((amt / spent) * 100);
              return (
                <div
                  key={cat}
                  className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2"
                >
                  <span className="capitalize text-slate-300 font-medium">{cat}</span>
                  <span className="font-mono text-emerald-400 font-bold">${amt.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({catPercent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
