"use client";

import React, { useMemo } from "react";
import type { PingHistoryItem } from "@/lib/api";

interface HeartbeatBarProps {
  history?: PingHistoryItem[];
  totalSlots?: number;
  className?: string;
}

function formatSlotTime(checkedAt: string): string {
  try {
    const d = new Date(checkedAt);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } catch {
    return checkedAt;
  }
}

function HeartbeatBarInner({
  history = [],
  totalSlots = 20,
  className = "",
}: HeartbeatBarProps) {
  const slots = useMemo(() => {
    // Sort oldest to newest (left to right)
    const sorted = [...history].sort(
      (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    );

    const recent = sorted.slice(-totalSlots);
    const emptyCount = Math.max(0, totalSlots - recent.length);
    return [...Array(emptyCount).fill(null), ...recent];
  }, [history, totalSlots]);

  return (
    <div className={`flex items-center gap-[2.5px] ${className}`}>
      {slots.map((item, index) => {
        if (!item) {
          return (
            <div
              key={`empty-${index}`}
              title="No data yet"
              className="h-5 w-1.5 rounded-[1px] bg-zinc-200 dark:bg-zinc-800"
            />
          );
        }

        const isSuccess = item.status >= 200 && item.status < 300;
        const isTimeout = item.status === 0;
        const color = isSuccess
          ? "bg-emerald-500 hover:bg-emerald-400"
          : isTimeout || item.status >= 500
          ? "bg-red-500 hover:bg-red-400 animate-pulse"
          : "bg-amber-500 hover:bg-amber-400";

        const formattedTime = formatSlotTime(item.checkedAt);

        const tooltip = `${formattedTime} — ${
          isTimeout ? "TIMEOUT / 0" : `${item.status}`
        } (${item.responseTime}ms)`;

        return (
          <div
            key={item.id}
            title={tooltip}
            className={`group relative h-5 w-1.5 cursor-pointer rounded-[1px] transition-transform hover:scale-y-125 ${color}`}
          />
        );
      })}
    </div>
  );
}

export default React.memo(HeartbeatBarInner);
