import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { apiBase } from "@/lib/api";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function FastBreakPage() {
  const { getToken, isSignedIn } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sendAvatarToGame = useCallback(async () => {
    if (!isSignedIn || !iframeRef.current?.contentWindow) return;
    try {
      const token = await getToken();
      const res = await fetch(`${apiBase}/api/profiles/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const profile = await res.json();
      if (profile.avatarConfig) {
        iframeRef.current.contentWindow.postMessage(
          { type: "PLAYER_AVATAR", config: profile.avatarConfig },
          window.location.origin,
        );
      }
    } catch {
      // ignore
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    const expectedOrigin = window.location.origin;
    async function handleMessage(e: MessageEvent) {
      if (e.origin !== expectedOrigin) return;
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      if (e.data?.type === "GAME_OVER" && isSignedIn) {
        try {
          const token = await getToken();
          await fetch(`${apiBase}/arcade/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              game: "fast-break",
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

  function handleIframeLoad() {
    setTimeout(sendAvatarToGame, 900);
  }

  return (
    <div className="fixed inset-0 bg-[#0f1b2d] flex flex-col" style={{ top: 64 }}>
      <div className="absolute top-2 left-3 z-10">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Arcade
        </Link>
      </div>
      <iframe
        ref={iframeRef}
        src="/games/fast-break.html"
        className="flex-1 w-full border-0"
        title="Fast Break!"
        allow="autoplay"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
