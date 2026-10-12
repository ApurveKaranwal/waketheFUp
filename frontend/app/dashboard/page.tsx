"use client";

import React, { useEffect, useState, useCallback, useMemo, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import {
  Plus,
  RefreshCw,
  ExternalLink,
  Power,
  Trash2,
  Activity,
  AlertCircle,
  Loader2,
  Search,
  Pencil,
  Copy,
  Check,
} from "lucide-react";
import {
  fetchAllMonitors,
  toggleMonitor,
  deleteMonitor,
  MonitorProject,
} from "@/lib/api";
import HeartbeatBar from "@/components/HeartbeatBar";
import { useToast, ConfirmModal } from "@/components/Toast";

// Lazy-load modals so they do not bloat initial dashboard bundle
const NewMonitorModal = dynamic(() => import("@/components/NewMonitorModal"), { ssr: false });
const MonitorDetailsModal = dynamic(() => import("@/components/MonitorDetailsModal"), { ssr: false });
const EditMonitorModal = dynamic(() => import("@/components/EditMonitorModal"), { ssr: false });

function formatLocalTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } catch {
    return isoString;
  }
}

interface MonitorRowProps {
  monitor: MonitorProject;
  isLoadingAction: boolean;
  isCopied: boolean;
  onCopyUrl: (url: string, id: string) => void;
  onEdit: (m: MonitorProject) => void;
  onSelect: (id: string) => void;
  onToggle: (id: string, currentlyEnabled: boolean, name: string) => void;
  onDelete: (id: string, name: string) => void;
}

const MonitorRow = React.memo(function MonitorRow({
  monitor: m,
  isLoadingAction,
  isCopied,
  onCopyUrl,
  onEdit,
  onSelect,
  onToggle,
  onDelete,
}: MonitorRowProps) {
  const isUp = m.lastStatus !== null && m.lastStatus >= 200 && m.lastStatus < 300;
  const isDown = m.lastStatus !== null && !isUp;

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
      {/* Status indicator */}
      <td className="p-3 text-center">
        {!m.enabled ? (
          <span
            title="Paused"
            className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-400"
          />
        ) : isUp ? (
          <span
            title={`Healthy (${m.lastStatus})`}
            className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"
          />
        ) : isDown ? (
          <span
            title={`Failing (${m.lastStatus || "0 - Timeout"})`}
            className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs shadow-red-500/50 animate-ping"
          />
        ) : (
          <span
            title="Pending first check"
            className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"
          />
        )}
      </td>

      {/* Name & URL */}
      <td className="p-3">
        <div className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
          <span>{m.name}</span>
          {!m.enabled && (
            <span className="text-[9px] uppercase px-1 py-0.2 border border-zinc-400 text-zinc-500">
              Paused
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-black dark:hover:text-white text-[11px] inline-flex items-center gap-1 truncate max-w-xs"
          >
            <span className="truncate">{m.url}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
          <button
            onClick={() => onCopyUrl(m.url, m.id)}
            title="Copy URL"
            className="text-zinc-400 hover:text-black dark:hover:text-white p-0.5 cursor-pointer"
          >
            {isCopied ? (
              <Check className="w-2.5 h-2.5 text-emerald-500" />
            ) : (
              <Copy className="w-2.5 h-2.5" />
            )}
          </button>
        </div>
      </td>

      {/* Heartbeat Bar */}
      <td className="p-3 hidden md:table-cell">
        <HeartbeatBar history={m.history} totalSlots={20} />
      </td>

      {/* Uptime & Latency */}
      <td className="p-3">
        <div className="space-y-0.5">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {m.uptimePercentage !== undefined ? `${m.uptimePercentage}%` : "100%"}
          </div>
          <div className="text-[10px] text-zinc-500">
            {m.avgResponseTime ? `${m.avgResponseTime}ms avg` : "—"}
          </div>
        </div>
      </td>

      {/* Interval */}
      <td className="p-3">
        <span className="inline-block px-2 py-0.5 border border-zinc-300 dark:border-zinc-700 text-[10px] font-bold">
          {m.intervalSeconds}s
        </span>
      </td>

      {/* Last Check */}
      <td className="p-3 text-[11px] text-zinc-600 dark:text-zinc-400">
        {m.lastCheckedAt ? (
          <div>
            <div>{formatLocalTime(m.lastCheckedAt)}</div>
            <div className="text-[10px]">
              {isUp ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {m.lastStatus} OK
                </span>
              ) : isDown ? (
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {m.lastStatus === 0 ? "TIMEOUT" : `${m.lastStatus} ERR`}
                </span>
              ) : (
                "Checking..."
              )}
            </div>
          </div>
        ) : (
          <span className="text-zinc-400">Never checked</span>
        )}
      </td>

      {/* Actions */}
      <td className="p-3 text-right">
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => onEdit(m)}
            disabled={isLoadingAction}
            title={`Edit ${m.name}`}
            aria-label={`Edit ${m.name}`}
            className="p-1.5 border border-black dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelect(m.id)}
            title="View ping telemetry"
            className="p-1.5 border border-black dark:border-zinc-700 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggle(m.id, m.enabled, m.name)}
            disabled={isLoadingAction}
            title={m.enabled ? "Pause monitoring" : "Resume monitoring"}
            className={`p-1.5 border transition-colors cursor-pointer ${
              m.enabled
                ? "border-black dark:border-zinc-700 hover:bg-amber-500 hover:text-white hover:border-amber-500"
                : "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(m.id, m.name)}
            disabled={isLoadingAction}
            title="Delete monitor"
            className="p-1.5 border border-black dark:border-zinc-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function DashboardPage() {
  const { getToken } = useAuth();
  const toast = useToast();
  const [monitors, setMonitors] = useState<MonitorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [editingMonitor, setEditingMonitor] = useState<MonitorProject | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const loadMonitors = useCallback(async (isSilent = false) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to view your monitors.");
      const data = await fetchAllMonitors(token);
      setMonitors(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load your monitors.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void loadMonitors(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadMonitors]);

  // Polling every 10 seconds for real-time monitoring updates (paused when tab hidden)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadMonitors(true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMonitors]);

  const handleToggle = useCallback(async (id: string, currentlyEnabled: boolean, name: string) => {
    setActionLoadingId(id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to manage your monitors.");
      await toggleMonitor(id, token);
      await loadMonitors(true);
      toast.success(
        currentlyEnabled
          ? `Paused monitor "${name}".`
          : `Resumed monitor "${name}".`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle monitor");
    } finally {
      setActionLoadingId(null);
    }
  }, [getToken, loadMonitors, toast]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    setActionLoadingId(id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in to manage your monitors.");
      await deleteMonitor(id, token);
      await loadMonitors(true);
      toast.success(`Monitor "${name}" deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete monitor");
    } finally {
      setActionLoadingId(null);
    }
  }, [deleteTarget, getToken, loadMonitors, toast]);

  const copyUrl = useCallback((url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.info("Endpoint URL copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [toast]);

  const handleEdit = useCallback((m: MonitorProject) => {
    setEditingMonitor(m);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedMonitorId(id);
  }, []);

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
  }, []);

  // Filtered monitors with deferred search for instant 60 FPS input
  const filteredMonitors = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return monitors;
    return monitors.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.url.toLowerCase().includes(query)
    );
  }, [monitors, deferredSearch]);

  // Single-pass memoized summary calculation
  const { activeCount, healthyCount, downCount } = useMemo(() => {
    let active = 0;
    let healthy = 0;
    let down = 0;
    for (let i = 0; i < monitors.length; i++) {
      const m = monitors[i];
      if (m.enabled) {
        active++;
        if (m.lastStatus !== null) {
          if (m.lastStatus >= 200 && m.lastStatus < 300) {
            healthy++;
          } else {
            down++;
          }
        }
      }
    }
    return { activeCount: active, healthyCount: healthy, downCount: down };
  }, [monitors]);

  return (
    <div className="space-y-8 font-mono">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">
            Monitors Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time heartbeat checks powered by Bun + BullMQ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
              autoRefresh
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 bg-emerald-500/10"
                : "border-zinc-400 text-zinc-500"
            }`}
          >
            {autoRefresh ? "• Auto-Refresh (10s)" : "Auto-Refresh OFF"}
          </button>

          <button
            onClick={() => { setLoading(true); void loadMonitors(false); }}
            disabled={loading}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
            title="Refresh monitors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Monitor</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-black dark:border-zinc-800 p-4 bg-white dark:bg-black">
          <div className="text-[10px] text-zinc-500 uppercase">Total Services</div>
          <div className="text-2xl font-bold mt-1">{monitors.length}</div>
        </div>

        <div className="border border-black dark:border-zinc-800 p-4 bg-white dark:bg-black">
          <div className="text-[10px] text-zinc-500 uppercase">Active Monitors</div>
          <div className="text-2xl font-bold mt-1 text-black dark:text-white">
            {activeCount}
          </div>
        </div>

        <div className="border border-black dark:border-zinc-800 p-4 bg-white dark:bg-black">
          <div className="text-[10px] text-zinc-500 uppercase">Healthy (2xx)</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {healthyCount}
          </div>
        </div>

        <div className="border border-black dark:border-zinc-800 p-4 bg-white dark:bg-black">
          <div className="text-[10px] text-zinc-500 uppercase">Incidents / Down</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              downCount > 0
                ? "text-red-600 dark:text-red-400 animate-pulse"
                : "text-zinc-500"
            }`}
          >
            {downCount}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 border border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => { setLoading(true); void loadMonitors(false); }}
            className="underline font-bold hover:opacity-80 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Table Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search monitors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-black dark:border-zinc-700 bg-transparent text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div className="text-xs text-zinc-500">
            Showing {filteredMonitors.length} of {monitors.length}
          </div>
        </div>

        {loading && monitors.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 border border-black dark:border-zinc-800 text-zinc-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
            <span>Connecting to monitoring engine...</span>
          </div>
        ) : filteredMonitors.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-black dark:border-zinc-800 space-y-3 p-6">
            <div className="text-zinc-500 text-xs">
              {search
                ? "No monitors match your search query."
                : "No active heartbeat monitors found."}
            </div>
            {!search && (
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Monitor</span>
              </button>
            )}
          </div>
        ) : (
          <div className="border border-black dark:border-zinc-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-black dark:border-zinc-800 font-bold uppercase text-[10px]">
                  <th className="p-3 w-16 text-center">Status</th>
                  <th className="p-3">Monitor / URL</th>
                  <th className="p-3 hidden md:table-cell">Heartbeat History</th>
                  <th className="p-3 w-28">Uptime & Latency</th>
                  <th className="p-3 w-24">Interval</th>
                  <th className="p-3 w-36">Last Check</th>
                  <th className="p-3 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredMonitors.map((m) => (
                  <MonitorRow
                    key={m.id}
                    monitor={m}
                    isLoadingAction={actionLoadingId === m.id}
                    isCopied={copiedId === m.id}
                    onCopyUrl={copyUrl}
                    onEdit={handleEdit}
                    onSelect={handleSelect}
                    onToggle={handleToggle}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Monitor"
        message={`Are you sure you want to permanently delete monitor "${deleteTarget?.name}"? All associated ping telemetry and incident records will be removed.`}
        confirmLabel="Delete Monitor"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Lazy-loaded Modals */}
      {isNewModalOpen && (
        <NewMonitorModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={() => {
            toast.success("New monitor created successfully!");
            void loadMonitors(true);
          }}
        />
      )}

      {selectedMonitorId && (
        <MonitorDetailsModal
          projectId={selectedMonitorId}
          onClose={() => setSelectedMonitorId(null)}
        />
      )}

      {editingMonitor && (
        <EditMonitorModal
          monitor={editingMonitor}
          onClose={() => setEditingMonitor(null)}
          onSuccess={() => {
            toast.success("Monitor updated successfully!");
            void loadMonitors(true);
          }}
        />
      )}
    </div>
  );
}
