"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 border shadow-xl font-mono text-xs transition-all animate-in slide-in-from-bottom-2 ${
              t.type === "success"
                ? "bg-white dark:bg-black border-emerald-500 text-black dark:text-white"
                : t.type === "error"
                ? "bg-white dark:bg-black border-red-500 text-red-600 dark:text-red-400"
                : "bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
            }`}
          >
            {t.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            {t.type === "error" && (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            {t.type === "info" && (
              <Info className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-snug">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-zinc-400 hover:text-black dark:hover:text-white shrink-0 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md border border-black dark:border-white bg-white dark:bg-black font-mono shadow-2xl p-5 space-y-4">
        <h3 className="font-bold text-sm uppercase">{title}</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-bold uppercase text-white transition-opacity ${
              confirmVariant === "danger"
                ? "bg-red-600 border border-red-600 hover:bg-red-700"
                : "bg-black dark:bg-white text-black border border-black dark:border-white hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
