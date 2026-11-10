"use client";

import React, { useState } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Terminal
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
      text: "Tell me what you want to purchase (for example, 'buy a USB-C hub under $40' or 'find a mechanical keyboard'). Every purchase proposal is evaluated by deterministic policy rules before any PayPal order is created.",
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
          text: `Error: ${err.message || "Failed to process request."}`,
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
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-[640px] ${className}`}>
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Shopping agent
              <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono">
                Policy engine active
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Agent proposes products; deterministic policy code decides.</p>
          </div>
        </div>
      </div>

      {/* Suggested Scenario Buttons */}
      <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-zinc-500 whitespace-nowrap">Examples:</span>
        <button
          onClick={() => handleSend("Buy a multiport USB-C hub under $40")}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 transition whitespace-nowrap"
        >
          USB-C Hub ($38.50 - Auto-approve)
        </button>
        <button
          onClick={() => handleSend("Buy a mechanical keyboard around $65")}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 transition whitespace-nowrap"
        >
          Keyboard ($64.20 - Needs approval)
        </button>
        <button
          onClick={() => handleSend("Buy lightweight running shoes")}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 transition whitespace-nowrap"
        >
          Running shoes (Blocked category)
        </button>
        <button
          onClick={() => handleSend("Buy studio noise-cancelling headphones")}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 transition whitespace-nowrap"
        >
          Headphones (Exceeds $100 ceiling)
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
                <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-3 min-w-0 ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`p-3.5 rounded-lg text-xs leading-relaxed break-words [overflow-wrap:anywhere] ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Tool Invocations Badge */}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-zinc-800 text-[10px] text-zinc-400 font-mono">
                      <Terminal className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                      <span>Tools:</span>
                      {m.toolsUsed.map((t) => (
                        <span key={t} className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">
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
                <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-zinc-400">
            <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-400">
              Searching product catalog and evaluating policy rules...
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950 rounded-b-xl">
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
            placeholder="Ask agent: 'buy a USB-C hub under $40'..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
