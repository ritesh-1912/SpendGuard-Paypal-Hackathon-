"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Bot, 
  BarChart3, 
  Clock, 
  SlidersHorizontal, 
  RefreshCw,
  PackageCheck
} from "lucide-react";
import { Policy } from "@/lib/policy/types";
import { OrderRecord, AuditLogRecord } from "@/lib/db/schema";
import AgentChat from "@/components/AgentChat";
import BudgetWidget from "@/components/BudgetWidget";
import PendingApprovals from "@/components/PendingApprovals";
import AuditLogViewer from "@/components/AuditLogViewer";
import PolicyStudio from "@/components/PolicyStudio";
import ProductIcon from "@/components/ProductIcon";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard" | "audit" | "policy">("chat");

  const [budget, setBudget] = useState<{ limit: number; spent: number; remaining: number }>({
    limit: 150,
    spent: 0,
    remaining: 150,
  });
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [rawRules, setRawRules] = useState<string>("");
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [pendingOrders, setPendingOrders] = useState<OrderRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch("/api/dashboard/metrics");
      const data = await res.json();
      if (data.success) {
        setBudget(data.budget);
        setPolicy(data.policy);
        setRawRules(data.rawRules);
        setRecentOrders(data.recentOrders || []);
        setPendingOrders(data.pendingOrders || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch {
      // Handled silently for periodic dashboard sync
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-zinc-100 tracking-tight">SpendGuard</span>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded font-mono">
                  PayPal AI Hackathon
                </span>
              </div>
              <p className="text-xs text-zinc-400">The LLM proposes, deterministic code decides.</p>
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === "chat"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
              {pendingOrders.length > 0 && (
                <span className="bg-amber-400 text-zinc-950 text-[9px] px-1.5 py-0.2 rounded-full font-semibold">
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("policy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === "policy"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Policy
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === "audit"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Audit log
            </button>
          </div>

          {/* Monthly Budget Metric */}
          <div className="hidden lg:flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-zinc-400">Monthly budget</span>
              <span className="font-semibold text-zinc-100 font-mono">${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              title="Refresh"
              className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-6">
        
        {/* Active Policy Status Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Active spending policy
              </span>
              <span className="text-[9px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                Deterministic
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono text-[11px]">
              "{rawRules || "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item."}"
            </p>
          </div>

          {policy && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                Cap: <strong className="text-zinc-100 font-medium">${policy.maxMonthlyBudget}</strong>
              </span>
              <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-amber-400">
                Ask &gt; <strong>${policy.requireApprovalAbove}</strong>
              </span>
              <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-red-400">
                Ceiling: <strong>${policy.maxItemPrice}</strong>
              </span>
              <button
                onClick={() => setActiveTab("policy")}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-sans font-medium underline underline-offset-2 ml-1"
              >
                Edit policy
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Chat */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <AgentChat onOrderAction={fetchDashboardData} />
            </div>

            <div className="lg:col-span-4 space-y-6">
              <BudgetWidget
                limit={budget.limit}
                spent={budget.spent}
                remaining={budget.remaining}
                orders={recentOrders}
              />

              {pendingOrders.length > 0 && (
                <PendingApprovals
                  pendingOrders={pendingOrders}
                  onActionComplete={fetchDashboardData}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <BudgetWidget
                  limit={budget.limit}
                  spent={budget.spent}
                  remaining={budget.remaining}
                  orders={recentOrders}
                />
              </div>

              <div className="lg:col-span-6">
                <PendingApprovals
                  pendingOrders={pendingOrders}
                  onActionComplete={fetchDashboardData}
                />
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
                    <PackageCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">Recent orders</h3>
                    <p className="text-xs text-zinc-400">Captured and approved transactions recorded in SQLite.</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {recentOrders.length} orders
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs">
                  No orders recorded yet. Use the Chat tab to start purchases.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                        <th className="pb-2.5 font-medium">Item</th>
                        <th className="pb-2.5 font-medium">Merchant</th>
                        <th className="pb-2.5 font-medium">Price</th>
                        <th className="pb-2.5 font-medium">Decision</th>
                        <th className="pb-2.5 font-medium">Status</th>
                        <th className="pb-2.5 font-medium">Capture ID</th>
                        <th className="pb-2.5 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-zinc-950 transition">
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2.5">
                              <ProductIcon category={order.category} title={order.product_title} size="sm" />
                              <span className="font-medium text-zinc-100 max-w-[200px] truncate" title={order.product_title}>
                                {order.product_title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 text-zinc-400 font-mono text-[11px]">
                            {order.merchant}
                          </td>
                          <td className="py-2.5 font-medium font-mono text-zinc-100">
                            ${order.product_price.toFixed(2)}
                          </td>
                          <td className="py-2.5">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              order.decision === "AUTO_APPROVE"
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60"
                                : order.decision === "NEEDS_APPROVAL"
                                ? "bg-amber-950/40 text-amber-400 border-amber-800/60"
                                : "bg-red-950/40 text-red-400 border-red-800/60"
                            }`}>
                              {order.decision}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-[11px]">
                            <span className={`px-1.5 py-0.5 rounded ${
                              order.status === "CAPTURED"
                                ? "bg-emerald-950/40 text-emerald-400"
                                : order.status === "PENDING_APPROVAL"
                                ? "bg-amber-950/40 text-amber-400"
                                : "text-zinc-400"
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-[11px] text-zinc-400 max-w-[140px] truncate">
                            {order.paypal_capture_id || (order.paypal_order_id ? `Order: ${order.paypal_order_id}` : "—")}
                          </td>
                          <td className="py-2.5 text-zinc-500 font-mono text-[10px] text-right">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Policy Studio */}
        {activeTab === "policy" && (
          <PolicyStudio
            currentPolicy={policy}
            currentRawRules={rawRules}
            onPolicyActivated={(newPolicy, newRawRules) => {
              setPolicy(newPolicy);
              setRawRules(newRawRules);
              fetchDashboardData();
            }}
          />
        )}

        {/* Tab 4: Audit Log */}
        {activeTab === "audit" && (
          <AuditLogViewer logs={auditLogs} />
        )}

      </div>
    </main>
  );
}
