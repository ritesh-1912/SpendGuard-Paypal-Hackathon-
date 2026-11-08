"use client";

import React, { useState } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw,
  Search,
  MessageSquare
} from "lucide-react";
import { PurchaseProposal, EvaluationResult } from "@/lib/policy/types";
import ApprovalCard from "./ApprovalCard";

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
  className?: string;
}

export default function AgentChat({ onOrderAction, className = "" }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_welcome",
      sender: "agent",
      text: "Hello! I am your SpendGuard Shopping Agent. Tell me what you need to purchase (e.g. 'buy a USB-C hub under $40' or 'find a mechanical keyboard'), and I will discover products and submit every purchase proposal through your deterministic policy engine before any PayPal charge occurs.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
          text: `⚠️ Agent Error: ${err.message || "Failed to process request."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOrderCreated(msgId: string, paypalOrderId: string, approveUrl: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, paypalOrderId, paypalApproveUrl: approveUrl } : m
      )
    );
    onOrderAction();
  }

  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col h-[650px] shadow-sm ${className}`}>
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Gemini AI Shopping Agent
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                Guardrail Intercept Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">LLM proposes candidates $\rightarrow$ Pure code decides approval.</p>
          </div>
        </div>
      </div>

      {/* Suggested Scenario Buttons */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Suggested:</span>
        <button
          onClick={() => handleSend("Buy a multiport USB-C hub under $40")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          ⚡ USB-C Hub ($39.99 Auto-Approve)
        </button>
        <button
          onClick={() => handleSend("Buy a mechanical keyboard around $65")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          ⚠️ Keyboard ($64.99 Needs-Approval)
        </button>
        <button
          onClick={() => handleSend("Buy lightweight running shoes")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          🛑 Running Shoes (Blocked Category)
        </button>
        <button
          onClick={() => handleSend("Buy studio noise-cancelling headphones")}
          className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition whitespace-nowrap"
        >
          🛑 Studio Headphones (Hard Cap $100)
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="h-8 w-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-3 ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md"
                      : "bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Tool Invocations Badge */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      Tools invoked: {m.toolsUsed.map((t) => (
                        <span key={t} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {t}()
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Approval Card */}
                {m.proposal && m.evaluation && (
                  <ApprovalCard
                    proposal={m.proposal}
                    evaluation={m.evaluation}
                    initialApproveUrl={m.paypalApproveUrl}
                    onOrderCreated={(paypalOrderId, approveUrl) =>
                      handleOrderCreated(m.id, paypalOrderId, approveUrl)
                    }
                  />
                )}
              </div>

              {isUser && (
                <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="h-8 w-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-md">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
              <span>Querying Channel3 catalog & evaluating guardrail rules...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 rounded-b-3xl">
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
            placeholder="Ask agent: 'buy a USB-C hub under $40' or 'find a coding handbook'..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
