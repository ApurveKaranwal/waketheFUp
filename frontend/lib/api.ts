const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

export interface PingHistoryItem {
  id: string;
  status: number;
  responseTime: number;
  checkedAt: string;
  projectId: string;
}

export interface MonitorProject {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  intervalSeconds: number;
  lastStatus: number | null;
  lastCheckedAt: string | null;
  failureCount: number;
  createdAt: string;
  uptimePercentage?: number;
  avgResponseTime?: number | null;
  history?: PingHistoryItem[];
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchAllMonitors(token: string): Promise<MonitorProject[]> {
  const res = await fetch(`${API_BASE_URL}/ping`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch monitors (${res.status})`);
  }
  const data = await res.json();
  return data.data || [];
}

export async function fetchMonitorById(id: string, token: string): Promise<MonitorProject> {
  const res = await fetch(`${API_BASE_URL}/ping/${id}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch monitor details (${res.status})`);
  }
  const data = await res.json();
  return data.data;
}

export async function createMonitor(params: {
  name: string;
  url: string;
  intervalSeconds: number;
}, token: string): Promise<MonitorProject> {
  const res = await fetch(`${API_BASE_URL}/ping`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || "Failed to create monitor";
    throw new Error(errorMsg);
  }
  return data.data;
}

export async function updateMonitor(id: string, params: {
  name?: string;
  url?: string;
  intervalSeconds?: number;
}, token: string): Promise<MonitorProject> {
  const res = await fetch(`${API_BASE_URL}/ping/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to update monitor");
  }
  return data.data;
}

export async function toggleMonitor(id: string, token: string): Promise<MonitorProject> {
  const res = await fetch(`${API_BASE_URL}/ping/${id}/toggle`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to toggle monitor");
  }
  return data.data;
}

export async function deleteMonitor(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/ping/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to delete monitor");
  }
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/account`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (res.status === 410) return;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to delete account");
  }
}
