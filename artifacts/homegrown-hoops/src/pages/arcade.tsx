import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useGetMyArcadeStats, useGetArcadeLeaderboard, useGetIsoBallLeaderboard, type ArcadeGameStats, type IsoBallLeaderboardEntry } from "@workspace/api-client-react";

type GameTile = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  href: string;
  color: string;
  statKey: "fastBreak" | "whoYaGot" | "shotClock" | "shotClockScramble" | "chainGame" | null;
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
    id: "shot-clock-scramble",
    title: "Shot Clock Scramble",
    emoji: "🧠",
    description: "Answer NBA trivia before the 24-second shot clock expires. Three tiers — Rookie, Varsity, Elite.",
    href: "/arcade/shot-clock-scramble",
    color: "border-red-500",
    statKey: "shotClockScramble",
  },
  {
    id: "chain-game",
    title: "Chain Game",
    emoji: "🔗",
    description: "Link NBA players together. Each next player's first name must start with the last letter of the previous player's last name.",
    href: "/arcade/chain-game",
    color: "border-blue-500",
    statKey: "chainGame",
  },
  {
    id: "iso-ball",
    title: "Iso Ball",
    emoji: "🎯",
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

function IsoBallLeaderboardTable({ data }: { data: IsoBallLeaderboardEntry[] | undefined }) {
  const MEDAL = ["🥇", "🥈", "🥉"];
  const LEVEL_COLOR: Record<string, string> = {
    "Elite Playmaker": "text-yellow-400",
    "High Basketball IQ": "text-purple-400",
    "Varsity Vision": "text-blue-400",
    "Court Aware": "text-green-400",
    "Rookie IQ": "text-white/50",
  };
  return (
    <div className="border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-black bg-indigo-900">
        <span>🧠</span>
        <span className="font-display text-sm tracking-widest uppercase text-white">Iso Ball</span>
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{entry.displayName}</p>
                <p className={`text-[10px] font-semibold ${LEVEL_COLOR[entry.level] ?? "text-white/40"}`}>{entry.level}</p>
              </div>
              <span className="font-display text-lg text-purple-400 shrink-0">{entry.totalPoints} <span className="text-[10px] font-normal text-white/30">pts</span></span>
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
  const { data: scsBoard } = useGetArcadeLeaderboard({ game: "shot-clock-scramble" });
  const { data: cgBoard } = useGetArcadeLeaderboard({ game: "chain-game" });
  const { data: ibBoard } = useGetIsoBallLeaderboard();

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
          <LeaderboardTable title="Fast Break" emoji="🏃" color="bg-orange-700" data={fbBoard} />
          <LeaderboardTable title="Who Ya Got" emoji="🏆" color="bg-purple-800" data={wygBoard} />
          <LeaderboardTable title="Shot Clock" emoji="⏱" color="bg-green-800" data={scBoard} />
          <LeaderboardTable title="Shot Clock Scramble" emoji="🧠" color="bg-red-800" data={scsBoard} />
          <LeaderboardTable title="Chain Game" emoji="🔗" color="bg-blue-800" data={cgBoard} />
          <IsoBallLeaderboardTable data={ibBoard} />
        </div>
      </div>
    </div>
  );
}
