import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { apiBase } from "@/lib/api";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function ShotClockPage() {
  const { getToken, isSignedIn } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const expectedOrigin = window.location.origin;
    async function handleMessage(e: MessageEvent) {
      // Only accept messages from the same origin (our own iframe)
      if (e.origin !== expectedOrigin) return;
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      if (e.data?.type === "GAME_OVER" && isSignedIn) {
        try {
          const token = await getToken();
          await fetch(`${apiBase}/arcade/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              game: "shot-clock",
              score: typeof e.data.score === "number" ? e.data.score : 0,
              bestStreak: typeof e.data.bestStreak === "number" ? e.data.bestStreak : 0,
              roundsPlayed: typeof e.data.roundsPlayed === "number" ? e.data.roundsPlayed : 0,
            }),
          });
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [getToken, isSignedIn]);

  return (
    <div className="fixed inset-0 bg-[#0f1b2d] flex flex-col" style={{ top: 64 }}>
      <div className="absolute top-2 left-3 z-10">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Arcade
        </Link>
      </div>
      <iframe
        ref={iframeRef}
        src="/games/shot-clock.html"
        className="flex-1 w-full border-0"
        title="Shot Clock"
        allow="autoplay"
      />
    </div>
  );
}
