"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { X, Activity, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { fetchMonitorById, MonitorProject } from "@/lib/api";
import HeartbeatBar from "./HeartbeatBar";

interface MonitorDetailsModalProps {
  projectId: string | null;
  onClose: () => void;
}

export default function MonitorDetailsModal({
  projectId,
  onClose,
}: MonitorDetailsModalProps) {
  const { getToken } = useAuth();
  const [project, setProject] = useState<MonitorProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (id: string) => {
    try {
      const token = await getToken();
      setLoading(true);
      setError(null);
      if (!token) throw new Error("Sign in to view monitor history.");
      const data = await fetchMonitorById(id, token);
      setProject(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load monitor details");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!projectId) return;
    const loadTimer = setTimeout(() => { void loadData(projectId); }, 0);
    return () => clearTimeout(loadTimer);
  }, [projectId, loadData]);

  if (!projectId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="monitor-history-title" className="w-full max-w-2xl border border-black dark:border-white bg-white dark:bg-black font-mono shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black dark:border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-black dark:text-white" />
            <h2 id="monitor-history-title" className="font-bold text-sm uppercase">
              {project ? project.name : "Monitor History"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => projectId && loadData(projectId)}
              disabled={loading}
              title="Refresh history"
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-black dark:hover:border-zinc-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-black dark:hover:border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading && !project && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Fetching telemetry data...</span>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 text-xs border border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {project && (
            <>
              {/* Meta stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-black dark:border-zinc-800 p-3 text-xs">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Status</div>
                  <div className="font-bold mt-0.5">
                    {project.enabled ? (
                      project.lastStatus !== null && project.lastStatus >= 200 && project.lastStatus < 300 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{project.lastStatus} OK</span>
                      ) : project.lastStatus !== null ? (
                        <span className="text-red-600 dark:text-red-400">{project.lastStatus} FAIL</span>
                      ) : (
                        <span className="text-amber-500">PENDING</span>
                      )
                    ) : (
                      <span className="text-zinc-500">PAUSED</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Interval</div>
                  <div className="font-bold mt-0.5">{project.intervalSeconds}s</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Failures</div>
                  <div className="font-bold mt-0.5">{project.failureCount}</div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">URL</div>
                  <div className="font-bold mt-0.5 truncate text-[11px]" title={project.url}>
                    {project.url}
                  </div>
                </div>
              </div>

              {/* Performance & Heartbeat Strip */}
              <div className="border border-black dark:border-zinc-800 p-3 space-y-2 bg-zinc-50 dark:bg-zinc-950/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">24H UPTIME</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {project.uptimePercentage !== undefined ? `${project.uptimePercentage}%` : "100%"}
                    </span>
                    {project.avgResponseTime && (
                      <span className="text-zinc-500 text-[11px]">
                        • {project.avgResponseTime}ms avg latency
                      </span>
                    )}
                  </div>
                  {project.url.startsWith("https://") && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                      <ShieldCheck className="w-3 h-3" />
                      <span>SSL Monitored</span>
                    </div>
                  )}
                </div>
                <HeartbeatBar history={project.history} totalSlots={20} className="w-full justify-between" />
              </div>

              {/* History Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 uppercase">
                  <span>Recent 20 Heartbeat Checks</span>
                  <span>{project.history?.length || 0} pings logged</span>
                </div>

                {(!project.history || project.history.length === 0) ? (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-800">
                    No pings recorded yet. Worker will ping within {project.intervalSeconds} seconds.
                  </div>
                ) : (
                  <div className="border border-black dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                    <div className="grid grid-cols-12 bg-zinc-100 dark:bg-zinc-950 p-2.5 font-bold uppercase text-[10px]">
                      <div className="col-span-4">Time</div>
                      <div className="col-span-3">Status Code</div>
                      <div className="col-span-5 text-right">Response Time</div>
                    </div>

                    {project.history.map((item) => {
                      const isSuccess = item.status >= 200 && item.status < 300;
                      const dateStr = new Date(item.checkedAt).toLocaleTimeString();

                      return (
                        <div key={item.id} className="grid grid-cols-12 p-2.5 items-center">
                          <div className="col-span-4 text-zinc-600 dark:text-zinc-400 text-[11px]">
                            {dateStr}
                          </div>
                          <div className="col-span-3">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                isSuccess
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                                  : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                              }`}
                            >
                              {item.status === 0 ? "TIMEOUT / 0" : `${item.status} ${isSuccess ? "OK" : "ERR"}`}
                            </span>
                          </div>
                          <div className="col-span-5 text-right font-mono">
                            <span className={item.responseTime > 1000 ? "text-amber-500" : ""}>
                              {item.responseTime} ms
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="p-3 border-t border-black dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono border border-black dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
