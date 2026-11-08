"use client";

import React, { useState } from "react";
import { 
  Clock, 
  Search, 
  ChevronDown, 
  ChevronRight, 
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
      return "bg-amber-950/40 text-amber-400 border-amber-800/60";
    }
    if (eventType.includes("CAPTURE") || eventType.includes("CONFIRM")) {
      return "bg-emerald-950/40 text-emerald-400 border-emerald-800/60";
    }
    if (eventType.includes("PAYPAL")) {
      return "bg-blue-950/40 text-blue-400 border-blue-800/60";
    }
    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  }

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Audit log
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                {filteredLogs.length} events
              </span>
            </h3>
            <p className="text-xs text-zinc-400">Record of policy decisions, agent actions, and PayPal transactions.</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter events..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="py-10 text-center text-zinc-500 text-xs">
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
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs space-y-2"
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button className="text-zinc-500 hover:text-zinc-300 mt-0.5 transition">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getBadgeStyle(log.event_type, log.severity)}`}>
                          {log.event_type}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {log.id}
                        </span>
                      </div>
                      <p className="text-zinc-200 text-xs leading-relaxed">
                        {log.summary}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap flex-shrink-0 pt-0.5">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>

                {/* Expandable JSON Inspector */}
                {isExpanded && (
                  <div className="pt-2 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-mono">Payload:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPayload(log.id, formattedPayload);
                        }}
                        className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
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

                    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48 leading-relaxed">
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
