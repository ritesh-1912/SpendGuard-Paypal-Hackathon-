"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CreditCard, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw,
  Lock,
  Tag
} from "lucide-react";
import { PurchaseProposal, EvaluationResult } from "@/lib/policy/types";
import ProductIcon from "./ProductIcon";

interface Props {
  proposal: PurchaseProposal;
  evaluation: EvaluationResult;
  onOrderCreated?: (paypalOrderId: string, approveUrl: string) => void;
  initialApproveUrl?: string | null;
  className?: string;
}

export default function ApprovalCard({
  proposal,
  evaluation,
  onOrderCreated,
  initialApproveUrl = null,
  className = "",
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [approveUrl, setApproveUrl] = useState<string | null>(initialApproveUrl);
  const [error, setError] = useState<string | null>(null);

  async function handleProceed(userConfirmed = false) {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal,
          userConfirmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order creation rejected");
      }

      if (data.approveUrl) {
        setApproveUrl(data.approveUrl);
        if (onOrderCreated) {
          onOrderCreated(data.paypalOrderId, data.approveUrl);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to create PayPal sandbox order");
    } finally {
      setIsCreating(false);
    }
  }

  const isAuto = evaluation.decision === "AUTO_APPROVE";
  const isNeeds = evaluation.decision === "NEEDS_APPROVAL";
  const isBlocked = evaluation.decision === "BLOCKED";

  const cardTheme = isAuto
    ? "border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-emerald-950/20"
    : isNeeds
    ? "border-amber-500/30 bg-gradient-to-b from-slate-900/90 to-amber-950/20"
    : "border-red-500/30 bg-gradient-to-b from-slate-900/90 to-red-950/20";

  const badgeTheme = isAuto
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isNeeds
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-red-500/10 text-red-400 border-red-500/30";

  return (
    <div className={`rounded-2xl border p-4 shadow-xl space-y-3.5 transition-all ${cardTheme} ${className}`}>
      
      {/* Top Meta Bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProductIcon category={proposal.category} title={proposal.productTitle} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {proposal.merchantDomain}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-blue-400 font-medium">
                {proposal.category}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-0.5" title={proposal.productTitle}>
              {proposal.productTitle}
            </h4>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold text-white font-mono">
            ${proposal.price.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {proposal.currency}
          </div>
        </div>
      </div>

      {/* Decision Banner */}
      <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${badgeTheme}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold tracking-tight">
            {isAuto && <ShieldCheck className="h-4 w-4" />}
            {isNeeds && <AlertTriangle className="h-4 w-4" />}
            {isBlocked && <ShieldAlert className="h-4 w-4" />}
            <span>{evaluation.decision}</span>
          </div>
          <span className="text-[10px] font-mono opacity-80 flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {evaluation.ruleFired}
          </span>
        </div>

        <p className="text-slate-200 text-xs leading-relaxed pt-0.5">
          {evaluation.reason}
        </p>

        {isBlocked && (
          <div className="pt-1 text-[11px] text-red-400/90 flex items-center gap-1 font-medium">
            <Lock className="h-3.5 w-3.5" />
            <span>Deterministic Gate: PayPal API is strictly locked for this transaction.</span>
          </div>
        )}
      </div>

      {/* Action Section */}
      {!isBlocked && (
        <div className="pt-1">
          {!approveUrl ? (
            <button
              onClick={() => handleProceed(isNeeds)}
              disabled={isCreating}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                isAuto
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
              }`}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating PayPal Sandbox Session...
                </>
              ) : isAuto ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  Create PayPal Sandbox Order (${proposal.price.toFixed(2)})
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Proceed to PayPal Sandbox (${proposal.price.toFixed(2)})
                </>
              )}
            </button>
          ) : (
            <a
              href={approveUrl}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-pulse"
            >
              <span>Pay with PayPal Sandbox</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-[11px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
