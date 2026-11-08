"use client";

import React from "react";
import { DollarSign, AlertCircle, CheckCircle2, PieChart } from "lucide-react";
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
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5 ${className}`}>
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Monthly spend vs budget</h3>
            <p className="text-xs text-zinc-400">Sandbox spending ceiling enforced by policy engine.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDanger ? (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-950/40 text-red-400 border border-red-800/60">
              <AlertCircle className="h-3 w-3" /> Near limit
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-950/40 text-amber-400 border border-amber-800/60">
              <AlertCircle className="h-3 w-3" /> Caution
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
              <CheckCircle2 className="h-3 w-3" /> Within budget
            </span>
          )}
        </div>
      </div>

      {/* Metrics Counter Grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
            Budget cap
          </span>
          <span className="text-base font-semibold text-zinc-100 font-mono">
            ${limit.toFixed(2)}
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
            Total spent
          </span>
          <span className={`text-base font-semibold font-mono ${isDanger ? "text-red-400" : isWarning ? "text-amber-400" : "text-zinc-100"}`}>
            ${spent.toFixed(2)}
          </span>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block mb-1">
            Remaining
          </span>
          <span className="text-base font-semibold text-emerald-400 font-mono">
            ${remaining.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{percentUsed}% used</span>
          <span>${remaining.toFixed(2)} remaining</span>
        </div>
        <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Spending by Category Breakdown */}
      {Object.keys(categorySpend).length > 0 && (
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <PieChart className="h-3.5 w-3.5 text-zinc-400" />
            <span>Spend by category</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(categorySpend).map(([cat, amt]) => {
              const catPercent = Math.round((amt / spent) * 100);
              return (
                <div
                  key={cat}
                  className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md text-xs flex items-center gap-2"
                >
                  <span className="capitalize text-zinc-300">{cat}</span>
                  <span className="font-mono text-emerald-400 font-medium">${amt.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">({catPercent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
