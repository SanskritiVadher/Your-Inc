import React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  isMono?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No entries recorded.",
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[3px] border border-border bg-surface shadow-xs",
        className
      )}
    >
      {/* Traditional Indian Bahi-Khata Crimson Margin Line */}
      <div className="absolute left-8 top-0 bottom-0 w-[1.5px] bg-sindoor/35 pointer-events-none z-10" />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-border/80 bg-surface/80 font-body text-xs font-semibold text-text-muted">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={cn(
                    "py-3 px-4 font-semibold select-none",
                    idx === 0 && "pl-11", // extra padding to clear the crimson margin line
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-body">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 pl-12 text-center text-sm font-mono text-text-muted italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={keyExtractor(row, rowIdx)}
                  className="group transition-colors hover:bg-bg/50"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={cn(
                        "py-3 px-4 text-text leading-relaxed",
                        colIdx === 0 && "pl-11 font-medium",
                        col.isMono && "font-mono tabular-nums text-xs",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row, rowIdx)
                        : (row as Record<string, unknown>)[col.key] !== undefined
                        ? String((row as Record<string, unknown>)[col.key])
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
