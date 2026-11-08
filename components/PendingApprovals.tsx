"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  CreditCard,
  Inbox
} from "lucide-react";
import { OrderRecord } from "@/lib/db/schema";
import ProductIcon from "./ProductIcon";

interface Props {
  pendingOrders: OrderRecord[];
  onActionComplete: () => void;
  className?: string;
}

export default function PendingApprovals({
  pendingOrders,
  onActionComplete,
  className = "",
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeApproveUrl, setActiveApproveUrl] = useState<{ id: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(orderId: string) {
    setLoadingId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Approval failed");
      }

      if (data.approveUrl) {
        setActiveApproveUrl({ id: orderId, url: data.approveUrl });
      }
      onActionComplete();
    } catch (err: any) {
      setError(err.message || "Failed to approve order");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(orderId: string) {
    setLoadingId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Rejection failed");
      }
      onActionComplete();
    } catch (err: any) {
      setError(err.message || "Failed to reject order");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Pending approvals
              {pendingOrders.length > 0 && (
                <span className="bg-amber-950/40 text-amber-400 border border-amber-800/60 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  {pendingOrders.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400">Purchases flagged by policy rules for manual review.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {pendingOrders.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 flex items-center justify-center mx-auto">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="text-xs font-medium text-zinc-300">No pending approvals</div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Purchases within auto-approval limits execute directly. Items exceeding thresholds will queue here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((order) => {
            const isProcessing = loadingId === order.id;
            const checkoutSession = activeApproveUrl?.id === order.id ? activeApproveUrl.url : null;
            const isSample = order.product_id?.startsWith("prod_");

            return (
              <div
                key={order.id}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductIcon category={order.category} title={order.product_title} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">
                          {order.merchant}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[10px] text-zinc-400">
                          {order.category}
                        </span>
                        {isSample && (
                          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 py-0.2 rounded">
                            Sample data
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-zinc-100 truncate mt-0.5">
                        {order.product_title}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-zinc-100 font-mono">
                      ${order.product_price.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-zinc-500">{order.currency}</div>
                  </div>
                </div>

                {/* Reason Banner */}
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-2.5 text-xs text-amber-200/90 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                    <span className="font-semibold">Review required</span>
                    <span>Rule: {order.rule_fired}</span>
                  </div>
                  <p className="text-xs leading-normal text-zinc-300">{order.decision_reason}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {!checkoutSession ? (
                    <>
                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={isProcessing}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {isProcessing ? "Rejecting..." : "Reject"}
                      </button>
                      <button
                        onClick={() => handleApprove(order.id)}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isProcessing ? "Creating order..." : `Approve & Pay ($${order.product_price.toFixed(2)})`}
                      </button>
                    </>
                  ) : (
                    <a
                      href={checkoutSession}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Complete sandbox checkout
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
