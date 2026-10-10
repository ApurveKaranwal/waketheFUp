"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X, Plus, AlertCircle, Loader2 } from "lucide-react";
import { createMonitor } from "@/lib/api";

interface NewMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewMonitorModal({
  isOpen,
  onClose,
  onSuccess,
}: NewMonitorModalProps) {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Basic URL auto-prefix if user forgot protocol
      let targetUrl = url.trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }

      const token = await getToken();
      if (!token) throw new Error("Sign in to create a monitor.");
      await createMonitor({
        name: name.trim(),
        url: targetUrl,
        intervalSeconds,
      }, token);

      setName("");
      setUrl("");
      setIntervalSeconds(30);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create monitor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="new-monitor-title" className="w-full max-w-lg border border-black dark:border-white bg-white dark:bg-black font-mono shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black dark:border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-black dark:text-white" />
            <h2 id="new-monitor-title" className="font-bold text-sm uppercase">Add New Monitor</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new monitor"
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-black dark:hover:border-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 text-xs border border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="new-monitor-name" className="text-xs uppercase font-bold text-zinc-700 dark:text-zinc-300">
              Project / Service Name
            </label>
            <input
              id="new-monitor-name"
              type="text"
              required
              placeholder="e.g. Production API, Auth Service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-black dark:border-zinc-700 bg-transparent text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-monitor-url" className="text-xs uppercase font-bold text-zinc-700 dark:text-zinc-300">
              Endpoint URL to Ping
            </label>
            <input
              id="new-monitor-url"
              type="text"
              required
              placeholder="https://api.yourdomain.com/health"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-black dark:border-zinc-700 bg-transparent text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase font-bold text-zinc-700 dark:text-zinc-300">
              Check Interval
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "30 SECONDS", value: 30, desc: "Fast" },
                { label: "60 SECONDS", value: 60, desc: "Standard" },
                { label: "300 SECONDS", value: 300, desc: "5 minutes" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  aria-pressed={intervalSeconds === item.value}
                  onClick={() => setIntervalSeconds(item.value)}
                  className={`p-2.5 text-left border transition-colors ${
                    intervalSeconds === item.value
                      ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold"
                      : "border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-zinc-600 text-black dark:text-white"
                  }`}
                >
                  <div className="text-[11px]">{item.label}</div>
                  <div
                    className={`text-[9px] ${
                      intervalSeconds === item.value
                        ? "text-zinc-300 dark:text-zinc-700"
                        : "text-zinc-500"
                    }`}
                  >
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-black dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-black dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Monitor</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
