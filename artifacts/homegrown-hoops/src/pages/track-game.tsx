import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  useListTeams,
  useListPlayers,
  useGetMyProfile,
  useSubmitTrackGame,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Screen = "setup" | "tracking" | "summary";
type Mode = "full" | "my_team_only";

interface PlayerStat {
  playerId: number | null;
  playerName: string;
  teamId: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
}

function deriveSeason(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function calcPts(p: PlayerStat): number {
  return (p.fgm - p.tpm) * 2 + p.tpm * 3 + p.ftm;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TrackGamePage() {
  const [, navigate] = useLocation();
  const { isSignedIn } = useUser();
  const { data: myProfile } = useGetMyProfile();
  const { toast } = useToast();

  const [screen, setScreen] = useState<Screen>("setup");
  const [mode, setMode] = useState<Mode>("full");
  const [homeTeamId, setHomeTeamId] = useState<number | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<number | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const [gameDate, setGameDate] = useState(todayISO());
  const [season, setSeason] = useState(deriveSeason(todayISO()));
  const [locationStr, setLocationStr] = useState("");
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeamId, setNewPlayerTeamId] = useState<number | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const submitGame = useSubmitTrackGame();
  const { data: teams } = useListTeams();
  const { data: allPlayers } = useListPlayers();

  const canAccess =
    isSignedIn && (myProfile?.role === "admin" || myProfile?.role === "manager");

  const homePlayers = useMemo(
    () => (allPlayers ?? []).filter((p) => p.teamId === homeTeamId),
    [allPlayers, homeTeamId]
  );
  const awayPlayers = useMemo(
    () => (allPlayers ?? []).filter((p) => p.teamId === awayTeamId),
    [allPlayers, awayTeamId]
  );

  function buildRoster() {
    const rows: PlayerStat[] = [];
    const seen = new Set<number>();
    for (const p of homePlayers) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      rows.push({
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`.trim(),
        teamId: homeTeamId!,
        pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
        reb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
      });
    }
    if (mode === "full") {
      for (const p of awayPlayers) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        rows.push({
          playerId: p.id,
          playerName: `${p.firstName} ${p.lastName}`.trim(),
          teamId: awayTeamId!,
          pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
          reb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
        });
      }
    }
    return rows;
  }

  function startTracking() {
    if (!homeTeamId) { toast({ title: "Select a home team", variant: "destructive" }); return; }
    if (mode === "full" && !awayTeamId) { toast({ title: "Select an away team", variant: "destructive" }); return; }
    if (mode === "my_team_only" && !opponentName.trim()) { toast({ title: "Enter opponent name", variant: "destructive" }); return; }
    const roster = buildRoster();
    setPlayers(roster);
    setHomeScore(0);
    setAwayScore(0);
    setNewPlayerTeamId(homeTeamId);
    setScreen("tracking");
  }

  function updatePlayer(idx: number, partial: Partial<PlayerStat>) {
    setPlayers((prev) => {
      const next = [...prev];
      const old = next[idx];
      next[idx] = { ...old, ...partial };
      // Recalculate score totals for home/away
      let hs = 0, as_ = 0;
      for (const p of next) {
        const pts = calcPts(p);
        if (p.teamId === homeTeamId) hs += pts;
        else as_ += pts;
      }
      setHomeScore(hs);
      if (mode === "full") setAwayScore(as_);
      return next;
    });
  }

  function quickStat(idx: number, type: "fg2" | "fg3" | "ft" | "miss_fg" | "reb" | "ast" | "stl" | "blk" | "tov") {
    const p = players[idx];
    const updates: Partial<PlayerStat> = {};
    if (type === "fg2") { updates.fgm = p.fgm + 1; updates.fga = p.fga + 1; }
    else if (type === "fg3") { updates.fgm = p.fgm + 1; updates.fga = p.fga + 1; updates.tpm = p.tpm + 1; updates.tpa = p.tpa + 1; }
    else if (type === "ft") { updates.ftm = p.ftm + 1; updates.fta = p.fta + 1; }
    else if (type === "miss_fg") { updates.fga = p.fga + 1; }
    else if (type === "reb") { updates.reb = p.reb + 1; }
    else if (type === "ast") { updates.ast = p.ast + 1; }
    else if (type === "stl") { updates.stl = p.stl + 1; }
    else if (type === "blk") { updates.blk = p.blk + 1; }
    else if (type === "tov") { updates.tov = p.tov + 1; }
    updatePlayer(idx, updates);
  }

  function addManualPlayer() {
    if (!newPlayerName.trim()) return;
    if (!newPlayerTeamId) { toast({ title: "Select player's team", variant: "destructive" }); return; }
    const newP: PlayerStat = {
      playerId: null,
      playerName: newPlayerName.trim(),
      teamId: newPlayerTeamId,
      pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
      reb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
    };
    setPlayers((prev) => [...prev, newP]);
    setNewPlayerName("");
  }

  async function handleSubmit() {
    try {
      const finalAwayScore = mode === "full" ? awayScore : awayScore;
      await submitGame.mutateAsync({
        data: {
          homeTeamId: homeTeamId!,
          awayTeamId: mode === "full" ? awayTeamId : null,
          opponentName: mode === "my_team_only" ? opponentName : null,
          homeScore,
          awayScore: finalAwayScore,
          gameDate,
          season,
          location: locationStr || null,
          playerStats: players.map((p) => ({
            playerId: p.playerId,
            playerName: p.playerName,
            teamId: p.teamId,
            points: calcPts(p),
            rebounds: p.reb,
            assists: p.ast,
            steals: p.stl,
            blocks: p.blk,
            turnovers: p.tov,
            fieldGoalsMade: p.fgm,
            fieldGoalsAttempted: p.fga,
            threePointersMade: p.tpm,
            threePointersAttempted: p.tpa,
            freeThrowsMade: p.ftm,
            freeThrowsAttempted: p.fta,
          })),
        },
      });
      const isAdmin = myProfile?.role === "admin";
      toast({
        title: isAdmin ? "Game saved!" : "Game submitted for review",
        description: isAdmin
          ? "Stats are now live."
          : "An admin will review and approve your submission.",
      });
      navigate("/games");
    } catch {
      toast({ title: "Submission failed", variant: "destructive" });
    }
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="border-2 border-border p-8 shadow-[6px_6px_0_0_rgba(0,0,0,1)] text-center">
          <h2 className="font-display text-2xl mb-2">Sign in required</h2>
          <p className="text-muted-foreground">You must be signed in to track games.</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="border-2 border-border p-8 shadow-[6px_6px_0_0_rgba(0,0,0,1)] text-center">
          <h2 className="font-display text-2xl mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only managers and admins can track games.</p>
        </div>
      </div>
    );
  }

  const homeTeamName = teams?.find((t) => t.id === homeTeamId)?.name ?? "Home";
  const awayTeamName =
    mode === "full"
      ? teams?.find((t) => t.id === awayTeamId)?.name ?? "Away"
      : opponentName || "Opponent";

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────────
  if (screen === "setup") {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 max-w-lg mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate("/games")}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to Games
          </button>
          <h1 className="font-display text-4xl mt-2">Track Game</h1>
        </div>

        {/* Mode toggle */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-muted-foreground">
            Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["full", "my_team_only"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`border-2 border-border p-3 text-sm font-bold uppercase tracking-wide transition-all ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {m === "full" ? "Full Game" : "My Team Only"}
              </button>
            ))}
          </div>
          {mode === "my_team_only" && (
            <p className="text-xs text-muted-foreground mt-1">
              Track stats for your team only. Enter the opponent's name.
            </p>
          )}
        </div>

        {/* Home team */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
            Home Team
          </label>
          <select
            className="w-full border-2 border-border bg-background p-3 text-foreground font-medium focus:outline-none focus:border-primary"
            value={homeTeamId ?? ""}
            onChange={(e) => setHomeTeamId(Number(e.target.value) || null)}
          >
            <option value="">Select home team…</option>
            {(teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Away team or opponent name */}
        {mode === "full" ? (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Away Team
            </label>
            <select
              className="w-full border-2 border-border bg-background p-3 text-foreground font-medium focus:outline-none focus:border-primary"
              value={awayTeamId ?? ""}
              onChange={(e) => setAwayTeamId(Number(e.target.value) || null)}
            >
              <option value="">Select away team…</option>
              {(teams ?? [])
                .filter((t) => t.id !== homeTeamId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Opponent Name
            </label>
            <input
              type="text"
              placeholder="e.g. North Side Ballers"
              className="w-full border-2 border-border bg-background p-3 text-foreground font-medium focus:outline-none focus:border-primary"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
            />
          </div>
        )}

        {/* Date */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
            Date
          </label>
          <input
            type="date"
            className="w-full border-2 border-border bg-background p-3 text-foreground font-medium focus:outline-none focus:border-primary"
            value={gameDate}
            onChange={(e) => {
              setGameDate(e.target.value);
              setSeason(deriveSeason(e.target.value));
            }}
          />
        </div>

        {/* Season */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
            Season
          </label>
          <input
            type="text"
            placeholder="e.g. 2025-26"
            className="w-full border-2 border-border bg-background p-3 text-foreground font-medium focus:outline-none focus:border-primary"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
            Location (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Riverside Court"
            className="w-full border-2 border-border bg-background p-3 text-foreground font-medium focus:outline-none focus:border-primary"
            value={locationStr}
            onChange={(e) => setLocationStr(e.target.value)}
          />
        </div>

        <button
          onClick={startTracking}
          className="w-full bg-primary text-primary-foreground border-2 border-border p-4 font-display text-xl uppercase tracking-wide shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
        >
          Load Roster & Start Tracking →
        </button>
      </div>
    );
  }

  // ── TRACKING SCREEN ──────────────────────────────────────────────────────────
  if (screen === "tracking") {
    const homePts = players.filter((p) => p.teamId === homeTeamId).reduce((s, p) => s + calcPts(p), 0);
    const awayPts = mode === "full"
      ? players.filter((p) => p.teamId !== homeTeamId).reduce((s, p) => s + calcPts(p), 0)
      : awayScore;

    return (
      <div className="min-h-screen bg-background text-foreground pb-24">
        {/* Score header */}
        <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <button
              onClick={() => setScreen("setup")}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              ← Setup
            </button>
            <div className="flex items-center gap-4 font-display text-2xl">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide truncate max-w-[100px]">
                  {homeTeamName}
                </div>
                <div className="text-4xl text-primary">{homePts}</div>
              </div>
              <div className="text-muted-foreground text-xl">—</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide truncate max-w-[100px]">
                  {awayTeamName}
                </div>
                {mode === "full" ? (
                  <div className="text-4xl">{awayPts}</div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    className="w-16 text-4xl text-center bg-transparent border-b-2 border-primary focus:outline-none"
                    value={awayScore}
                    onChange={(e) => setAwayScore(Number(e.target.value) || 0)}
                  />
                )}
              </div>
            </div>
            <button
              onClick={() => setScreen("summary")}
              className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold uppercase border border-border"
            >
              Done →
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">
          {/* Home team players */}
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
            {homeTeamName}
          </div>
          {players
            .map((p, i) => ({ p, i }))
            .filter(({ p }) => p.teamId === homeTeamId)
            .map(({ p, i }) => (
              <PlayerCard key={i} player={p} idx={i} onQuick={quickStat} onEdit={setEditIdx} />
            ))}

          {/* Away team players */}
          {mode === "full" && (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-4 mb-1">
                {awayTeamName}
              </div>
              {players
                .map((p, i) => ({ p, i }))
                .filter(({ p }) => p.teamId !== homeTeamId)
                .map(({ p, i }) => (
                  <PlayerCard key={i} player={p} idx={i} onQuick={quickStat} onEdit={setEditIdx} />
                ))}
            </>
          )}

          {/* Add manual player */}
          <div className="border-2 border-dashed border-border p-3 mt-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Add Player
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Player name"
                className="flex-1 border-2 border-border bg-background p-2 text-sm focus:outline-none focus:border-primary"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualPlayer()}
              />
              {mode === "full" && (
                <select
                  className="border-2 border-border bg-background p-2 text-sm focus:outline-none focus:border-primary"
                  value={newPlayerTeamId ?? ""}
                  onChange={(e) => setNewPlayerTeamId(Number(e.target.value) || null)}
                >
                  <option value={homeTeamId ?? ""}>{homeTeamName}</option>
                  {awayTeamId && <option value={awayTeamId}>{awayTeamName}</option>}
                </select>
              )}
              <button
                onClick={addManualPlayer}
                className="bg-primary text-primary-foreground border-2 border-border px-3 py-2 text-sm font-bold hover:opacity-90"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Edit modal */}
        {editIdx !== null && (
          <EditModal
            player={players[editIdx]}
            idx={editIdx}
            onUpdate={updatePlayer}
            onClose={() => setEditIdx(null)}
          />
        )}
      </div>
    );
  }

  // ── SUMMARY SCREEN ───────────────────────────────────────────────────────────
  const activePlayers = players.filter(
    (p) => calcPts(p) > 0 || p.reb > 0 || p.ast > 0 || p.stl > 0 || p.blk > 0
  );

  const homeFinal = players.filter((p) => p.teamId === homeTeamId).reduce((s, p) => s + calcPts(p), 0);
  const awayFinal =
    mode === "full"
      ? players.filter((p) => p.teamId !== homeTeamId).reduce((s, p) => s + calcPts(p), 0)
      : awayScore;

  const isAdmin = myProfile?.role === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <button
          onClick={() => setScreen("tracking")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Back to Tracking
        </button>
        <h1 className="font-display text-4xl mt-2">Review & Submit</h1>
      </div>

      {/* Final score */}
      <div className="border-2 border-border shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-6 mb-6 text-center">
        <div className="font-display text-5xl">
          <span className="text-primary">{homeFinal}</span>
          <span className="text-muted-foreground mx-4">—</span>
          <span>{awayFinal}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {homeTeamName} vs {awayTeamName}
        </div>
        <div className="text-xs text-muted-foreground">{gameDate} · {season}</div>
      </div>

      {!isAdmin && (
        <div className="border-2 border-yellow-600 bg-yellow-600/10 p-3 mb-4 text-sm text-yellow-400">
          Your submission will be reviewed by an admin before going live.
        </div>
      )}

      {/* Box score */}
      <div className="border-2 border-border mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted">
              <th className="text-left p-2 font-bold">Player</th>
              <th className="p-2">PTS</th>
              <th className="p-2">REB</th>
              <th className="p-2">AST</th>
              <th className="p-2">STL</th>
              <th className="p-2">BLK</th>
              <th className="p-2">FG</th>
              <th className="p-2">3P</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...activePlayers.filter((p) => p.teamId === homeTeamId),
              ...(mode === "full" ? activePlayers.filter((p) => p.teamId !== homeTeamId) : []),
            ].map((p, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-2 font-medium text-xs">
                  {p.playerName}
                  {mode === "full" && p.teamId !== homeTeamId && (
                    <span className="ml-1 text-muted-foreground">(away)</span>
                  )}
                </td>
                <td className="p-2 text-center font-bold text-primary">{calcPts(p)}</td>
                <td className="p-2 text-center">{p.reb}</td>
                <td className="p-2 text-center">{p.ast}</td>
                <td className="p-2 text-center">{p.stl}</td>
                <td className="p-2 text-center">{p.blk}</td>
                <td className="p-2 text-center text-xs">{p.fgm}/{p.fga}</td>
                <td className="p-2 text-center text-xs">{p.tpm}/{p.tpa}</td>
              </tr>
            ))}
            {activePlayers.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted-foreground text-xs">
                  No stats recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitGame.isPending}
        className="w-full bg-primary text-primary-foreground border-2 border-border p-4 font-display text-xl uppercase tracking-wide shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
      >
        {submitGame.isPending
          ? "Submitting…"
          : isAdmin
          ? "Save Game"
          : "Submit for Review"}
      </button>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface PlayerCardProps {
  player: PlayerStat;
  idx: number;
  onQuick: (idx: number, type: "fg2" | "fg3" | "ft" | "miss_fg" | "reb" | "ast" | "stl" | "blk" | "tov") => void;
  onEdit: (idx: number) => void;
}

function PlayerCard({ player, idx, onQuick, onEdit }: PlayerCardProps) {
  const pts = calcPts(player);
  return (
    <div className="border-2 border-border bg-card shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-bold text-sm truncate">{player.playerName}</span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
          <span className="text-primary font-bold text-base">{pts}</span>
          <span>{player.reb}r</span>
          <span>{player.ast}a</span>
          <button
            onClick={() => onEdit(idx)}
            className="border border-border px-2 py-1 hover:bg-muted text-xs"
            title="Edit all stats"
          >
            ✏️
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 divide-x divide-border text-center">
        {(
          [
            { label: "+2", type: "fg2" as const, color: "text-primary" },
            { label: "+3", type: "fg3" as const, color: "text-yellow-400" },
            { label: "FT", type: "ft" as const, color: "text-blue-400" },
            { label: "×", type: "miss_fg" as const, color: "text-muted-foreground" },
            { label: "+R", type: "reb" as const, color: "text-green-400" },
            { label: "+A", type: "ast" as const, color: "text-cyan-400" },
            { label: "+S", type: "stl" as const, color: "text-purple-400" },
          ] as const
        ).map(({ label, type, color }) => (
          <button
            key={type}
            onClick={() => onQuick(idx, type)}
            className={`py-2 text-xs font-bold hover:bg-muted active:bg-muted/80 ${color}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface EditModalProps {
  player: PlayerStat;
  idx: number;
  onUpdate: (idx: number, partial: Partial<PlayerStat>) => void;
  onClose: () => void;
}

function EditModal({ player, idx, onUpdate, onClose }: EditModalProps) {
  const [local, setLocal] = useState<PlayerStat>({ ...player });

  function set(key: keyof PlayerStat, val: number) {
    setLocal((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  }

  function save() {
    onUpdate(idx, local);
    onClose();
  }

  const pts = calcPts(local);

  const fields: { key: keyof PlayerStat; label: string }[] = [
    { key: "fgm", label: "FGM" },
    { key: "fga", label: "FGA" },
    { key: "tpm", label: "3PM" },
    { key: "tpa", label: "3PA" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "reb", label: "REB" },
    { key: "ast", label: "AST" },
    { key: "stl", label: "STL" },
    { key: "blk", label: "BLK" },
    { key: "tov", label: "TOV" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
      <div className="bg-background border-t-2 border-l-2 border-r-2 border-border w-full max-w-lg p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">{player.playerName}</h3>
          <div className="text-2xl font-bold text-primary">{pts} PTS</div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {fields.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between border-2 border-border p-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set(key, (local[key] as number) - 1)}
                  className="w-7 h-7 border border-border hover:bg-muted font-bold"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold">{local[key] as number}</span>
                <button
                  onClick={() => set(key, (local[key] as number) + 1)}
                  className="w-7 h-7 border border-border hover:bg-muted font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="border-2 border-border p-3 font-bold text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="bg-primary text-primary-foreground border-2 border-border p-3 font-bold text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
