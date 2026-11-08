"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  ArrowRight, 
  Code2, 
  SlidersHorizontal,
  AlertCircle
} from "lucide-react";
import { Policy } from "@/lib/policy/types";

interface Props {
  currentPolicy: Policy | null;
  currentRawRules: string;
  onPolicyActivated: (policy: Policy, rawRules: string) => void;
  className?: string;
}

export default function PolicyStudio({
  currentPolicy,
  currentRawRules,
  onPolicyActivated,
  className = "",
}: Props) {
  const [rawRulesInput, setRawRulesInput] = useState(
    currentRawRules ||
      "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress."
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPolicy, setParsedPolicy] = useState<Policy | null>(currentPolicy);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  async function handleParse() {
    setIsParsing(true);
    setError(null);
    setSuccessBanner(null);

    try {
      const res = await fetch("/api/policy/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawRules: rawRulesInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse rules");
      }

      setParsedPolicy(data.parsedPolicy);
    } catch (err: any) {
      setError(err.message || "Failed to parse rules");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirmAndActivate() {
    if (!parsedPolicy) return;
    setIsActivating(true);
    setError(null);

    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: parsedPolicy,
          rawRules: rawRulesInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate policy");
      }

      onPolicyActivated(data.policy, rawRulesInput);
      setSuccessBanner("Policy confirmed and active. The policy engine now evaluates against these rules.");
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to activate policy");
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Policy editor
            </h3>
            <p className="text-xs text-zinc-400">Convert plain-language rules to structured JSON evaluated by deterministic code.</p>
          </div>
        </div>

        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded self-start sm:self-center">
          Schema v1.0
        </span>
      </div>

      {successBanner && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Side-by-Side Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left Side: Plain-Language Editor */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200">
                1. Plain-language rules
              </label>
              <span className="text-[10px] text-zinc-500">Natural language</span>
            </div>

            <textarea
              value={rawRulesInput}
              onChange={(e) => setRawRulesInput(e.target.value)}
              rows={5}
              placeholder="Enter spending rules..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 leading-relaxed font-sans"
            />

            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-500">Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRawRulesInput("Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100, no Temu or AliExpress.")}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 transition"
                >
                  Strict tech ($150)
                </button>
                <button
                  type="button"
                  onClick={() => setRawRulesInput("Monthly budget $500 for office supplies and hardware. Auto-approve under $75. Ask over $75. Block anything over $250. Amazon only.")}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 transition"
                >
                  Office supplies ($500)
                </button>
                <button
                  type="button"
                  onClick={() => setRawRulesInput("Max $60/month for snacks and coffee. Auto-approve up to $15. Ask me if over $15. Block anything over $30.")}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 transition"
                >
                  Coffee and snacks ($60)
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleParse}
            disabled={isParsing || !rawRulesInput.trim()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 font-medium py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2 border border-zinc-700"
          >
            {isParsing ? "Parsing rules..." : "Parse into policy JSON"}
            {!isParsing && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Right Side: Parsed Structured JSON Viewer */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-zinc-400" />
                2. Parsed JSON policy
              </label>
              <span className="text-[10px] font-mono text-zinc-500">
                Deterministic
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              {parsedPolicy ? (
                <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[160px] leading-relaxed">
                  {JSON.stringify(parsedPolicy, null, 2)}
                </pre>
              ) : (
                <div className="py-10 text-center text-zinc-500 text-xs font-mono">
                  No policy parsed yet. Enter rules on the left and click "Parse into policy JSON".
                </div>
              )}
            </div>

            {/* Quick Constraint Visualizer */}
            {parsedPolicy && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">Monthly cap</span>
                  <span className="font-semibold text-zinc-100 text-xs font-mono">${parsedPolicy.maxMonthlyBudget}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">Ask above</span>
                  <span className="font-semibold text-amber-400 text-xs font-mono">${parsedPolicy.requireApprovalAbove}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">Item ceiling</span>
                  <span className="font-semibold text-red-400 text-xs font-mono">${parsedPolicy.maxItemPrice}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">Duplicate window</span>
                  <span className="font-semibold text-zinc-300 text-xs font-mono">{parsedPolicy.allowDuplicatesWithinDays || 7}d</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirmAndActivate}
            disabled={isActivating || !parsedPolicy}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2"
          >
            {isActivating ? "Activating..." : "Confirm and activate policy"}
            {!isActivating && <CheckCircle2 className="h-3.5 w-3.5" />}
          </button>
        </div>

      </div>
    </div>
  );
}
