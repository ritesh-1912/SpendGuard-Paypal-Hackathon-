"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
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
    <div className={`bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Pending Approvals Queue
              {pendingOrders.length > 0 && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  {pendingOrders.length} Waiting
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Items flagged by deterministic guardrails for explicit review.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {pendingOrders.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-800/50 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="text-sm font-semibold text-slate-300">No Pending Approvals</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All shopping purchases within rule limits auto-approve. When a proposal exceeds your threshold or needs confirmation, it queues here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((order) => {
            const isProcessing = loadingId === order.id;
            const checkoutSession = activeApproveUrl?.id === order.id ? activeApproveUrl.url : null;

            return (
              <div
                key={order.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductIcon category={order.category} title={order.product_title} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {order.merchant}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[10px] text-blue-400 font-medium">
                          {order.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate mt-0.5">
                        {order.product_title}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold text-white font-mono">
                      ${order.product_price.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">{order.currency}</div>
                  </div>
                </div>

                {/* Reason Banner */}
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200/90 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                    <span className="font-bold">GUARDRAIL FLAGGED</span>
                    <span>Rule: {order.rule_fired}</span>
                  </div>
                  <p className="text-xs leading-normal">{order.decision_reason}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {!checkoutSession ? (
                    <>
                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={isProcessing}
                        className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(order.id)}
                        disabled={isProcessing}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve & Pay (${order.product_price.toFixed(2)})
                      </button>
                    </>
                  ) : (
                    <a
                      href={checkoutSession}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20 animate-pulse"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Complete Sandbox Checkout
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
