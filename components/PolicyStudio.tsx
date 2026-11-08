"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Code2, 
  SlidersHorizontal,
  FileCheck,
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
      setError(err.message || "Failed to parse rules with Gemini");
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
      setSuccessBanner("Policy successfully confirmed and activated! Guardrail engine is now enforcing these constraints.");
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to activate policy");
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Policy Studio: Plain Language to Deterministic JSON
            </h3>
            <p className="text-xs text-slate-400">Gemini compiles human spending rules into immutable JSON schemas.</p>
          </div>
        </div>

        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-bold self-start sm:self-center">
          Structured Output Compiler
        </span>
      </div>

      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Side-by-Side Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Plain-Language Editor */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Plain-Language Spending Rules
              </label>
              <span className="text-[10px] text-slate-500">Natural language input</span>
            </div>

            <textarea
              value={rawRulesInput}
              onChange={(e) => setRawRulesInput(e.target.value)}
              rows={6}
              placeholder="Type your spending policy..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
            />

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-500 font-medium block">Quick Demo Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRawRulesInput("Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100, no Temu or AliExpress.")}
                  className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                >
                  Strict Tech ($150)
                </button>
                <button
                  type="button"
                  onClick={() => setRawRulesInput("Monthly budget $500 for office supplies and hardware. Auto-approve under $75. Ask over $75. Block anything over $250. Amazon only.")}
                  className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                >
                  Office Supplies ($500)
                </button>
                <button
                  type="button"
                  onClick={() => setRawRulesInput("Max $60/month for snacks and coffee. Auto-approve up to $15. Ask me if over $15. Block anything over $30.")}
                  className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                >
                  Micro-Snacks ($60)
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleParse}
            disabled={isParsing || !rawRulesInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
          >
            {isParsing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Compiling Rules with Gemini...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Compile to Structured JSON
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Right Side: Parsed Structured JSON Viewer */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                2. Structured Policy JSON (Verified Output)
              </label>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Schema v1.0
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden">
              {parsedPolicy ? (
                <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[175px] leading-relaxed">
                  {JSON.stringify(parsedPolicy, null, 2)}
                </pre>
              ) : (
                <div className="py-12 text-center text-slate-600 text-xs font-mono">
                  No policy parsed yet. Type rules on the left and click "Compile to Structured JSON".
                </div>
              )}
            </div>

            {/* Quick Constraint Visualizer */}
            {parsedPolicy && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Monthly Cap</span>
                  <span className="font-bold text-white text-xs">${parsedPolicy.maxMonthlyBudget}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Ask Above</span>
                  <span className="font-bold text-amber-400 text-xs">${parsedPolicy.requireApprovalAbove}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Hard Ceiling</span>
                  <span className="font-bold text-red-400 text-xs">${parsedPolicy.maxItemPrice}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Duplicate Window</span>
                  <span className="font-bold text-slate-300 text-xs">{parsedPolicy.allowDuplicatesWithinDays || 7}d</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirmAndActivate}
            disabled={isActivating || !parsedPolicy}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 mt-2"
          >
            {isActivating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirm & Activate Policy (Make Source of Truth)
          </button>
        </div>

      </div>
    </div>
  );
}
