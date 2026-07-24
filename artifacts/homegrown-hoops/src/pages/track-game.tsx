import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTeams,
  useListPlayers,
  useGetMyProfile,
  useSubmitTrackGame,
  useGetTrackGameAccess,
} from "@workspace/api-client-react";
import "./track-game.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SetupPlayer {
  uid: string;
  name: string;
  jerseyNum: string;
  pos: string;
  playerId: number | null;
  isGuest?: boolean;
}

interface TrackerPlayer {
  uid: string;
  name: string;
  pos: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  fouls: number;
  fgm: number;  // total FGM (2s + 3s combined)
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  playerId: number | null;
  teamId: number;
}

interface HistoryEntry {
  team: "home" | "away";
  idx: number;
  prevPlayer: TrackerPlayer;
  prevOppScore: number;
}

type Screen = "setup" | "tracker" | "summary";
type Mode = "myteam" | "both";

// ── Helpers ───────────────────────────────────────────────────────────────────

let _uid = 0;
function uid() { return `u${++_uid}`; }

function todayISO() { return new Date().toISOString().slice(0, 10); }

function deriveSeason(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const m = d.getUTCMonth() + 1;
  const y = d.getUTCFullYear();
  const sy = m >= 9 ? y : y - 1;
  return `${sy}-${String(sy + 1).slice(2)}`;
}

function mkTracker(
  name: string, pos: string, playerId: number | null, teamId: number
): TrackerPlayer {
  return {
    uid: uid(), name, pos, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
    to: 0, fouls: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
    playerId, teamId,
  };
}

function fmtPct(m: number, a: number) {
  return a > 0 ? Math.round(m / a * 100) + "%" : "—";
}

function pctCls(m: number, a: number) {
  if (a === 0) return "neutral";
  const v = Math.round(m / a * 100);
  if (v >= 50) return "good";
  if (v >= 35) return "ok";
  return "bad";
}

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

const SCORE_LABELS: Record<string, string> = {
  pts: "Points", fg3m: "3PT Made", fg2m: "2PT Made",
  fg2a: "2PT Att", fg3a: "3PT Att", ftm: "FT Made", fta: "FT Att",
};
const OTHER_LABELS: Record<string, string> = {
  reb: "Rebounds", ast: "Assists", stl: "Steals", blk: "Blocks", to: "Turnovers",
};
const OPP_STAT_LABELS: Record<string, string> = {
  reb: "Reb", stl: "Steal", blk: "Block", to: "TO", foul: "Foul",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TrackGamePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { isSignedIn } = useUser();
  const qc = useQueryClient();
  const { data: myProfile } = useGetMyProfile();
  const submitGame = useSubmitTrackGame();
  const { data: teams } = useListTeams();
  const { data: allPlayers } = useListPlayers();
  const { data: trackAccess } = useGetTrackGameAccess({ query: { enabled: isSignedIn === true } });

  // Preselect team from ?team=ID query param
  const preselectedTeamId = (() => {
    const params = new URLSearchParams(search);
    const v = params.get("team");
    return v ? parseInt(v, 10) || null : null;
  })();

  // Setup state
  const [screen, setScreen] = useState<Screen>("setup");
  const [mode, setMode] = useState<Mode>("myteam");
  const [myTeamSide, setMyTeamSide] = useState<"home" | "away">("home");
  const [homeTeamId, setHomeTeamId] = useState<number | null>(preselectedTeamId);
  const [awayTeamId, setAwayTeamId] = useState<number | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const [gameDate, setGameDate] = useState(todayISO());
  const [locationStr, setLocationStr] = useState("");
  const [homeSetupPlayers, setHomeSetupPlayers] = useState<SetupPlayer[]>([]);
  const [awaySetupPlayers, setAwaySetupPlayers] = useState<SetupPlayer[]>([]);

  // Tracker state
  const [activeTeam, setActiveTeam] = useState<"home" | "away">("home");
  const [period, setPeriod] = useState(1);
  const [selPlayer, setSelPlayer] = useState<number | null>(null);
  const [homePlayerStats, setHomePlayerStats] = useState<TrackerPlayer[]>([]);
  const [awayPlayerStats, setAwayPlayerStats] = useState<TrackerPlayer[]>([]);
  const [oppStats, setOppStats] = useState({ score: 0, reb: 0, stl: 0, blk: 0, to: 0, foul: 0 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Edit modal state
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVals, setEditVals] = useState<Record<string, number>>({});

  // Guest search state
  const [guestSearchTeam, setGuestSearchTeam] = useState<"home" | "away" | null>(null);
  const [guestSearchQuery, setGuestSearchQuery] = useState("");

  // Toast state
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const canAccess = isSignedIn && (trackAccess?.canTrack ?? false) && !myProfile?.isPending;

  // Build authorized team set: admin sees all; others see managed + delegated only
  const isAdmin = myProfile?.role === "admin";
  const authorizedTeamIds: number[] = isAdmin
    ? []  // empty means "all" for admin
    : [
        ...(trackAccess?.managedTeamIds ?? []),
        ...(trackAccess?.delegatedTeamIds ?? []),
      ];
  const myTeamsForPicker = isAdmin
    ? (teams ?? [])
    : (teams ?? []).filter((t) => authorizedTeamIds.includes(t.id));

  // ── Pre-populate rosters from DB when team changes
  useEffect(() => {
    if (!homeTeamId || !allPlayers) { setHomeSetupPlayers([]); return; }
    setHomeSetupPlayers(
      allPlayers
        .filter((p) => p.teamId === homeTeamId)
        .map((p) => ({
          uid: uid(),
          name: `${p.firstName} ${p.lastName}`.trim(),
          jerseyNum: p.number ?? "",
          pos: p.position ?? "PG",
          playerId: p.id,
        }))
    );
  }, [homeTeamId, allPlayers]);

  useEffect(() => {
    if (!awayTeamId || !allPlayers) { setAwaySetupPlayers([]); return; }
    setAwaySetupPlayers(
      allPlayers
        .filter((p) => p.teamId === awayTeamId)
        .map((p) => ({
          uid: uid(),
          name: `${p.firstName} ${p.lastName}`.trim(),
          jerseyNum: p.number ?? "",
          pos: p.position ?? "PG",
          playerId: p.id,
        }))
    );
  }, [awayTeamId, allPlayers]);

  // ── Toast
  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }

  // ── Setup helpers
  function addSetupPlayer(team: "home" | "away") {
    const sp: SetupPlayer = { uid: uid(), name: "", jerseyNum: "", pos: "PG", playerId: null };
    if (team === "home") setHomeSetupPlayers((p) => [...p, sp]);
    else setAwaySetupPlayers((p) => [...p, sp]);
  }

  function updateSetupPlayer(team: "home" | "away", id: string, field: "name" | "pos" | "jerseyNum", val: string) {
    const upd = (prev: SetupPlayer[]) =>
      prev.map((p) => (p.uid === id ? { ...p, [field]: val } : p));
    if (team === "home") setHomeSetupPlayers(upd);
    else setAwaySetupPlayers(upd);
  }

  function removeSetupPlayer(team: "home" | "away", id: string) {
    if (team === "home") setHomeSetupPlayers((p) => p.filter((x) => x.uid !== id));
    else setAwaySetupPlayers((p) => p.filter((x) => x.uid !== id));
  }

  function openGuestSearch(team: "home" | "away") {
    setGuestSearchQuery("");
    setGuestSearchTeam(team);
  }

  function closeGuestSearch() {
    setGuestSearchTeam(null);
    setGuestSearchQuery("");
  }

  function addGuestPlayer(team: "home" | "away", player: NonNullable<typeof allPlayers>[number]) {
    const sp: SetupPlayer = {
      uid: uid(),
      name: `${player.firstName} ${player.lastName}`.trim(),
      jerseyNum: player.number ?? "",
      pos: player.position ?? "PG",
      playerId: player.id,
      isGuest: true,
    };
    if (team === "home") setHomeSetupPlayers((p) => [...p, sp]);
    else setAwaySetupPlayers((p) => [...p, sp]);
    closeGuestSearch();
    showToast("Guest player added ✓");
  }

  const guestSearchRosterIds = new Set(
    (guestSearchTeam === "home" ? homeSetupPlayers : awaySetupPlayers)
      .map((p) => p.playerId)
      .filter((id): id is number => id !== null)
  );

  const filteredGuestPlayers = (allPlayers ?? []).filter((p) => {
    if (p.firstName.startsWith("#") && !p.lastName) return false;
    if (guestSearchRosterIds.has(p.id)) return false;
    if (!guestSearchQuery.trim()) return true;
    const q = guestSearchQuery.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
  });

  // ── Start game
  function startGame() {
    if (!homeTeamId) { showToast("Select your team"); return; }
    if (mode === "both" && !awayTeamId) { showToast("Select an away team"); return; }
    if (mode === "myteam" && !opponentName.trim()) { showToast("Enter opponent name"); return; }

    const make = (players: SetupPlayer[], teamId: number) =>
      players
        .filter((p) => p.name.trim() || p.jerseyNum.trim())
        .map((p) => {
          const name = p.name.trim() || `#${p.jerseyNum.trim()}`;
          return mkTracker(name, p.pos, p.playerId, teamId);
        });

    setHomePlayerStats(make(homeSetupPlayers, homeTeamId!));
    setAwayPlayerStats(mode === "both" ? make(awaySetupPlayers, awayTeamId!) : []);
    setOppStats({ score: 0, reb: 0, stl: 0, blk: 0, to: 0, foul: 0 });
    setHistory([]);
    setActiveTeam("home");
    setSelPlayer(null);
    setPeriod(1);
    setScreen("tracker");
  }

  // ── Tracker computed values
  const activePlayers = activeTeam === "home" ? homePlayerStats : awayPlayerStats;

  function getHomeScore() { return homePlayerStats.reduce((s, p) => s + p.pts, 0); }
  function getAwayScore() {
    return mode === "myteam"
      ? oppStats.score
      : awayPlayerStats.reduce((s, p) => s + p.pts, 0);
  }

  // ── Tracker actions
  function switchTeam(t: "home" | "away") {
    setActiveTeam(t);
    setSelPlayer(null);
  }

  function selectPlayer(i: number) {
    setSelPlayer((prev) => (prev === i ? null : i));
  }

  function addStat(e: React.MouseEvent, idx: number, stat: string) {
    e.stopPropagation();
    const arr = activeTeam === "home" ? homePlayerStats : awayPlayerStats;
    const p = arr[idx];
    const prevOppScore = oppStats.score;

    let updated = { ...p };
    switch (stat) {
      case "fg2":    updated = { ...updated, pts: p.pts + 2, fgm: p.fgm + 1, fga: p.fga + 1 }; break;
      case "fg3":    updated = { ...updated, pts: p.pts + 3, fgm: p.fgm + 1, fga: p.fga + 1, fg3m: p.fg3m + 1, fg3a: p.fg3a + 1 }; break;
      case "ftm":    updated = { ...updated, pts: p.pts + 1, ftm: p.ftm + 1, fta: p.fta + 1 }; break;
      case "miss2":  updated = { ...updated, fga: p.fga + 1 }; break;
      case "miss3":  updated = { ...updated, fg3a: p.fg3a + 1, fga: p.fga + 1 }; break;
      case "ftmiss": updated = { ...updated, fta: p.fta + 1 }; break;
      case "reb":    updated = { ...updated, reb: p.reb + 1 }; break;
      case "ast":    updated = { ...updated, ast: p.ast + 1 }; break;
      case "stl":    updated = { ...updated, stl: p.stl + 1 }; break;
      case "blk":    updated = { ...updated, blk: p.blk + 1 }; break;
      case "to":     updated = { ...updated, to: p.to + 1 }; break;
      case "foul":   updated = { ...updated, fouls: p.fouls + 1 }; break;
    }

    const set = activeTeam === "home" ? setHomePlayerStats : setAwayPlayerStats;
    set((prev) => prev.map((pp, i) => (i === idx ? updated : pp)));
    setHistory((h) => [...h, { team: activeTeam, idx, prevPlayer: { ...p }, prevOppScore }]);
  }

  function undoLast() {
    if (!history.length) return;
    const last = history[history.length - 1];
    const set = last.team === "home" ? setHomePlayerStats : setAwayPlayerStats;
    set((prev) => prev.map((p, i) => (i === last.idx ? last.prevPlayer : p)));
    setOppStats((s) => ({ ...s, score: last.prevOppScore }));
    setHistory((h) => h.slice(0, -1));
    showToast("Undone ↩");
  }

  function oppScore(delta: number) {
    setOppStats((s) => ({ ...s, score: Math.max(0, s.score + delta) }));
  }

  function addOppStat(stat: keyof Omit<typeof oppStats, "score">) {
    setOppStats((s) => ({ ...s, [stat]: s[stat] + 1 }));
    showToast(`Opp ${stat.toUpperCase()} +1`);
  }

  // ── Edit modal
  function openEdit(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    const p = activePlayers[idx];
    setEditIdx(idx);
    setEditVals({
      pts: p.pts, reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, to: p.to,
      fg2m: p.fgm - p.fg3m, fg2a: p.fga - p.fg3a,
      fg3m: p.fg3m, fg3a: p.fg3a, ftm: p.ftm, fta: p.fta,
    });
  }

  function stepEdit(field: string, delta: number) {
    setEditVals((prev) => {
      const cur = prev[field] ?? 0;
      const next = Math.max(0, cur + delta);
      if (next === cur) return prev;
      const diff = next - cur;
      const updated = { ...prev, [field]: next };
      let ptsDiff = 0;
      if (field === "fg2m") ptsDiff = diff * 2;
      if (field === "fg3m") ptsDiff = diff * 3;
      if (field === "ftm")  ptsDiff = diff * 1;
      if (ptsDiff !== 0) updated.pts = Math.max(0, (prev.pts ?? 0) + ptsDiff);
      return updated;
    });
  }

  function saveEdit() {
    if (editIdx === null) return;
    const v = editVals;
    const set = activeTeam === "home" ? setHomePlayerStats : setAwayPlayerStats;
    set((prev) =>
      prev.map((p, i) => {
        if (i !== editIdx) return p;
        const fgm = (v.fg2m ?? 0) + (v.fg3m ?? 0);
        const fga = (v.fg2a ?? 0) + (v.fg3a ?? 0);
        return {
          ...p, pts: v.pts ?? 0, reb: v.reb ?? 0, ast: v.ast ?? 0,
          stl: v.stl ?? 0, blk: v.blk ?? 0, to: v.to ?? 0,
          fg3m: v.fg3m ?? 0, fg3a: v.fg3a ?? 0,
          fgm, fga, ftm: v.ftm ?? 0, fta: v.fta ?? 0,
        };
      })
    );
    setEditIdx(null);
    showToast("Stats updated ✓");
  }

  // ── Submit
  async function handleSubmit() {
    try {
      const allStats = [
        ...homePlayerStats,
        ...(mode === "both" ? awayPlayerStats : []),
      ];
      // When tracking as away team: my team goes in the awayTeamId slot, opponent in home
      const isMyTeamAway = mode === "myteam" && myTeamSide === "away";
      const game = await submitGame.mutateAsync({
        data: {
          homeTeamId: mode === "both" ? homeTeamId : (isMyTeamAway ? null : homeTeamId),
          awayTeamId: mode === "both" ? awayTeamId : (isMyTeamAway ? homeTeamId : null),
          opponentName: mode === "myteam" ? opponentName : null,
          homeScore: isMyTeamAway ? getAwayScore() : getHomeScore(),
          awayScore: isMyTeamAway ? getHomeScore() : getAwayScore(),
          gameDate,
          season: deriveSeason(gameDate),
          location: locationStr || null,
          playerStats: allStats.map((p) => ({
            playerId: p.playerId,
            playerName: p.name,
            teamId: p.teamId,
            points: p.pts,
            rebounds: p.reb,
            assists: p.ast,
            steals: p.stl,
            blocks: p.blk,
            turnovers: p.to,
            fieldGoalsMade: p.fgm,
            fieldGoalsAttempted: p.fga,
            threePointersMade: p.fg3m,
            threePointersAttempted: p.fg3a,
            freeThrowsMade: p.ftm,
            freeThrowsAttempted: p.fta,
          })),
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/games"] }),
        qc.invalidateQueries({ queryKey: ["/api/players"] }),
      ]);
      showToast("✓ Uploaded to Homegrown Hoops!");
      setTimeout(() => navigate(`/games/${game.id}`), 2200);
    } catch (err: unknown) {
      // Surface duplicate-game 409 with a clear message
      if (err && typeof err === "object" && "response" in err) {
        const resp = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        if (resp?.status === 409 && resp?.data?.error) {
          showToast(resp.data.error);
          return;
        }
      }
      showToast("Upload failed — try again");
    }
  }

  // ── Access guard
  if (!isSignedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#070c14", color: "#e8f0fc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900 }}>Sign In Required</div>
          <div style={{ color: "#4a6480", marginTop: 8 }}>You must be signed in to track games.</div>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={{ minHeight: "100vh", background: "#070c14", color: "#e8f0fc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900 }}>Access Denied</div>
          <div style={{ color: "#4a6480", marginTop: 8 }}>Only managers and admins can track games.</div>
        </div>
      </div>
    );
  }

  const homeTeamName = teams?.find((t) => t.id === homeTeamId)?.name ?? "Home";
  const awayTeamName =
    mode === "both"
      ? (teams?.find((t) => t.id === awayTeamId)?.name ?? "Away")
      : opponentName || "Opponent";

  const homeScore = getHomeScore();
  const awayScore = getAwayScore();

  // ── Render all screens inside one hgh-tracker root
  return (
    <div className="hgh-tracker">

      {/* ══════════════════════ SETUP SCREEN ══════════════════════ */}
      {screen === "setup" && (
        <div className="hgh-setup">
          <div className="logo">
            <div className="logo-ball" />
            <div className="logo-text">
              Homegrown<span>Hoops</span>
            </div>
          </div>

          <div>
            <div className="setup-title">Track a <em>Game</em></div>
          </div>

          {/* VS row */}
          <div className="vs-row">
            {mode === "myteam" && myTeamSide === "away" ? (
              <>
                <div>
                  <label>Opponent (Home)</label>
                  <input
                    type="text"
                    placeholder="Team name"
                    value={opponentName}
                    onChange={(e) => setOpponentName(e.target.value)}
                  />
                </div>
                <div className="vs-badge">VS</div>
                <div>
                  <label>My Team (Away)</label>
                  <select
                    value={homeTeamId ?? ""}
                    onChange={(e) => setHomeTeamId(Number(e.target.value) || null)}
                  >
                    <option value="">Select team…</option>
                    {myTeamsForPicker.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : mode === "both" ? (
              <>
                <div>
                  <label>Home Team</label>
                  <select
                    value={homeTeamId ?? ""}
                    onChange={(e) => setHomeTeamId(Number(e.target.value) || null)}
                  >
                    <option value="">Select team…</option>
                    {(teams ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="vs-badge">VS</div>
                <div>
                  <label>Away Team</label>
                  <select
                    value={awayTeamId ?? ""}
                    onChange={(e) => setAwayTeamId(Number(e.target.value) || null)}
                  >
                    <option value="">Select team…</option>
                    {(teams ?? [])
                      .filter((t) => t.id !== homeTeamId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label>My Team (Home)</label>
                  <select
                    value={homeTeamId ?? ""}
                    onChange={(e) => setHomeTeamId(Number(e.target.value) || null)}
                  >
                    <option value="">Select team…</option>
                    {myTeamsForPicker.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="vs-badge">VS</div>
                <div>
                  <label>Opponent (Away)</label>
                  <input
                    type="text"
                    placeholder="Team name"
                    value={opponentName}
                    onChange={(e) => setOpponentName(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label>Game Date</label>
            <input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>

          <div>
            <label>Location (optional)</label>
            <input
              type="text"
              placeholder="e.g. Riverside Court"
              value={locationStr}
              onChange={(e) => setLocationStr(e.target.value)}
            />
          </div>

          <div>
            <label>Tracking Mode</label>
            <div className="mode-toggle">
              <div
                className={`mode-opt${mode === "myteam" ? " active" : ""}`}
                onClick={() => setMode("myteam")}
              >
                My Team Only
                <span>Opponent tracked as team totals</span>
              </div>
              <div
                className={`mode-opt${mode === "both" ? " active" : ""}`}
                onClick={() => setMode("both")}
              >
                Both Teams
                <span>Full player-by-player for both</span>
              </div>
            </div>
          </div>

          {mode === "myteam" && (
            <div>
              <label>My Team is Playing</label>
              <div className="mode-toggle">
                <div
                  className={`mode-opt${myTeamSide === "home" ? " active" : ""}`}
                  onClick={() => setMyTeamSide("home")}
                >
                  Home
                  <span>My team is the home team</span>
                </div>
                <div
                  className={`mode-opt${myTeamSide === "away" ? " active" : ""}`}
                  onClick={() => setMyTeamSide("away")}
                >
                  Away
                  <span>My team is the away team</span>
                </div>
              </div>
            </div>
          )}

          <div className="divider" />

          {/* Home roster */}
          <div>
            <div className="section-head">
              <span className="section-label">Home Roster</span>
            </div>
            {homeSetupPlayers.map((sp) => (
              <div key={sp.uid} className={`player-row${sp.isGuest ? " guest-row" : ""}`}>
                <div className="jersey-wrap">
                  <span className="jersey-hash">#</span>
                  <input
                    type="text"
                    className="jersey-num"
                    placeholder="—"
                    maxLength={3}
                    readOnly={sp.isGuest}
                    value={sp.jerseyNum}
                    onChange={sp.isGuest ? undefined : (e) => updateSetupPlayer("home", sp.uid, "jerseyNum", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                {sp.isGuest ? (
                  <div className="guest-name-cell">
                    <span className="guest-name">{sp.name}</span>
                    <span className="guest-badge">GUEST</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Player name (optional)"
                    value={sp.name}
                    onChange={(e) => updateSetupPlayer("home", sp.uid, "name", e.target.value)}
                  />
                )}
                <select
                  className="pos-select"
                  value={sp.pos}
                  onChange={(e) => updateSetupPlayer("home", sp.uid, "pos", e.target.value)}
                >
                  {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                </select>
                <button className="remove-btn" onClick={() => removeSetupPlayer("home", sp.uid)}>×</button>
              </div>
            ))}
            <div className="add-btns">
              <button className="add-btn" onClick={() => addSetupPlayer("home")}>+ By # Only</button>
              <button className="add-btn guest-btn" onClick={() => openGuestSearch("home")}>⊕ Guest Player</button>
            </div>
          </div>

          {/* Away roster (both mode) */}
          {mode === "both" && (
            <div>
              <div className="section-head">
                <span className="section-label away">Away Roster</span>
              </div>
              {awaySetupPlayers.map((sp) => (
                <div key={sp.uid} className={`player-row${sp.isGuest ? " guest-row" : ""}`}>
                  <div className="jersey-wrap">
                    <span className="jersey-hash">#</span>
                    <input
                      type="text"
                      className="jersey-num"
                      placeholder="—"
                      maxLength={3}
                      readOnly={sp.isGuest}
                      value={sp.jerseyNum}
                      onChange={sp.isGuest ? undefined : (e) => updateSetupPlayer("away", sp.uid, "jerseyNum", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  {sp.isGuest ? (
                    <div className="guest-name-cell">
                      <span className="guest-name">{sp.name}</span>
                      <span className="guest-badge">GUEST</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Player name (optional)"
                      value={sp.name}
                      onChange={(e) => updateSetupPlayer("away", sp.uid, "name", e.target.value)}
                    />
                  )}
                  <select
                    className="pos-select"
                    value={sp.pos}
                    onChange={(e) => updateSetupPlayer("away", sp.uid, "pos", e.target.value)}
                  >
                    {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <button className="remove-btn" onClick={() => removeSetupPlayer("away", sp.uid)}>×</button>
                </div>
              ))}
              <div className="add-btns">
                <button className="add-btn" onClick={() => addSetupPlayer("away")}>+ By # Only</button>
                <button className="add-btn guest-btn" onClick={() => openGuestSearch("away")}>⊕ Guest Player</button>
              </div>
            </div>
          )}

          <button className="start-btn" onClick={startGame}>Start Tracking</button>
        </div>
      )}

      {/* ══════════════════════ TRACKER SCREEN ══════════════════════ */}
      {screen === "tracker" && (
        <div className="hgh-tracker-screen">
          {/* Sticky header */}
          <div className="tracker-header">
            <div className="scoreboard">
              <div className="team-score">
                <div className="team-score-name">{homeTeamName}</div>
                <div className="team-score-pts home">{homeScore}</div>
              </div>
              <div className="score-divider">—</div>
              <div className="team-score">
                <div className="team-score-name">{awayTeamName}</div>
                <div className="team-score-pts">{awayScore}</div>
              </div>
            </div>
            <div className="header-controls">
              <div className="period-btns">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    className={`period-btn${period === q ? " active" : ""}`}
                    onClick={() => setPeriod(q)}
                  >
                    Q{q}
                  </button>
                ))}
              </div>
              <button className="undo-btn" onClick={undoLast}>Undo</button>
            </div>
          </div>

          {/* Team tabs */}
          <div
            className="teams-tabs"
            style={mode === "myteam" ? { gridTemplateColumns: "1fr" } : undefined}
          >
            <div
              className={`team-tab${activeTeam === "home" ? " active" : ""}`}
              onClick={() => switchTeam("home")}
            >
              {homeTeamName}
            </div>
            {mode === "both" && (
              <div
                className={`team-tab${activeTeam === "away" ? " active" : ""}`}
                onClick={() => switchTeam("away")}
              >
                {awayTeamName}
              </div>
            )}
          </div>

          {/* Opponent bar */}
          {mode === "myteam" && (
            <div className="opp-bar visible">
              <div className="opp-score-row">
                <span className="opp-score-label">{awayTeamName} Score</span>
                <div className="opp-score-btns">
                  <button className="opp-score-btn" onClick={() => oppScore(-1)}>−</button>
                  <span className="opp-score-val">{oppStats.score}</span>
                  <button className="opp-score-btn" onClick={() => oppScore(1)}>+</button>
                </div>
              </div>
              <div className="opp-bar-title">Opponent Team Stats</div>
              <div className="opp-stat-row">
                {(["reb", "stl", "blk", "to", "foul"] as const).map((stat) => (
                  <button key={stat} className="opp-btn" onClick={() => addOppStat(stat)}>
                    <div className="opp-btn-info">
                      <div className="opp-btn-count">{oppStats[stat]}</div>
                      <div className="opp-btn-label">{OPP_STAT_LABELS[stat]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player cards */}
          <div className="players-list">
            {activePlayers.map((p, i) => {
              const sel = selPlayer === i;
              const miss2 = p.fga - p.fgm;
              const miss3 = p.fg3a - p.fg3m;
              const ftMiss = p.fta - p.ftm;
              return (
                <div key={p.uid} className={`player-card${sel ? " selected" : ""}`}>
                  <div className="player-card-header" onClick={() => selectPlayer(i)}>
                    <div className="player-info">
                      <div className="player-avatar">{p.pos}</div>
                      <div>
                        <div className="player-name">{p.name}</div>
                        <span className="player-pos-badge">{p.pos}</span>
                      </div>
                    </div>
                    <div className="player-mini-stats">
                      <div className="mini-stat">
                        <div className="mini-stat-val" style={{ color: "var(--orange)" }}>{p.pts}</div>
                        <div className="mini-stat-lbl">PTS</div>
                      </div>
                      <div className="mini-stat">
                        <div className="mini-stat-val" style={{ color: "var(--blue)" }}>{p.reb}</div>
                        <div className="mini-stat-lbl">REB</div>
                      </div>
                      <div className="mini-stat">
                        <div className="mini-stat-val" style={{ color: "var(--green)" }}>{p.ast}</div>
                        <div className="mini-stat-lbl">AST</div>
                      </div>
                    </div>
                  </div>

                  {sel && (
                    <div className="stat-panel open">
                      <div className="stat-section-title">Made</div>
                      <div className="stat-grid">
                        <button className="stat-btn pts" onClick={(e) => addStat(e, i, "fg2")}>
                          <div className="stat-btn-count">{p.fgm - p.fg3m}</div>
                          <div className="stat-btn-label">2PT Make</div>
                        </button>
                        <button className="stat-btn three" onClick={(e) => addStat(e, i, "fg3")}>
                          <div className="stat-btn-count">{p.fg3m}</div>
                          <div className="stat-btn-label">3PT Make</div>
                        </button>
                        <button className="stat-btn ft-make" onClick={(e) => addStat(e, i, "ftm")}>
                          <div className="stat-btn-count">{p.ftm}</div>
                          <div className="stat-btn-label">FT Make</div>
                        </button>
                      </div>

                      <div className="stat-section-title">Missed</div>
                      <div className="stat-grid">
                        <button className="stat-btn miss2" onClick={(e) => addStat(e, i, "miss2")}>
                          <div className="stat-btn-count">{miss2}</div>
                          <div className="stat-btn-label">2PT Miss</div>
                        </button>
                        <button className="stat-btn miss3" onClick={(e) => addStat(e, i, "miss3")}>
                          <div className="stat-btn-count">{miss3}</div>
                          <div className="stat-btn-label">3PT Miss</div>
                        </button>
                        <button className="stat-btn ft-miss" onClick={(e) => addStat(e, i, "ftmiss")}>
                          <div className="stat-btn-count">{ftMiss}</div>
                          <div className="stat-btn-label">FT Miss</div>
                        </button>
                      </div>

                      <div className="stat-section-title">Other</div>
                      <div className="stat-grid">
                        <button className="stat-btn reb" onClick={(e) => addStat(e, i, "reb")}>
                          <div className="stat-btn-count">{p.reb}</div>
                          <div className="stat-btn-label">Rebound</div>
                        </button>
                        <button className="stat-btn ast" onClick={(e) => addStat(e, i, "ast")}>
                          <div className="stat-btn-count">{p.ast}</div>
                          <div className="stat-btn-label">Assist</div>
                        </button>
                        <button className="stat-btn stl" onClick={(e) => addStat(e, i, "stl")}>
                          <div className="stat-btn-count">{p.stl}</div>
                          <div className="stat-btn-label">Steal</div>
                        </button>
                        <button className="stat-btn blk" onClick={(e) => addStat(e, i, "blk")}>
                          <div className="stat-btn-count">{p.blk}</div>
                          <div className="stat-btn-label">Block</div>
                        </button>
                        <button className="stat-btn to" onClick={(e) => addStat(e, i, "to")}>
                          <div className="stat-btn-count">{p.to}</div>
                          <div className="stat-btn-label">Turnover</div>
                        </button>
                        <button className="stat-btn foul" onClick={(e) => addStat(e, i, "foul")}>
                          <div className="stat-btn-count">{p.fouls}</div>
                          <div className="stat-btn-label">Foul</div>
                        </button>
                      </div>

                      <div className="pct-strip">
                        <div className="pct-item">
                          <div className={`pct-val ${pctCls(p.fgm, p.fga)}`}>{fmtPct(p.fgm, p.fga)}</div>
                          <div className="pct-lbl">FG%</div>
                          <div className="pct-sub">{p.fgm}/{p.fga}</div>
                        </div>
                        <div className="pct-item">
                          <div className={`pct-val ${pctCls(p.fg3m, p.fg3a)}`}>{fmtPct(p.fg3m, p.fg3a)}</div>
                          <div className="pct-lbl">3P%</div>
                          <div className="pct-sub">{p.fg3m}/{p.fg3a}</div>
                        </div>
                        <div className="pct-item">
                          <div className={`pct-val ${pctCls(p.ftm, p.fta)}`}>{fmtPct(p.ftm, p.fta)}</div>
                          <div className="pct-lbl">FT%</div>
                          <div className="pct-sub">{p.ftm}/{p.fta}</div>
                        </div>
                      </div>

                      <button className="edit-btn" onClick={(e) => openEdit(e, i)}>
                        ✎ Edit Stats
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* End game bar */}
          <div className="end-game-bar">
            <button className="end-game-btn" onClick={() => setScreen("summary")}>
              End Game &amp; Upload Stats
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════ SUMMARY SCREEN ══════════════════════ */}
      {screen === "summary" && (
        <div className="hgh-summary">
          <div>
            <div className="summary-title">Game Complete <span>✓</span></div>
            <div className="summary-sub">Review box score before uploading to Homegrown Hoops</div>
          </div>

          <div className="final-score">
            <div>
              <div className="final-team-name">{homeTeamName}</div>
              <div className="final-pts home">{homeScore}</div>
            </div>
            <div className="final-divider">—</div>
            <div>
              <div className="final-team-name">{awayTeamName}</div>
              <div className="final-pts">{awayScore}</div>
            </div>
          </div>

          {/* Box score */}
          {[
            { label: homeTeamName, players: homePlayerStats, isHome: true },
            ...(mode === "both"
              ? [{ label: awayTeamName, players: awayPlayerStats, isHome: false }]
              : []),
          ].map(({ label, players: ps, isHome }) => (
            <div key={label} className="box-section" style={{ marginBottom: 14 }}>
              <div className={`box-team-label${isHome ? "" : " away"}`}>{label}</div>
              <div className="box-table">
                <div className="box-row header">
                  <div className="box-name">Player</div>
                  <div className="box-val">PTS</div>
                  <div className="box-val">REB</div>
                  <div className="box-val">AST</div>
                  <div className="box-val">STL</div>
                  <div className="box-val">BLK</div>
                  <div className="box-val">TO</div>
                  <div className="box-pct">FG%</div>
                  <div className="box-pct">3P%</div>
                  <div className="box-pct">FT%</div>
                </div>
                {ps.map((p) => (
                  <div key={p.uid} className="box-row">
                    <div className="box-name">{p.name}</div>
                    <div className="box-val pts">{p.pts}</div>
                    <div className="box-val">{p.reb}</div>
                    <div className="box-val">{p.ast}</div>
                    <div className="box-val">{p.stl}</div>
                    <div className="box-val">{p.blk}</div>
                    <div className="box-val" style={{ color: "var(--red)" }}>{p.to}</div>
                    <div className={`box-pct ${pctCls(p.fgm, p.fga)}`}>{fmtPct(p.fgm, p.fga)}</div>
                    <div className={`box-pct ${pctCls(p.fg3m, p.fg3a)}`}>{fmtPct(p.fg3m, p.fg3a)}</div>
                    <div className={`box-pct ${pctCls(p.ftm, p.fta)}`}>{fmtPct(p.ftm, p.fta)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            className="confirm-btn"
            onClick={handleSubmit}
            disabled={submitGame.isPending}
          >
            {submitGame.isPending ? "Uploading…" : "✓  Upload to Homegrown Hoops"}
          </button>
        </div>
      )}

      {/* ══════════════════════ EDIT MODAL ══════════════════════ */}
      {editIdx !== null && (
        <div
          className="modal-overlay open"
          onClick={(e) => { if (e.target === e.currentTarget) setEditIdx(null); }}
        >
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="modal-title">
                Edit — <span className="modal-player-name">{activePlayers[editIdx]?.name}</span>
              </div>
              <button className="modal-close" onClick={() => setEditIdx(null)}>✕</button>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">Scoring</div>
              <div className="edit-grid">
                {(["pts", "fg3m", "fg2m", "fg2a", "fg3a", "ftm", "fta"] as const).map((field) => (
                  <div key={field} className="edit-field">
                    <div className="edit-field-label">{SCORE_LABELS[field]}</div>
                    <div className="edit-stepper">
                      <button className="step-btn" onClick={() => stepEdit(field, -1)}>−</button>
                      <div className="step-val">{editVals[field] ?? 0}</div>
                      <button className="step-btn" onClick={() => stepEdit(field, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">Other Stats</div>
              <div className="edit-grid">
                {(["reb", "ast", "stl", "blk", "to"] as const).map((field) => (
                  <div key={field} className="edit-field">
                    <div className="edit-field-label">{OTHER_LABELS[field]}</div>
                    <div className="edit-stepper">
                      <button className="step-btn" onClick={() => stepEdit(field, -1)}>−</button>
                      <div className="step-val">{editVals[field] ?? 0}</div>
                      <button className="step-btn" onClick={() => stepEdit(field, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-save" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ GUEST SEARCH MODAL ══════════════════════ */}
      {guestSearchTeam !== null && (
        <div
          className="modal-overlay open"
          onClick={(e) => { if (e.target === e.currentTarget) closeGuestSearch(); }}
        >
          <div className="modal guest-search-modal">
            <div className="modal-handle" />
            <div className="modal-header">
              <div className="modal-title">
                Add Guest — <span className="modal-player-name">
                  {guestSearchTeam === "home" ? homeTeamName : awayTeamName}
                </span>
              </div>
              <button className="modal-close" onClick={closeGuestSearch}>✕</button>
            </div>
            <div className="guest-search-body">
              <input
                type="text"
                className="guest-search-input"
                placeholder="Search by name…"
                value={guestSearchQuery}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onChange={(e) => setGuestSearchQuery(e.target.value)}
              />
              <div className="guest-search-hint">
                Guest stats count toward their main profile Legacy Score &amp; recognition.
              </div>
              <div className="guest-search-results">
                {filteredGuestPlayers.length === 0 ? (
                  <div className="guest-no-results">
                    {guestSearchQuery.trim() ? "No players found" : "Start typing to search…"}
                  </div>
                ) : (
                  filteredGuestPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="guest-result"
                      onClick={() => addGuestPlayer(guestSearchTeam, p)}
                    >
                      <div className="guest-result-name">
                        {p.firstName} {p.lastName}
                        {p.number ? <span className="guest-result-num"> #{p.number}</span> : null}
                      </div>
                      <div className="guest-result-meta">
                        {teams?.find((t) => t.id === p.teamId)?.name ?? "Free Agent"}
                        {p.position ? ` · ${p.position}` : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ TOAST ══════════════════════ */}
      <div className={`toast${toastVisible ? " show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
