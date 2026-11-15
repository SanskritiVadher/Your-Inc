"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { ArrowUpRight, ArrowDownRight, History, Layers, Sparkles } from "lucide-react";

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  beforeValue?: number | null;
  afterValue?: number | null;
  reason: string;
  refId?: string | null;
  timestamp: string;
  concept?: { id: string; name: string; value: number } | null;
  subject?: { id: string; name: string; code: string } | null;
}

interface ExplainableNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentValue?: number | string;
  conceptId?: string | null;
  subjectId?: string | null;
  unit?: string;
}

export const ExplainableNumberModal: React.FC<ExplainableNumberModalProps> = ({
  isOpen,
  onClose,
  title,
  currentValue,
  conceptId,
  subjectId,
  unit = "₹",
}) => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const query = new URLSearchParams();
    if (conceptId) query.set("conceptId", conceptId);
    if (subjectId) query.set("subjectId", subjectId);

    fetch(`/api/transactions?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setTransactions(data.transactions || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load audit transactions:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, conceptId, subjectId]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="History" size="lg">
      <div className="space-y-5">
        {/* Header Summary Banner */}
        <div className="relative p-4 rounded bg-surface border border-border">
          <LedgerBorder stroke="#B3261E" className="opacity-15" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-body text-xs text-text-muted">
                History and changes
              </span>
              <h3 className="font-heading text-xl text-text font-semibold">{title}</h3>
            </div>
            {currentValue !== undefined && (
              <div className="text-right">
                <span className="font-body text-xs text-text-muted">
                  Current score
                </span>
                <div className="font-mono text-2xl font-bold text-sindoor">
                  {unit}
                  {Number(currentValue).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        <OrnamentDivider stroke="#B3261E" className="opacity-30" />

        {/* Transaction Rows */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-muted font-body px-1">
            <span>Past entries</span>
            <span>{transactions.length} entries</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-body text-text-muted animate-pulse">
              Loading history...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded bg-surface/50">
              <History size={28} className="mx-auto text-text-muted mb-2 opacity-50" />
              <p className="font-heading text-sm text-text">No Historical Mutations Yet</p>
              <p className="font-body text-xs text-text-muted mt-1">
                This asset is freshly capitalized. Future revisions (reinvestments) or lapse decay (depreciation) will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 font-body">
              {transactions.map((tx) => {
                const isPositive = tx.amount >= 0;
                const isDepreciation = tx.type === "DEPRECIATION";

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded border border-border bg-surface hover:bg-bg/50 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                            isDepreciation
                              ? "bg-sindoor/15 text-sindoor border border-sindoor/30"
                              : "bg-leaf/15 text-leaf border border-leaf/30"
                          }`}
                        >
                          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {tx.type}
                        </span>

                        <span className="font-mono text-[10px] text-text-muted">
                          {new Date(tx.timestamp).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <p className="text-text font-medium">{tx.reason}</p>

                      {tx.beforeValue !== undefined &&
                        tx.beforeValue !== null &&
                        tx.afterValue !== undefined &&
                        tx.afterValue !== null && (
                          <div className="font-mono text-[11px] text-text-muted flex items-center gap-1.5">
                            <span>Prior: {tx.beforeValue.toFixed(2)}</span>
                            <span>→</span>
                            <span className="font-semibold text-text">New: {tx.afterValue.toFixed(2)}</span>
                          </div>
                        )}
                    </div>

                    <div className="text-right sm:self-center">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isPositive ? "text-leaf" : "text-sindoor"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-medium rounded border border-border hover:bg-surface text-text transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </Dialog>
  );
};
