"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  CreditCard,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { CatalogProduct } from "@/lib/catalog/types";
import { Policy, EvaluationResult } from "@/lib/policy/types";

export default function HomePage() {
  const [budget, setBudget] = useState<{ limit: number; spent: number; remaining: number }>({
    limit: 150,
    spent: 0,
    remaining: 150,
  });
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [rawRules, setRawRules] = useState<string>("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("USB-C hub");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected item & evaluation state
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // PayPal order creation state
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    handleSearch("USB-C hub");
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch("/api/dashboard/metrics");
      const data = await res.json();
      if (data.success) {
        setBudget(data.budget);
        setPolicy(data.policy);
        setRawRules(data.rawRules);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
  }

  async function handleSearch(queryToSearch: string) {
    setIsSearching(true);
    setSearchQuery(queryToSearch);
    setSelectedProduct(null);
    setEvaluation(null);
    setCheckoutUrl(null);
    setOrderError(null);

    try {
      const res = await fetch("/api/catalog/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToSearch }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelectProduct(prod: CatalogProduct) {
    setSelectedProduct(prod);
    setIsEvaluating(true);
    setEvaluation(null);
    setCheckoutUrl(null);
    setOrderError(null);

    try {
      const res = await fetch("/api/orders/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          productTitle: prod.title,
          price: prod.price,
          currency: prod.currency,
          category: prod.category,
          merchantDomain: prod.merchant,
          productUrl: prod.url,
          imageUrl: prod.imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      } else {
        setOrderError(data.error || "Evaluation failed");
      }
    } catch (err: any) {
      setOrderError(err.message || "Failed to evaluate product");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleCreatePayPalOrder(userConfirmed = false) {
    if (!selectedProduct) return;

    setIsCreatingOrder(true);
    setOrderError(null);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal: {
            productId: selectedProduct.id,
            productTitle: selectedProduct.title,
            price: selectedProduct.price,
            currency: selectedProduct.currency,
            category: selectedProduct.category,
            merchantDomain: selectedProduct.merchant,
            productUrl: selectedProduct.url,
            imageUrl: selectedProduct.imageUrl,
          },
          userConfirmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOrderError(data.error || "Order creation rejected");
        return;
      }

      if (data.approveUrl) {
        setCheckoutUrl(data.approveUrl);
        setPaypalOrderId(data.paypalOrderId);
      }
      fetchMetrics();
    } catch (err: any) {
      setOrderError(err.message || "Failed to initiate PayPal order");
    } finally {
      setIsCreatingOrder(false);
    }
  }

  const spendPercent = Math.min(100, Math.round((budget.spent / budget.limit) * 100));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">SpendGuard</h1>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  PayPal AI Hackathon
                </span>
              </div>
              <p className="text-xs text-slate-400">The LLM proposes, deterministic code decides.</p>
            </div>
          </div>

          {/* Budget Widget */}
          <div className="flex items-center gap-6 bg-slate-950/60 border border-slate-800 rounded-xl px-5 py-2.5">
            <div>
              <div className="text-xs font-medium text-slate-400">Monthly Budget (Sandbox)</div>
              <div className="text-base font-bold text-white">
                ${budget.spent.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-400">/ ${budget.limit.toFixed(2)} limit</span>
              </div>
            </div>
            <div className="w-32">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    spendPercent > 85 ? "bg-red-500" : spendPercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${spendPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-slate-400 mt-1">
                ${budget.remaining.toFixed(2)} remaining
              </div>
            </div>
            <button 
              onClick={fetchMetrics} 
              title="Refresh ledger"
              className="text-slate-400 hover:text-white transition p-1"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Active Policy & Product Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Policy Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Active Spending Policy (Deterministic Source of Truth)
              </div>
              <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                ENFORCED
              </span>
            </div>

            <p className="text-sm text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 italic font-mono text-xs mb-3">
              "{rawRules || "Max $150/month, electronics and books only, ask me before anything over $40, hard limit $100 per item, no Temu or AliExpress."}"
            </p>

            {policy && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px] uppercase">Cap / Month</span>
                  <span className="font-semibold text-slate-100">${policy.maxMonthlyBudget} USD</span>
                </div>
                <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px] uppercase">Ask Above</span>
                  <span className="font-semibold text-amber-400">${policy.requireApprovalAbove} USD</span>
                </div>
                <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px] uppercase">Hard Limit</span>
                  <span className="font-semibold text-red-400">${policy.maxItemPrice} USD</span>
                </div>
                <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px] uppercase">Allowed</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {policy.allowedCategories.join(", ")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Product Search Interface */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Channel3 Product Discovery</h2>
                <p className="text-xs text-slate-400">Search products to evaluate against your spending guardrail.</p>
              </div>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Channel3 API
              </span>
            </div>

            {/* Quick Scenario Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 text-xs self-center mr-1">Demo Scenarios:</span>
              <button 
                onClick={() => handleSearch("USB-C hub")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                ⚡ Under $40 (Auto-Approve)
              </button>
              <button 
                onClick={() => handleSearch("mechanical keyboard")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                ⚠️ $65 Keyboard (Needs-Approval)
              </button>
              <button 
                onClick={() => handleSearch("Sony headphones")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                🛑 $348 Headphones (Hard Cap)
              </button>
              <button 
                onClick={() => handleSearch("running shoes")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
              >
                🛑 Apparel (Category Blocked)
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                  placeholder="Search products (e.g. USB-C hub, Python handbook)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-1.5"
              >
                {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
            </div>

            {/* Products List Grid */}
            <div className="space-y-3 pt-2">
              {products.map((item) => {
                const isSelected = selectedProduct?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectProduct(item)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center gap-4 ${
                      isSelected 
                        ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500/50" 
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                    }`}
                  >
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-14 h-14 object-contain rounded-lg bg-white/5 p-1 flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-xs">
                        NO IMG
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          {item.merchant}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-blue-400 font-medium">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-slate-100 truncate mt-0.5">
                        {item.title}
                      </h3>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        ID: {item.id}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-white">
                        ${item.price.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.currency}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Policy Gate & PayPal Sandbox Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Policy Decision Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Guardrail Evaluation
              </h2>
              <span className="text-xs text-slate-400 font-mono">Step 2: Gate</span>
            </div>

            {!selectedProduct ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Select any product on the left to test the deterministic policy engine.
              </div>
            ) : isEvaluating ? (
              <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                Running deterministic checks...
              </div>
            ) : evaluation ? (
              <div className="space-y-4">
                
                {/* Product Summary Header */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Selected Product:</div>
                  <div className="text-sm font-semibold text-white truncate mt-0.5">
                    {selectedProduct.title}
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    ${selectedProduct.price.toFixed(2)} USD • {selectedProduct.category} • {selectedProduct.merchant}
                  </div>
                </div>

                {/* Decision Banner */}
                {evaluation.decision === "AUTO_APPROVE" && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      AUTO_APPROVE
                    </div>
                    <div className="text-xs text-emerald-200/90 leading-relaxed">
                      {evaluation.reason}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400/80 pt-1">
                      Rule: {evaluation.ruleFired}
                    </div>
                  </div>
                )}

                {evaluation.decision === "NEEDS_APPROVAL" && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      NEEDS_APPROVAL
                    </div>
                    <div className="text-xs text-amber-200/90 leading-relaxed">
                      {evaluation.reason}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400/80 pt-1">
                      Rule: {evaluation.ruleFired}
                    </div>
                  </div>
                )}

                {evaluation.decision === "BLOCKED" && (
                  <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldAlert className="h-5 w-5 text-red-400" />
                      BLOCKED BY POLICY
                    </div>
                    <div className="text-xs text-red-200/90 leading-relaxed">
                      {evaluation.reason}
                    </div>
                    <div className="text-[10px] font-mono text-red-400/80 pt-1">
                      Rule: {evaluation.ruleFired}
                    </div>
                    <p className="text-[11px] text-red-400 italic pt-1">
                      * PayPal API is locked. No charges or order creations permitted.
                    </p>
                  </div>
                )}

                {/* PayPal Execution Action Button */}
                {evaluation.decision === "AUTO_APPROVE" && (
                  <div className="pt-2">
                    {!checkoutUrl ? (
                      <button
                        onClick={() => handleCreatePayPalOrder(false)}
                        disabled={isCreatingOrder}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        {isCreatingOrder ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Create PayPal Sandbox Order (${selectedProduct.price.toFixed(2)})
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={checkoutUrl}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-pulse"
                      >
                        Pay with PayPal Sandbox
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                {evaluation.decision === "NEEDS_APPROVAL" && (
                  <div className="pt-2">
                    {!checkoutUrl ? (
                      <button
                        onClick={() => handleCreatePayPalOrder(true)}
                        disabled={isCreatingOrder}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
                      >
                        {isCreatingOrder ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Approve & Proceed to PayPal Sandbox (${selectedProduct.price.toFixed(2)})
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={checkoutUrl}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-pulse"
                      >
                        Complete Sandbox Approval
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                {orderError && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300">
                    {orderError}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Audit Trail Sidebar Widget */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                Immutable Audit Log
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">SQLite</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-slate-500 text-xs py-4 text-center">No logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        log.severity === "WARN" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {log.event_type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-200 text-xs font-medium">
                      {log.summary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
