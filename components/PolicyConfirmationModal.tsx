"use client";

import React, { useState } from "react";
import { Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, X, RefreshCw } from "lucide-react";
import { Policy } from "@/lib/policy/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPolicyConfirmed: (policy: Policy, rawRules: string) => void;
  currentRawRules?: string;
}

export default function PolicyConfirmationModal({
  isOpen,
  onClose,
  onPolicyConfirmed,
  currentRawRules = "",
}: Props) {
  const [rulesInput, setRulesInput] = useState(
    currentRawRules ||
      "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress."
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  async function handleParse() {
    setIsParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/policy/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawRules: rulesInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse rules");
      }
      setParsedPreview(data.parsedPolicy);
    } catch (err: any) {
      setError(err.message || "Failed to parse rules with Gemini");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirmAndActivate() {
    if (!parsedPreview) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: parsedPreview,
          rawRules: rulesInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate policy");
      }
      onPolicyConfirmed(data.policy, rulesInput);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to activate policy");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configure Spending Guardrails</h2>
              <p className="text-xs text-slate-400">Gemini converts plain language into deterministic policy rules.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Textarea */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
            Step 1: Define Rules in Plain English
          </label>
          <textarea
            value={rulesInput}
            onChange={(e) => setRulesInput(e.target.value)}
            rows={3}
            placeholder="e.g. Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
          />

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 self-center mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => setRulesInput("Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100, no Temu or AliExpress.")}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
            >
              Strict Tech ($150)
            </button>
            <button
              type="button"
              onClick={() => setRulesInput("Monthly budget $500 for office supplies and hardware. Auto-approve under $75. Ask over $75. Block anything over $250. Amazon only.")}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
            >
              Office Supplies ($500)
            </button>
            <button
              type="button"
              onClick={() => setRulesInput("Max $60/month for snacks and coffee. Auto-approve up to $15. Ask me if over $15. Block over $30.")}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
            >
              Micro-Snacks ($60)
            </button>
          </div>
        </div>

        {/* Parse Button */}
        <div>
          <button
            onClick={handleParse}
            disabled={isParsing || !rulesInput.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2"
          >
            {isParsing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Parsing with Gemini Structured Output...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Parse Rules with Gemini
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Step 2: Parsed Policy Review & Confirmation */}
        {parsedPreview && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Step 2: Review Structured Policy (Confirmation Required)
              </label>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                VALIDATED SCHEMA
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Monthly Budget</span>
                <span className="font-bold text-white text-sm">${parsedPreview.maxMonthlyBudget} USD</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Ask Above</span>
                <span className="font-bold text-amber-400 text-sm">${parsedPreview.requireApprovalAbove} USD</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Hard Item Limit</span>
                <span className="font-bold text-red-400 text-sm">${parsedPreview.maxItemPrice} USD</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Duplicate Window</span>
                <span className="font-bold text-slate-200 text-sm">{parsedPreview.allowDuplicatesWithinDays || 7} Days</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div>
                <span className="text-slate-400">Allowed Categories: </span>
                <span className="text-emerald-400 font-semibold">{parsedPreview.allowedCategories.join(", ")}</span>
              </div>
              {parsedPreview.blockedCategories && parsedPreview.blockedCategories.length > 0 && (
                <div>
                  <span className="text-slate-400">Blocked Categories: </span>
                  <span className="text-red-400">{parsedPreview.blockedCategories.join(", ")}</span>
                </div>
              )}
              {parsedPreview.blockedMerchants && parsedPreview.blockedMerchants.length > 0 && (
                <div>
                  <span className="text-slate-400">Blocked Merchants: </span>
                  <span className="text-red-400">{parsedPreview.blockedMerchants.join(", ")}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Confirmation Safety Gate:</strong> This policy will not take effect until you confirm. Once confirmed, it becomes the immutable deterministic ground truth for all purchase decisions.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndActivate}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirm & Activate Policy
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
