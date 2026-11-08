"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Bot, 
  BarChart3, 
  Clock, 
  SlidersHorizontal, 
  RefreshCw,
  Search,
  ExternalLink,
  CreditCard,
  AlertTriangle,
  PackageCheck
} from "lucide-react";
import { Policy } from "@/lib/policy/types";
import { OrderRecord, AuditLogRecord } from "@/lib/db/schema";
import AgentChat from "@/components/AgentChat";
import BudgetWidget from "@/components/BudgetWidget";
import PendingApprovals from "@/components/PendingApprovals";
import AuditLogViewer from "@/components/AuditLogViewer";
import PolicyStudio from "@/components/PolicyStudio";
import ApprovalCard from "@/components/ApprovalCard";
import ProductIcon from "@/components/ProductIcon";
import { CatalogProduct } from "@/lib/catalog/types";

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
  const [isLoading, setIsLoading] = useState(true);

  // Manual catalog test state for Dashboard
  const [catalogQuery, setCatalogQuery] = useState("USB-C hub");
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogProduct | null>(null);
  const [manualEvaluation, setManualEvaluation] = useState<any>(null);

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
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearchCatalog(query: string) {
    setCatalogQuery(query);
    setSelectedCatalogItem(null);
    setManualEvaluation(null);

    try {
      const res = await fetch("/api/catalog/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success) {
        setCatalogProducts(data.products || []);
      }
    } catch (err) {
      console.error("Catalog search error:", err);
    }
  }

  async function handleEvaluateCatalogItem(item: CatalogProduct) {
    setSelectedCatalogItem(item);
    setManualEvaluation(null);

    try {
      const res = await fetch("/api/orders/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.id,
          productTitle: item.title,
          price: item.price,
          currency: item.currency,
          category: item.category,
          merchantDomain: item.merchant,
          productUrl: item.url,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setManualEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error("Catalog item evaluate error:", err);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white tracking-tight">SpendGuard</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                  PayPal AI Hackathon
                </span>
              </div>
              <p className="text-[11px] text-slate-400">The LLM proposes, deterministic code decides.</p>
            </div>
          </div>

          {/* Tab Navigation Navigation Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "chat"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Agent Chat
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
              {pendingOrders.length > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("policy")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "policy"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Policy Studio
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "audit"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Audit Trail
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-2 text-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-medium">Monthly Cap</span>
              <span className="font-bold text-white font-mono">${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}</span>
            </div>
            <button
              onClick={fetchDashboardData}
              title="Refresh live metrics"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-6">
        
        {/* Active Policy Banner */}
        <div className="bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Active Guardrail Policy (Ground Truth)
              </span>
              <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                ENFORCED BY POLICY ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-300 italic font-mono text-[11px]">
              "{rawRules || "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item."}"
            </p>
          </div>

          {policy && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-slate-200">
                Cap: <strong className="text-white">${policy.maxMonthlyBudget}</strong>
              </span>
              <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-amber-400">
                Ask &gt; <strong>${policy.requireApprovalAbove}</strong>
              </span>
              <span className="bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-xl text-red-400">
                Hard Cap: <strong>${policy.maxItemPrice}</strong>
              </span>
              <button
                onClick={() => setActiveTab("policy")}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-sans font-semibold underline underline-offset-2 ml-1"
              >
                Edit in Policy Studio &rarr;
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: Shopping Agent Chat Mode                                           */}
        {/* ========================================================================= */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Agent Chat Feed (8 Cols) */}
            <div className="lg:col-span-8">
              <AgentChat onOrderAction={fetchDashboardData} />
            </div>

            {/* Right Side Support Panel (4 Cols): Budget + Pending Approvals Widget */}
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

        {/* ========================================================================= */}
        {/* TAB 2: Full Spending Dashboard Mode                                       */}
        {/* ========================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Spend vs Budget Summary (6 Cols) */}
              <div className="lg:col-span-6">
                <BudgetWidget
                  limit={budget.limit}
                  spent={budget.spent}
                  remaining={budget.remaining}
                  orders={recentOrders}
                />
              </div>

              {/* Pending Approvals Queue (6 Cols) */}
              <div className="lg:col-span-6">
                <PendingApprovals
                  pendingOrders={pendingOrders}
                  onActionComplete={fetchDashboardData}
                />
              </div>
            </div>

            {/* Recent Captured Orders Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Recent Purchase Orders</h3>
                    <p className="text-xs text-slate-400">Captured and approved transactions recorded in SQLite.</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {recentOrders.length} orders
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No orders have been recorded yet. Use the Agent Chat to purchase products.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                        <th className="pb-3 font-semibold">Item & Category</th>
                        <th className="pb-3 font-semibold">Merchant</th>
                        <th className="pb-3 font-semibold">Price</th>
                        <th className="pb-3 font-semibold">Decision</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">PayPal Capture ID</th>
                        <th className="pb-3 font-semibold text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-950/40 transition">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2.5">
                              <ProductIcon category={order.category} title={order.product_title} size="sm" />
                              <span className="font-semibold text-white max-w-[200px] truncate" title={order.product_title}>
                                {order.product_title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-slate-400 font-mono text-[11px]">
                            {order.merchant}
                          </td>
                          <td className="py-3 font-bold font-mono text-white">
                            ${order.product_price.toFixed(2)}
                          </td>
                          <td className="py-3">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              order.decision === "AUTO_APPROVE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : order.decision === "NEEDS_APPROVAL"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {order.decision}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[11px]">
                            <span className={`px-2 py-0.5 rounded-full ${
                              order.status === "CAPTURED"
                                ? "bg-emerald-500/10 text-emerald-400 font-bold"
                                : order.status === "PENDING_APPROVAL"
                                ? "bg-amber-500/10 text-amber-400 font-bold"
                                : "text-slate-400"
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-400 max-w-[140px] truncate">
                            {order.paypal_capture_id || (order.paypal_order_id ? `Order: ${order.paypal_order_id}` : "—")}
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[10px] text-right">
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

        {/* ========================================================================= */}
        {/* TAB 3: Side-by-Side Policy Studio Mode                                     */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* TAB 4: Full Audit Trail Mode                                              */}
        {/* ========================================================================= */}
        {activeTab === "audit" && (
          <AuditLogViewer logs={auditLogs} />
        )}

      </div>
    </main>
  );
}
