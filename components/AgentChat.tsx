"use client";

import React, { useState } from "react";
import { 
  Send, 
  Bot, 
  User, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  CreditCard, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw,
  Sparkles,
  Search
} from "lucide-react";
import { PurchaseProposal, EvaluationResult } from "@/lib/policy/types";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  toolsUsed?: string[];
  proposal?: PurchaseProposal | null;
  evaluation?: EvaluationResult | null;
  paypalApproveUrl?: string | null;
  paypalOrderId?: string | null;
}

interface Props {
  onOrderAction: () => void;
}

export default function AgentChat({ onOrderAction }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_welcome",
      sender: "agent",
      text: "Hello! I am your SpendGuard Shopping Agent. Tell me what you'd like to buy (e.g. 'Buy a USB-C hub under $40'), and I'll find products via Channel3 and evaluate them through your guardrail rules before PayPal is charged.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function handleSend(promptText?: string) {
    const textToSend = promptText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const historyPayload = messages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        content: m.text,
      }));

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Agent request failed");
      }

      const agentMsg: Message = {
        id: `agent_${Date.now()}`,
        sender: "agent",
        text: data.reply,
        toolsUsed: data.toolsUsed,
        proposal: data.proposal,
        evaluation: data.evaluation,
      };

      setMessages((prev) => [...prev, agentMsg]);
      onOrderAction();
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "agent",
          text: `⚠️ Error: ${err.message || "Failed to process request."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInitiatePayPal(msgId: string, proposal: PurchaseProposal, userConfirmed = false) {
    setActionLoadingId(msgId);
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

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, paypalApproveUrl: data.approveUrl, paypalOrderId: data.paypalOrderId }
            : m
        )
      );
      onOrderAction();
    } catch (err: any) {
      alert(`PayPal Order Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Gemini Shopping Agent
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                Function Calling Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">LLM proposes candidates; policy engine decides approval.</p>
          </div>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Try asking:</span>
        <button
          onClick={() => handleSend("Buy an Anker USB-C hub under $40")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          ⚡ USB-C Hub ($39.99 Auto-Approve)
        </button>
        <button
          onClick={() => handleSend("Buy a Keychron mechanical keyboard around $65")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          ⚠️ Keychron Keyboard ($64.99 Needs-Approval)
        </button>
        <button
          onClick={() => handleSend("Buy Nike running shoes")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          🛑 Nike Shoes (Blocked Category)
        </button>
        <button
          onClick={() => handleSend("Buy Sony noise canceling headphones")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          🛑 Sony Headphones (Hard Cap $100)
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/20 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-2.5 ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Tool Badges */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Tools invoked: {m.toolsUsed.map((t) => (
                        <span key={t} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {t}()
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Candidate Proposal Card with Deterministic Policy Gate */}
                {m.proposal && m.evaluation && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {m.proposal.imageUrl && (
                          <img
                            src={m.proposal.imageUrl}
                            alt={m.proposal.productTitle}
                            className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1 border border-slate-800"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-slate-400">
                              {m.proposal.merchantDomain}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-blue-400 font-medium">
                              {m.proposal.category}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">
                            {m.proposal.productTitle}
                          </h4>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-white font-mono">
                          ${m.proposal.price.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">{m.proposal.currency}</div>
                      </div>
                    </div>

                    {/* Deterministic Policy Decision Pill */}
                    {m.evaluation.decision === "AUTO_APPROVE" && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          AUTO_APPROVE
                        </div>
                        <div className="text-[11px] text-emerald-200/90 leading-normal">
                          {m.evaluation.reason}
                        </div>
                        <div className="text-[9px] font-mono text-emerald-400/80 pt-0.5">
                          Rule fired: {m.evaluation.ruleFired}
                        </div>
                      </div>
                    )}

                    {m.evaluation.decision === "NEEDS_APPROVAL" && (
                      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          NEEDS_APPROVAL (Threshold Exceeded)
                        </div>
                        <div className="text-[11px] text-amber-200/90 leading-normal">
                          {m.evaluation.reason}
                        </div>
                        <div className="text-[9px] font-mono text-amber-400/80 pt-0.5">
                          Rule fired: {m.evaluation.ruleFired}
                        </div>
                      </div>
                    )}

                    {m.evaluation.decision === "BLOCKED" && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <ShieldAlert className="h-4 w-4 text-red-400" />
                          BLOCKED BY POLICY ENGINE
                        </div>
                        <div className="text-[11px] text-red-200/90 leading-normal">
                          {m.evaluation.reason}
                        </div>
                        <div className="text-[9px] font-mono text-red-400/80 pt-0.5">
                          Rule fired: {m.evaluation.ruleFired}
                        </div>
                        <p className="text-[10px] text-red-400/80 italic pt-1">
                          * PayPal checkout locked. Pure code rejected this purchase.
                        </p>
                      </div>
                    )}

                    {/* PayPal Action Buttons */}
                    {m.evaluation.decision === "AUTO_APPROVE" && (
                      <div>
                        {!m.paypalApproveUrl ? (
                          <button
                            onClick={() => handleInitiatePayPal(m.id, m.proposal!, false)}
                            disabled={actionLoadingId === m.id}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                          >
                            {actionLoadingId === m.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="h-3.5 w-3.5" />
                                Create PayPal Sandbox Order (${m.proposal.price.toFixed(2)})
                              </>
                            )}
                          </button>
                        ) : (
                          <a
                            href={m.paypalApproveUrl}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-pulse"
                          >
                            Pay with PayPal Sandbox
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {m.evaluation.decision === "NEEDS_APPROVAL" && (
                      <div>
                        {!m.paypalApproveUrl ? (
                          <button
                            onClick={() => handleInitiatePayPal(m.id, m.proposal!, true)}
                            disabled={actionLoadingId === m.id}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
                          >
                            {actionLoadingId === m.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve & Pay with PayPal Sandbox (${m.proposal.price.toFixed(2)})
                              </>
                            )}
                          </button>
                        ) : (
                          <a
                            href={m.paypalApproveUrl}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 animate-pulse"
                          >
                            Complete Sandbox Approval
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 border border-slate-700 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
              Agent is searching Channel3 and evaluating spending guardrails...
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 rounded-b-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask agent: 'buy a USB-C hub under $40' or 'find a Python book'..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
