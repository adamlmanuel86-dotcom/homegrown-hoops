import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw } from "lucide-react";

const PING_URL = "/api/ping";
const KEEP_ALIVE_INTERVAL_MS = 5 * 60 * 1000;
const RETRY_INTERVAL_MS = 10 * 1000;

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(PING_URL, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function ServerStatusBanner() {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(false);
  const wasOfflineRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const ok = await ping();
      if (cancelled) return;

      if (!ok) {
        setOffline(true);
        wasOfflineRef.current = true;
        timerRef.current = setTimeout(check, RETRY_INTERVAL_MS);
      } else {
        setOffline(false);
        if (wasOfflineRef.current) {
          wasOfflineRef.current = false;
          queryClient.refetchQueries();
        }
        timerRef.current = setTimeout(check, KEEP_ALIVE_INTERVAL_MS);
      }
    }

    timerRef.current = setTimeout(check, KEEP_ALIVE_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queryClient]);

  if (!offline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-secondary border border-border shadow-2xl rounded-2xl px-5 py-3 text-sm font-semibold text-secondary-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
      <WifiOff className="h-4 w-4 text-primary flex-shrink-0" />
      <span>Reconnecting…</span>
      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
    </div>
  );
}
