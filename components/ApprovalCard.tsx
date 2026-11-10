"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  ExternalLink, 
  Lock
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
          idempotencyKey: `proposal_${proposal.productId}_${proposal.price}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order creation rejected by policy engine.");
      }

      if (data.approveUrl) {
        setApproveUrl(data.approveUrl);
        if (onOrderCreated) {
          onOrderCreated(data.paypalOrderId, data.approveUrl);
        }
      }
    } catch (err: any) {
      setError(err.message || "Could not create PayPal order. Check your credentials.");
    } finally {
      setIsCreating(false);
    }
  }

  const isAuto = evaluation.decision === "AUTO_APPROVE";
  const isNeeds = evaluation.decision === "NEEDS_APPROVAL";
  const isBlocked = evaluation.decision === "BLOCKED";

  const cardBorder = isAuto
    ? "border-emerald-900/60 bg-zinc-900"
    : isNeeds
    ? "border-amber-900/60 bg-zinc-900"
    : "border-red-900/60 bg-zinc-900";

  const statusBadge = isAuto
    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
    : isNeeds
    ? "bg-amber-950 text-amber-400 border-amber-800"
    : "bg-red-950 text-red-400 border-red-800";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cardBorder} ${className}`}>
      
      {/* Product Meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ProductIcon category={proposal.category} title={proposal.productTitle} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400 font-mono">
              <span className="truncate max-w-[140px]" title={proposal.merchantDomain}>{proposal.merchantDomain}</span>
              <span>/</span>
              <span className="capitalize">{proposal.category}</span>
              {proposal.isSample && (
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 py-0.2 rounded whitespace-nowrap">
                  Sample data
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-zinc-100 truncate mt-0.5" title={proposal.productTitle}>
              {proposal.productTitle}
            </h4>
          </div>
        </div>

        <div className="text-right flex-shrink-0 pl-2">
          <div className="text-sm font-semibold text-zinc-100 font-mono whitespace-nowrap">
            ${proposal.price.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-400">
            {proposal.currency}
          </div>
        </div>
      </div>

      {/* Decision Block */}
      <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${statusBadge}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-mono">
          <div className="flex items-center gap-1.5 font-semibold text-xs tracking-wide">
            {isAuto && <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />}
            {isNeeds && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
            {isBlocked && <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />}
            <span>{evaluation.decision}</span>
          </div>
          <span className="text-[10px] opacity-80 truncate max-w-[220px]" title={evaluation.ruleFired}>
            {evaluation.ruleFired}
          </span>
        </div>

        <p className="text-zinc-200 text-xs leading-normal break-words">
          {evaluation.reason}
        </p>

        {isBlocked && (
          <div className="pt-0.5 text-[11px] text-red-300 flex items-center gap-1.5 flex-wrap">
            <Lock className="h-3 w-3 flex-shrink-0" />
            <span>Purchase blocked. The payment gateway was not contacted.</span>
          </div>
        )}
      </div>

      {/* Action Block */}
      {!isBlocked && (
        <div>
          {!approveUrl ? (
            <button
              onClick={() => handleProceed(isNeeds)}
              disabled={isCreating}
              className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                isAuto
                  ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  : "bg-amber-600 text-white hover:bg-amber-500"
              }`}
            >
              {isCreating ? (
                "Creating order..."
              ) : isAuto ? (
                `Create PayPal sandbox order ($${proposal.price.toFixed(2)})`
              ) : (
                `Approve and create order ($${proposal.price.toFixed(2)})`
              )}
            </button>
          ) : (
            <a
              href={approveUrl}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>Pay in PayPal sandbox</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="p-2 rounded-lg bg-red-950/40 border border-red-900 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
