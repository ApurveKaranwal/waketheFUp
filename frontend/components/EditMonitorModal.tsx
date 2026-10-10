"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Loader2, X } from "lucide-react";
import { updateMonitor, type MonitorProject } from "@/lib/api";

type EditMonitorModalProps = {
  monitor: MonitorProject | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditMonitorModal({ monitor, onClose, onSuccess }: EditMonitorModalProps) {
  const { getToken } = useAuth();
  const [name, setName] = useState(monitor?.name ?? "");
  const [url, setUrl] = useState(monitor?.url ?? "");
  const [intervalSeconds, setIntervalSeconds] = useState(monitor?.intervalSeconds ?? 60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!monitor) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!monitor) return;
    setError(null);
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to edit your monitors.");
      await updateMonitor(monitor.id, {
        name: name.trim(),
        url: url.trim(),
        intervalSeconds,
      }, token);
      onSuccess();
      onClose();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Failed to update monitor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-monitor-title" className="w-full max-w-lg border border-black dark:border-white bg-white dark:bg-black font-mono shadow-2xl">
        <header className="flex items-center justify-between border-b border-black dark:border-zinc-800 px-5 py-3.5">
          <h2 id="edit-monitor-title" className="font-bold text-sm uppercase">Edit Monitor</h2>
          <button type="button" onClick={onClose} aria-label="Close edit monitor" disabled={loading} className="p-1 border border-transparent hover:border-black dark:hover:border-zinc-700 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 text-xs border border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="edit-monitor-name" className="text-xs uppercase font-bold text-zinc-700 dark:text-zinc-300">Monitor name</label>
            <input id="edit-monitor-name" type="text" required minLength={3} maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className="w-full px-3 py-2 text-xs border border-black dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-monitor-url" className="text-xs uppercase font-bold text-zinc-700 dark:text-zinc-300">Public HTTP(S) endpoint</label>
            <input id="edit-monitor-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} className="w-full px-3 py-2 text-xs border border-black dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white" />
            <p className="text-[10px] text-zinc-500">Only publicly reachable HTTP and HTTPS endpoints can be monitored.</p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs uppercase font-bold text-zinc-700 dark:text-zinc-300">Check interval</legend>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 300].map((seconds) => (
                <button key={seconds} type="button" aria-pressed={intervalSeconds === seconds} onClick={() => setIntervalSeconds(seconds)} className={`p-2.5 text-left border text-xs transition-colors ${intervalSeconds === seconds ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold" : "border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-zinc-600"}`}>
                  {seconds === 300 ? "5 MINUTES" : `${seconds} SECONDS`}
                </button>
              ))}
            </div>
          </fieldset>

          <footer className="pt-3 border-t border-black dark:border-zinc-800 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-xs border border-black dark:border-zinc-700 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white disabled:opacity-50">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save monitor
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
