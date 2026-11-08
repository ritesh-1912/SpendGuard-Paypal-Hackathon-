"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, X } from "lucide-react";
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
      setError(err.message || "Failed to parse rules");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Configure spending policy</h2>
              <p className="text-xs text-zinc-400">Gemini parses plain language into structured rules. Review before activating.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Textarea */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-200 block">
            1. Spending rules
          </label>
          <textarea
            value={rulesInput}
            onChange={(e) => setRulesInput(e.target.value)}
            rows={3}
            placeholder="e.g. Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
          />

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-zinc-500 self-center mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => setRulesInput("Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100, no Temu or AliExpress.")}
              className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 transition"
            >
              Strict tech ($150)
            </button>
            <button
              type="button"
              onClick={() => setRulesInput("Monthly budget $500 for office supplies and hardware. Auto-approve under $75. Ask over $75. Block anything over $250. Amazon only.")}
              className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 transition"
            >
              Office supplies ($500)
            </button>
            <button
              type="button"
              onClick={() => setRulesInput("Max $60/month for snacks and coffee. Auto-approve up to $15. Ask me if over $15. Block over $30.")}
              className="text-[11px] bg-zinc-950 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 transition"
            >
              Coffee and snacks ($60)
            </button>
          </div>
        </div>

        {/* Parse Button */}
        <div>
          <button
            onClick={handleParse}
            disabled={isParsing || !rulesInput.trim()}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 border border-zinc-700 font-medium px-4 py-2 rounded-lg text-xs transition"
          >
            {isParsing ? "Parsing rules..." : "Parse into policy JSON"}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Step 2: Parsed Policy Review & Confirmation */}
        {parsedPreview && (
          <div className="space-y-4 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                2. Review parsed policy
              </label>
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                Requires confirmation
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase">Monthly budget</span>
                <span className="font-semibold text-zinc-100 font-mono text-xs">${parsedPreview.maxMonthlyBudget}</span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase">Ask above</span>
                <span className="font-semibold text-amber-400 font-mono text-xs">${parsedPreview.requireApprovalAbove}</span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase">Item ceiling</span>
                <span className="font-semibold text-red-400 font-mono text-xs">${parsedPreview.maxItemPrice}</span>
              </div>
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase">Duplicate window</span>
                <span className="font-semibold text-zinc-300 font-mono text-xs">{parsedPreview.allowDuplicatesWithinDays || 7} days</span>
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs space-y-1 font-mono">
              <div>
                <span className="text-zinc-500">Allowed categories: </span>
                <span className="text-zinc-200">{parsedPreview.allowedCategories.join(", ")}</span>
              </div>
              {parsedPreview.blockedCategories && parsedPreview.blockedCategories.length > 0 && (
                <div>
                  <span className="text-zinc-500">Blocked categories: </span>
                  <span className="text-red-400">{parsedPreview.blockedCategories.join(", ")}</span>
                </div>
              )}
              {parsedPreview.blockedMerchants && parsedPreview.blockedMerchants.length > 0 && (
                <div>
                  <span className="text-zinc-500">Blocked merchants: </span>
                  <span className="text-red-400">{parsedPreview.blockedMerchants.join(", ")}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
              Confirming will store these rules in the database and activate them for all future purchase proposals.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3.5 py-1.5 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndActivate}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition"
              >
                {isSaving ? "Activating..." : "Confirm and activate policy"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
