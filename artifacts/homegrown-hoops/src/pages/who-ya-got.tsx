import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { apiBase } from "@/lib/api";

const PLAYERS = [
  { id: 1, full_name: "Kareem Abdul-Jabbar", era_label: "1970s-80s", career_points: 38387, career_rebounds: 17440, career_assists: 5660, career_steals: 1160, career_blocks: 3189, championships: 6, career_ppg: 24.6 },
  { id: 2, full_name: "Wilt Chamberlain", era_label: "1960s-70s", career_points: 31419, career_rebounds: 23924, career_assists: 4643, career_steals: null, career_blocks: null, championships: 2, career_ppg: 30.1 },
  { id: 3, full_name: "Bill Russell", era_label: "1950s-60s", career_points: 14522, career_rebounds: 21620, career_assists: 4100, career_steals: null, career_blocks: null, championships: 11, career_ppg: 15.1 },
  { id: 4, full_name: "Michael Jordan", era_label: "1980s-90s", career_points: 32292, career_rebounds: 6672, career_assists: 5633, career_steals: 2514, career_blocks: 893, championships: 6, career_ppg: 30.1 },
  { id: 5, full_name: "Kobe Bryant", era_label: "1990s-2010s", career_points: 33643, career_rebounds: 7047, career_assists: 6306, career_steals: 1944, career_blocks: 640, championships: 5, career_ppg: 25.0 },
  { id: 6, full_name: "LeBron James", era_label: "active", career_points: 43440, career_rebounds: 12095, career_assists: 12016, career_steals: null, career_blocks: null, championships: 4, career_ppg: 27.0 },
  { id: 7, full_name: "Magic Johnson", era_label: "1980s-90s", career_points: 17707, career_rebounds: 6559, career_assists: 10141, career_steals: 1724, career_blocks: 374, championships: 5, career_ppg: 19.5 },
  { id: 8, full_name: "Larry Bird", era_label: "1980s-90s", career_points: 21791, career_rebounds: 8974, career_assists: 5695, career_steals: 1556, career_blocks: 755, championships: 3, career_ppg: 24.3 },
  { id: 9, full_name: "Tim Duncan", era_label: "1990s-2010s", career_points: 26496, career_rebounds: 15091, career_assists: 4225, career_steals: 1026, career_blocks: 3020, championships: 5, career_ppg: 19.0 },
  { id: 10, full_name: "Shaquille O'Neal", era_label: "1990s-2000s", career_points: 28596, career_rebounds: 13099, career_assists: 3026, career_steals: 739, career_blocks: 2732, championships: 4, career_ppg: 23.7 },
  { id: 11, full_name: "Hakeem Olajuwon", era_label: "1980s-2000s", career_points: 26946, career_rebounds: 13748, career_assists: 3058, career_steals: 2162, career_blocks: 3830, championships: 2, career_ppg: 21.8 },
  { id: 12, full_name: "Karl Malone", era_label: "1980s-2000s", career_points: 36928, career_rebounds: 14968, career_assists: 5248, career_steals: 1477, career_blocks: 1120, championships: 0, career_ppg: 25.0 },
  { id: 13, full_name: "John Stockton", era_label: "1980s-2000s", career_points: 13791, career_rebounds: 4051, career_assists: 15806, career_steals: 3265, career_blocks: 96, championships: 0, career_ppg: 13.1 },
  { id: 14, full_name: "Charles Barkley", era_label: "1980s-90s", career_points: 23757, career_rebounds: 12546, career_assists: 4215, career_steals: 1648, career_blocks: 596, championships: 0, career_ppg: 22.1 },
  { id: 15, full_name: "David Robinson", era_label: "1990s-2000s", career_points: 20790, career_rebounds: 10497, career_assists: 2954, career_steals: 1388, career_blocks: 2954, championships: 2, career_ppg: 21.1 },
  { id: 16, full_name: "Patrick Ewing", era_label: "1980s-2000s", career_points: 24815, career_rebounds: 11607, career_assists: 1776, career_steals: 1061, career_blocks: 2894, championships: 0, career_ppg: 21.0 },
  { id: 17, full_name: "Gary Payton", era_label: "1990s-2000s", career_points: 21813, career_rebounds: 6955, career_assists: 8966, career_steals: 2445, career_blocks: 217, championships: 1, career_ppg: 16.3 },
  { id: 18, full_name: "Allen Iverson", era_label: "1990s-2000s", career_points: 24368, career_rebounds: 3394, career_assists: 5624, career_steals: 1983, career_blocks: 61, championships: 0, career_ppg: 26.7 },
  { id: 19, full_name: "Kevin Garnett", era_label: "1990s-2010s", career_points: 26071, career_rebounds: 14662, career_assists: 5445, career_steals: 2049, career_blocks: 1916, championships: 1, career_ppg: 17.8 },
  { id: 20, full_name: "Paul Pierce", era_label: "2000s-2010s", career_points: 26397, career_rebounds: 6442, career_assists: 4305, career_steals: 1725, career_blocks: 457, championships: 1, career_ppg: 19.7 },
  { id: 21, full_name: "Dwyane Wade", era_label: "2000s-2010s", career_points: 23165, career_rebounds: 4459, career_assists: 5743, career_steals: 1673, career_blocks: 802, championships: 3, career_ppg: 22.0 },
  { id: 22, full_name: "Dirk Nowitzki", era_label: "2000s-2010s", career_points: 31560, career_rebounds: 11489, career_assists: 3651, career_steals: 934, career_blocks: 1133, championships: 1, career_ppg: 20.7 },
  { id: 23, full_name: "Steve Nash", era_label: "2000s-2010s", career_points: 17387, career_rebounds: 3939, career_assists: 10335, career_steals: 924, career_blocks: 82, championships: 0, career_ppg: 14.3 },
  { id: 24, full_name: "Oscar Robertson", era_label: "1960s-70s", career_points: 26710, career_rebounds: 7804, career_assists: 9887, career_steals: null, career_blocks: null, championships: 1, career_ppg: 25.7 },
  { id: 25, full_name: "Jerry West", era_label: "1960s-70s", career_points: 25192, career_rebounds: 5366, career_assists: 6238, career_steals: null, career_blocks: null, championships: 1, career_ppg: 27.0 },
  { id: 26, full_name: "Elgin Baylor", era_label: "1950s-70s", career_points: 23149, career_rebounds: 11463, career_assists: 3650, career_steals: null, career_blocks: null, championships: 0, career_ppg: 27.4 },
  { id: 27, full_name: "Julius Erving", era_label: "1970s-80s", career_points: 18364, career_rebounds: 5601, career_assists: 3224, career_steals: null, career_blocks: null, championships: 1, career_ppg: 22.0 },
  { id: 28, full_name: "Moses Malone", era_label: "1970s-90s", career_points: 27409, career_rebounds: 16212, career_assists: 1936, career_steals: null, career_blocks: null, championships: 1, career_ppg: 20.3 },
  { id: 29, full_name: "Isiah Thomas", era_label: "1980s-90s", career_points: 18822, career_rebounds: 3478, career_assists: 9061, career_steals: null, career_blocks: null, championships: 2, career_ppg: 19.2 },
  { id: 30, full_name: "Clyde Drexler", era_label: "1980s-90s", career_points: 22195, career_rebounds: 6677, career_assists: 6125, career_steals: 2207, career_blocks: null, championships: 1, career_ppg: 20.4 },
  { id: 31, full_name: "Scottie Pippen", era_label: "1980s-2000s", career_points: 18940, career_rebounds: 7494, career_assists: 6135, career_steals: 2307, career_blocks: null, championships: 6, career_ppg: 16.1 },
  { id: 32, full_name: "Dennis Rodman", era_label: "1980s-2000s", career_points: 6683, career_rebounds: 11954, career_assists: 1600, career_steals: null, career_blocks: null, championships: 5, career_ppg: 7.3 },
  { id: 33, full_name: "Reggie Miller", era_label: "1980s-2000s", career_points: 25279, career_rebounds: 4054, career_assists: 4141, career_steals: null, career_blocks: null, championships: 0, career_ppg: 18.2 },
  { id: 34, full_name: "Ray Allen", era_label: "1990s-2010s", career_points: 24505, career_rebounds: 5272, career_assists: 4361, career_steals: null, career_blocks: null, championships: 2, career_ppg: 18.9 },
  { id: 35, full_name: "Vince Carter", era_label: "1990s-2020s", career_points: 25728, career_rebounds: 4665, career_assists: 3343, career_steals: null, career_blocks: null, championships: 0, career_ppg: 16.7 },
  { id: 36, full_name: "Tracy McGrady", era_label: "1990s-2010s", career_points: 18381, career_rebounds: 5276, career_assists: 4161, career_steals: null, career_blocks: null, championships: 0, career_ppg: 19.6 },
  { id: 37, full_name: "Grant Hill", era_label: "1990s-2010s", career_points: 17618, career_rebounds: 6119, career_assists: 4111, career_steals: null, career_blocks: null, championships: 0, career_ppg: 16.7 },
  { id: 38, full_name: "George Gervin", era_label: "1970s-80s", career_points: 20708, career_rebounds: 5445, career_assists: 2214, career_steals: null, career_blocks: null, championships: 0, career_ppg: 25.1 },
  { id: 39, full_name: "Walt Frazier", era_label: "1960s-70s", career_points: 15581, career_rebounds: 4830, career_assists: 5040, career_steals: null, career_blocks: null, championships: 2, career_ppg: 18.9 },
  { id: 40, full_name: "Willis Reed", era_label: "1960s-70s", career_points: 12183, career_rebounds: 8414, career_assists: 1755, career_steals: null, career_blocks: null, championships: 2, career_ppg: 18.7 },
  { id: 41, full_name: "Bob Pettit", era_label: "1950s-60s", career_points: 20880, career_rebounds: 12849, career_assists: 2369, career_steals: null, career_blocks: null, championships: 1, career_ppg: 26.4 },
  { id: 42, full_name: "Nate Thurmond", era_label: "1960s-70s", career_points: 14437, career_rebounds: 14464, career_assists: 2181, career_steals: null, career_blocks: null, championships: 0, career_ppg: 15.0 },
  { id: 43, full_name: "Robert Parish", era_label: "1970s-90s", career_points: 23334, career_rebounds: 14715, career_assists: 1554, career_steals: null, career_blocks: null, championships: 4, career_ppg: 14.5 },
  { id: 44, full_name: "Pete Maravich", era_label: "1970s", career_points: 15948, career_rebounds: 4173, career_assists: 3563, career_steals: null, career_blocks: null, championships: 0, career_ppg: 24.2 },
] as const;

type Player = (typeof PLAYERS)[number];
type StatKey = "career_points" | "career_rebounds" | "career_assists" | "career_steals" | "career_blocks" | "championships" | "career_ppg";

const STAT_CATEGORIES: { key: StatKey; label: string; prompt: string }[] = [
  { key: "career_points", label: "career points", prompt: "Who scored more career points?" },
  { key: "career_rebounds", label: "career rebounds", prompt: "Who grabbed more career rebounds?" },
  { key: "career_assists", label: "career assists", prompt: "Who dished more career assists?" },
  { key: "career_steals", label: "career steals", prompt: "Who racked up more career steals?" },
  { key: "career_blocks", label: "career blocks", prompt: "Who swatted more career blocks?" },
  { key: "championships", label: "championships", prompt: "Who won more championships?" },
  { key: "career_ppg", label: "points per game", prompt: "Who averaged more points per game?" },
];

function difficultyBand(streak: number) {
  if (streak < 3) return { min: 0.5, max: 0.9 };
  if (streak < 6) return { min: 0.28, max: 0.5 };
  if (streak < 10) return { min: 0.12, max: 0.28 };
  return { min: 0.03, max: 0.12 };
}

function pairKey(idA: number, idB: number) {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

function generateMatchup(streak: number, seenPairs: Set<string>) {
  const pool = [...PLAYERS];
  const categoriesToTry = [...STAT_CATEGORIES].sort(() => Math.random() - 0.5);
  const { min, max } = difficultyBand(streak);

  for (const category of categoriesToTry) {
    const eligible = pool.filter((p) => p[category.key] != null);
    if (eligible.length < 6) continue;

    const sorted = [...eligible].sort((a, b) => (a[category.key] as number) - (b[category.key] as number));
    const n = sorted.length;
    const minGap = Math.max(1, Math.floor(n * min));
    const maxGap = Math.max(minGap + 1, Math.floor(n * max));

    const candidates: [Player, Player][] = [];
    for (let i = 0; i < n; i++) {
      for (let gap = minGap; gap <= maxGap; gap++) {
        const j = i + gap;
        if (j >= n) break;
        const a = sorted[i], b = sorted[j];
        if (a[category.key] === b[category.key]) continue;
        if (seenPairs.has(pairKey(a.id, b.id))) continue;
        candidates.push([a, b]);
      }
    }
    if (candidates.length === 0) continue;

    const [a, b] = candidates[Math.floor(Math.random() * candidates.length)];
    const correctPlayerId = (a[category.key] as number) > (b[category.key] as number) ? a.id : b.id;
    const swap = Math.random() < 0.5;
    return {
      category: category.key,
      categoryLabel: category.label,
      prompt: category.prompt,
      playerA: swap ? a : b,
      playerB: swap ? b : a,
      correctPlayerId,
      pk: pairKey(a.id, b.id),
    };
  }

  if (streak !== 0) return generateMatchup(0, seenPairs);
  if (seenPairs.size > 0) return generateMatchup(0, new Set<string>());
  return null;
}

function formatStat(category: StatKey, value: number | null) {
  if (value == null) return "N/A";
  if (category === "career_ppg") return `${value} PPG`;
  if (category === "championships") return `${value} ${value === 1 ? "ring" : "rings"}`;
  return value.toLocaleString();
}

function PlayerCard({ player, state, onClick }: { player: Player; state: "idle" | "correct" | "incorrect"; onClick: () => void }) {
  const initials = player.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <button
      onClick={onClick}
      disabled={state !== "idle"}
      className={[
        "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
        state === "correct" ? "border-green-500 bg-green-500/10" : "",
        state === "incorrect" ? "border-red-500 bg-red-500/10" : "",
        state === "idle" ? "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-primary font-black text-2xl border-2 border-primary/40">
        {initials}
      </div>
      <div className="font-black text-sm text-center text-white">{player.full_name}</div>
      <div className="text-xs text-white/50">{player.era_label}</div>
      {state !== "idle" && (
        <div className={`text-base font-black ${state === "correct" ? "text-green-400" : "text-red-400"}`}>
          {/* stat revealed after pick */}
        </div>
      )}
    </button>
  );
}

export function WhoYaGotPage() {
  const { getToken, isSignedIn } = useAuth();
  const qc = useQueryClient();
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [matchup, setMatchup] = useState(() => generateMatchup(0, new Set<string>()));
  const [seenPairs, setSeenPairs] = useState(new Set<string>());
  const [revealed, setRevealed] = useState<"correct" | "wrong" | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const nextRound = useCallback((currentStreak: number, pairs: Set<string>) => {
    const next = generateMatchup(currentStreak, pairs);
    setMatchup(next);
    setRevealed(null);
  }, []);

  async function saveSession(finalStreak: number, finalBest: number, rounds: number) {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      await fetch(`${apiBase}/api/arcade/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ game: "who-ya-got", score: finalBest, bestStreak: finalBest, roundsPlayed: rounds }),
      });
      qc.invalidateQueries({ queryKey: ["/api/arcade/leaderboard", { game: "who-ya-got" }] });
      qc.invalidateQueries({ queryKey: ["/api/arcade/my-stats"] });
      setSaved(true);
    } catch {
      // ignore
    }
  }

  function handlePick(pickedId: number) {
    if (revealed || !matchup) return;
    const correct = pickedId === matchup.correctPlayerId;
    setRevealed(correct ? "correct" : "wrong");
    const newRounds = roundsPlayed + 1;
    setRoundsPlayed(newRounds);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const newBest = Math.max(bestStreak, newStreak);
      setBestStreak(newBest);
      const updated = new Set(seenPairs);
      updated.add(matchup.pk);
      setSeenPairs(updated);
      setTimeout(() => nextRound(newStreak, updated), 900);
    } else {
      setTimeout(() => {
        setGameOver(true);
        saveSession(streak, Math.max(bestStreak, streak), newRounds);
      }, 600);
    }
  }

  function handlePlayAgain() {
    setStreak(0);
    setRoundsPlayed(0);
    setGameOver(false);
    setSaved(false);
    setSeenPairs(new Set());
    nextRound(0, new Set());
  }

  if (!matchup) return null;
  const { playerA, playerB, category, prompt } = matchup;

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl uppercase tracking-widest text-primary">Who Ya Got?</h1>
        <p className="text-white/50 text-sm mt-1">NBA higher or lower — pick the player with more</p>
      </div>

      {gameOver ? (
        <div className="bg-secondary border-2 border-white/10 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🏀</div>
          <h2 className="font-display text-2xl uppercase text-primary mb-2">Run Over!</h2>
          <p className="text-white/70 mb-1">You went <span className="text-white font-bold">{streak}</span> deep</p>
          <p className="text-white/70 mb-1">Best streak: <span className="text-primary font-bold">{bestStreak}</span></p>
          <p className="text-white/70 mb-6">Rounds played: <span className="text-white font-bold">{roundsPlayed}</span></p>
          {saved && <p className="text-green-400 text-xs mb-4">✓ Session saved</p>}
          <button
            onClick={handlePlayAgain}
            className="bg-primary text-white font-black px-8 py-3 rounded-xl text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="bg-secondary border-2 border-white/10 rounded-2xl p-6">
          <div className="flex justify-between text-sm font-bold mb-5">
            <span className="text-white/70">Streak: <span className="text-white">{streak}</span></span>
            <span className="text-primary">Best: {bestStreak}</span>
          </div>

          <h3 className="text-center text-white font-black text-lg mb-5">{prompt}</h3>

          <div className="flex gap-3">
            {[playerA, playerB].map((p) => {
              const isCorrect = p.id === matchup.correctPlayerId;
              const cardState = revealed
                ? isCorrect ? "correct" : "incorrect"
                : "idle";
              return (
                <button
                  key={p.id}
                  onClick={() => handlePick(p.id)}
                  disabled={!!revealed}
                  className={[
                    "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                    cardState === "correct" ? "border-green-500 bg-green-500/10" : "",
                    cardState === "incorrect" ? "border-red-500 bg-red-500/10" : "",
                    cardState === "idle" ? "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-primary/5 cursor-pointer" : "cursor-default",
                  ].join(" ")}
                >
                  <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center text-primary font-black text-2xl border-2 border-primary/30">
                    {p.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="font-black text-sm text-center text-white">{p.full_name}</div>
                  <div className="text-xs text-white/50">{p.era_label}</div>
                  {revealed && (
                    <div className={`text-sm font-black ${cardState === "correct" ? "text-green-400" : "text-red-400"}`}>
                      {formatStat(category, p[category] as number | null)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
