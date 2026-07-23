import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useGetMyArcadeStats, useGetArcadeLeaderboard, type ArcadeGameStats } from "@workspace/api-client-react";

type GameTile = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  href: string;
  color: string;
  statKey: "fastBreak" | "whoYaGot" | "shotClock" | null;
};

const GAMES: GameTile[] = [
  {
    id: "fast-break",
    title: "Fast Break!",
    emoji: "🏃",
    description: "Drive the lane, cross defenders, and drain buckets in this street-ball platformer.",
    href: "/arcade/fast-break",
    color: "border-orange-500",
    statKey: "fastBreak",
  },
  {
    id: "who-ya-got",
    title: "Who Ya Got?",
    emoji: "🏆",
    description: "NBA higher or lower — pick the legend with more career stats. How deep can you go?",
    href: "/arcade/who-ya-got",
    color: "border-yellow-500",
    statKey: "whoYaGot",
  },
  {
    id: "shot-clock",
    title: "Shot Clock",
    emoji: "⏱️",
    description: "Tap SHOOT when the marker hits the sweet zone. The window shrinks every round.",
    href: "/arcade/shot-clock",
    color: "border-green-500",
    statKey: "shotClock",
  },
  {
    id: "iso-ball",
    title: "Iso Ball",
    emoji: "🧠",
    description: "Basketball trivia quiz. Answer fast, climb the leaderboard, earn Iso Ball points.",
    href: "/iso-ball",
    color: "border-purple-500",
    statKey: null,
  },
];

function LeaderboardTable({
  title, emoji, color, data,
}: {
  title: string;
  emoji: string;
  color: string;
  data: { rank: number; displayName: string; bestScore: number }[] | undefined;
}) {
  const MEDAL = ["🥇", "🥈", "🥉"];
  return (
    <div className="border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b-2 border-black ${color}`}>
        <span>{emoji}</span>
        <span className="font-display text-sm tracking-widest uppercase text-white">{title}</span>
      </div>
      {!data || data.length === 0 ? (
        <div className="px-4 py-6 text-center text-white/30 text-xs italic bg-secondary">No players yet</div>
      ) : (
        <div className="bg-secondary divide-y divide-white/8">
          {data.map((entry) => (
            <div key={entry.rank} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 text-center text-sm font-black text-white/50 shrink-0">
                {MEDAL[entry.rank - 1] ?? `#${entry.rank}`}
              </span>
              <span className="flex-1 text-sm font-bold text-white truncate">{entry.displayName}</span>
              <span className="font-display text-lg text-primary shrink-0">{entry.bestScore}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArcadePage() {
  const { isSignedIn } = useAuth();
  const { data: arcadeStats } = useGetMyArcadeStats({
    query: { enabled: isSignedIn === true, retry: false },
  });
  const { data: fbBoard } = useGetArcadeLeaderboard({ game: "fast-break" });
  const { data: wygBoard } = useGetArcadeLeaderboard({ game: "who-ya-got" });
  const { data: scBoard } = useGetArcadeLeaderboard({ game: "shot-clock" });

  function getBest(key: GameTile["statKey"]): ArcadeGameStats | null {
    if (!key || !arcadeStats) return null;
    const stat = arcadeStats[key];
    if (!stat || (!stat.bestScore && !stat.bestStreak && !stat.gamesPlayed)) return null;
    return stat;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold border-2 border-foreground/30 text-foreground/80 px-3 py-1.5 hover:border-primary hover:text-primary transition-all">
          <ChevronLeft className="h-4 w-4" /> Home
        </Link>
      </div>

      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl uppercase tracking-widest text-primary mb-2">Arcade</h1>
        <p className="text-white/50 text-sm">Mini-games for Homegrown Hoops heads. Pick a game and get buckets.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map((game) => {
          const best = getBest(game.statKey);
          return (
            <Link
              key={game.id}
              href={game.href}
              className={`block bg-secondary border-2 ${game.color} rounded-2xl p-6 hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
            >
              <div className="text-4xl mb-3">{game.emoji}</div>
              <h2 className="font-display text-xl uppercase tracking-wide text-white mb-2">{game.title}</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-4">{game.description}</p>
              {best && (
                <div className="flex gap-4 text-xs font-bold text-white/40 border-t border-white/10 pt-3">
                  <span>🔥 Best: <span className="text-primary">{best.bestStreak ?? 0}</span></span>
                  <span>🎮 Played: <span className="text-white/70">{best.gamesPlayed ?? 0}</span></span>
                </div>
              )}
              <div className="mt-4">
                <span className="inline-block bg-primary text-white text-xs font-black px-4 py-2 rounded-lg uppercase tracking-wider">
                  Play →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Leaderboards ──────────────────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="font-display text-2xl uppercase tracking-widest text-white mb-4 text-center">Leaderboards</h2>
        <div className="space-y-4">
          <LeaderboardTable title="Fast Break" emoji="🏀" color="bg-orange-700" data={fbBoard} />
          <LeaderboardTable title="Who Ya Got" emoji="🏆" color="bg-purple-800" data={wygBoard} />
          <LeaderboardTable title="Shot Clock" emoji="⏱" color="bg-red-800" data={scBoard} />
        </div>
      </div>
    </div>
  );
}
