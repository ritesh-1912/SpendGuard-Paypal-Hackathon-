"use client";

import React, { useState } from "react";
import { 
  Clock, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Sparkles, 
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { AuditLogRecord } from "@/lib/db/schema";

interface Props {
  logs: AuditLogRecord[];
  className?: string;
}

export default function AuditLogViewer({ logs, className = "" }: Props) {
  const [filterQuery, setFilterQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (!filterQuery.trim()) return true;
    const query = filterQuery.toLowerCase();
    return (
      log.event_type.toLowerCase().includes(query) ||
      log.summary.toLowerCase().includes(query) ||
      log.payload.toLowerCase().includes(query)
    );
  });

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function copyPayload(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getBadgeStyle(eventType: string, severity: string) {
    if (severity === "WARN" || eventType.includes("REJECT") || eventType.includes("ESCALAT")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (eventType.includes("CAPTURE") || eventType.includes("CONFIRM")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (eventType.includes("PAYPAL")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
    return "bg-slate-800 text-slate-300 border-slate-700";
  }

  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Immutable Audit Log Trail
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                {filteredLogs.length} events
              </span>
            </h3>
            <p className="text-xs text-slate-400">Cryptographically verifiable sequence of decisions and sandbox transactions.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search events, orders, rules..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          No audit logs match your search.
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            let formattedPayload = "";
            try {
              formattedPayload = JSON.stringify(JSON.parse(log.payload), null, 2);
            } catch {
              formattedPayload = log.payload;
            }

            return (
              <div
                key={log.id}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition text-xs space-y-2"
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button className="text-slate-500 hover:text-slate-300 mt-0.5 transition">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${getBadgeStyle(log.event_type, log.severity)}`}>
                          {log.event_type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.id}
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs font-medium leading-relaxed">
                        {log.summary}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap flex-shrink-0 pt-0.5">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>

                {/* Expandable JSON Inspector */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono">Payload Inspector (JSON):</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPayload(log.id, formattedPayload);
                        }}
                        className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                      >
                        {copiedId === log.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                      {formattedPayload}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
