"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, detail?: string) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info", detail?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, detail }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((message: string, detail?: string) => addToast(message, "success", detail), [addToast]);
  const error = useCallback((message: string, detail?: string) => addToast(message, "error", detail), [addToast]);
  const info = useCallback((message: string, detail?: string) => addToast(message, "info", detail), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-[3px] border p-3.5 shadow-lg bg-surface flex items-start justify-between space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              t.type === "success"
                ? "border-leaf/60 text-text"
                : t.type === "error"
                ? "border-sindoor/60 text-text"
                : "border-primary/60 text-text"
            }`}
          >
            <div className="flex items-start space-x-2.5">
              <span className="shrink-0 mt-0.5">
                {t.type === "success" ? (
                  <CheckCircle2 size={16} className="text-leaf" />
                ) : t.type === "error" ? (
                  <AlertCircle size={16} className="text-sindoor" />
                ) : (
                  <Info size={16} className="text-primary" />
                )}
              </span>
              <div>
                <p className="text-xs font-mono font-semibold tracking-wide uppercase text-text">
                  {t.message}
                </p>
                {t.detail && (
                  <p className="text-xs text-text-muted mt-0.5 leading-snug">
                    {t.detail}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss toast"
              className="text-text-muted hover:text-text p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
export default ToastProvider;
