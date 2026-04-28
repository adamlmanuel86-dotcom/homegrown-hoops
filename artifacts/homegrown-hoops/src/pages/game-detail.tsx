import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetGame,
  useGetGamePlayerStats,
  useListTeams,
  useListPlayers,
  useUpdateGame,
  useGetMyProfile,
  useListGameVideos,
  useAddGameVideo,
  useDeleteGameVideo,
  useUpsertGamePlayerStats,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, CalendarDays, Pencil, Save, X, Video, Trash2, Upload, Loader2, BarChart3, AlertTriangle, Play, ExternalLink, Film, Youtube } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function videoUrl(objectPath: string) {
  if (objectPath.startsWith("http")) return objectPath;
  return `${BASE_URL}/api/storage${objectPath}`;
}

function cloudinaryThumbnail(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) return null;
  return url
    .replace("/video/upload/", "/video/upload/w_480,h_270,c_fill,so_2,f_jpg/")
    .replace(/\.[^.]+$/, ".jpg");
}

export function GameDetailPage() {
  const [, params] = useRoute("/games/:id");
  const id = Number(params?.id);
  const { isSignedIn } = useUser();
  const qc = useQueryClient();

  const { data: game, isLoading: loadingGame } = useGetGame(id, { query: { enabled: !!id } });
  const { data: playerStats, isLoading: loadingStats } = useGetGamePlayerStats(id, { query: { enabled: !!id } });
  const { data: teams } = useListTeams();
  const { data: players } = useListPlayers();
  const { data: myProfile } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });
  const { data: videos, isLoading: loadingVideos } = useListGameVideos(id, {
    query: { enabled: !!id },
  });

  const isAdmin = myProfile?.role === "admin";
  const canUpload = isAdmin;

  const updateGame = useUpdateGame();
  const addGameVideo = useAddGameVideo();
  const deleteGameVideo = useDeleteGameVideo();
  const upsertGamePlayerStats = useUpsertGamePlayerStats();
  const deleteGamePlayerStat = useMutation({
    mutationFn: async ({ id: gameId, playerId }: { id: number; playerId: number }) => {
      const res = await fetch(`${BASE_URL}/api/games/${gameId}/player-stats/${playerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete stat: ${res.status}`);
    },
  });

  const [editingScore, setEditingScore] = useState(false);
  const [editingFilmInfo, setEditingFilmInfo] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [externalLinksInput, setExternalLinksInput] = useState<{ label: string; url: string }[]>([]);
  const [filmSaveError, setFilmSaveError] = useState<string | null>(null);
  const [confirmingDeleteStatPlayerId, setConfirmingDeleteStatPlayerId] = useState<number | null>(null);
  const [deletingStatPlayerId, setDeletingStatPlayerId] = useState<number | null>(null);
  const [deleteModalPlayerId, setDeleteModalPlayerId] = useState<number | null>(null);

  // ── Stat entry ──────────────────────────────────────────────────────────────
  type StatRow = {
    points: string;     pointsUnknown: boolean;
    rebounds: string;   reboundsUnknown: boolean;
    assists: string;    assistsUnknown: boolean;
    threesMade: string; threesMadeUnknown: boolean;
    steals: string;     stealsUnknown: boolean;
    blocks: string;     blocksUnknown: boolean;
    turnovers: string;  turnoversUnknown: boolean;
  };
  const defaultStatRow: StatRow = {
    points: "", pointsUnknown: false,
    rebounds: "", reboundsUnknown: false,
    assists: "", assistsUnknown: false,
    threesMade: "", threesMadeUnknown: false,
    steals: "", stealsUnknown: false,
    blocks: "", blocksUnknown: false,
    turnovers: "", turnoversUnknown: false,
  };
  const [showStatEntry, setShowStatEntry] = useState(false);
  const [statInputs, setStatInputs] = useState<Record<number, StatRow>>({});
  const [savingStats, setSavingStats] = useState(false);
  const [statSaveError, setStatSaveError] = useState<string | null>(null);
  const [statSaveSuccess, setStatSaveSuccess] = useState(false);
  const [homeScoreInput, setHomeScoreInput] = useState("");
  const [awayScoreInput, setAwayScoreInput] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [pendingObjectPath, setPendingObjectPath] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const homeTeam = teams?.find((t) => t.id === game?.homeTeamId);
  const awayTeam = teams?.find((t) => t.id === game?.awayTeamId);

  const isFinal = game?.status === "final";
  const homeWon = isFinal && game?.homeScore != null && game?.awayScore != null && game.homeScore > game.awayScore;
  const awayWon = isFinal && game?.homeScore != null && game?.awayScore != null && game.awayScore > game.homeScore;


  function openStatEntry() {
    const initial: Record<number, StatRow> = {};
    if (playerStats) {
      for (const s of playerStats) {
        initial[s.playerId] = {
          points:            s.points     !== null ? String(s.points)     : "",
          pointsUnknown:     s.points     === null,
          rebounds:          s.rebounds   !== null ? String(s.rebounds)   : "",
          reboundsUnknown:   s.rebounds   === null,
          assists:           s.assists    !== null ? String(s.assists)    : "",
          assistsUnknown:    s.assists    === null,
          threesMade:        s.threesMade !== null ? String(s.threesMade) : "",
          threesMadeUnknown: s.threesMade === null,
          steals:            s.steals     !== null ? String(s.steals)     : "",
          stealsUnknown:     s.steals     === null,
          blocks:            s.blocks     !== null ? String(s.blocks)     : "",
          blocksUnknown:     s.blocks     === null,
          turnovers:         s.turnovers  !== null ? String(s.turnovers)  : "",
          turnoversUnknown:  s.turnovers  === null,
        };
      }
    }
    setStatInputs(initial);
    setStatSaveError(null);
    setStatSaveSuccess(false);
    setShowStatEntry(true);
  }

  function updateStatInput(playerId: number, field: keyof StatRow, value: string | boolean) {
    setStatInputs((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? defaultStatRow), [field]: value },
    }));
  }

  function toggleStatUnknown(playerId: number, unknownField: "pointsUnknown" | "reboundsUnknown" | "assistsUnknown" | "threesMadeUnknown" | "stealsUnknown" | "blocksUnknown" | "turnoversUnknown") {
    setStatInputs((prev) => {
      const row = prev[playerId] ?? defaultStatRow;
      return { ...prev, [playerId]: { ...row, [unknownField]: !row[unknownField] } };
    });
  }

  async function handleStatSave() {
    setSavingStats(true);
    setStatSaveError(null);
    setStatSaveSuccess(false);
    try {
      const teamPlayerIds = new Set(
        [...(players?.filter((p) => p.teamId === game?.homeTeamId || p.teamId === game?.awayTeamId) ?? [])].map((p) => p.id)
      );
      // Include a player if they have at least one field explicitly typed or marked Unknown
      const stats = [...teamPlayerIds]
        .filter((pid) => {
          const row = statInputs[pid] ?? defaultStatRow;
          return (
            row.points !== "" || row.pointsUnknown ||
            row.rebounds !== "" || row.reboundsUnknown ||
            row.assists !== "" || row.assistsUnknown ||
            row.threesMade !== "" || row.threesMadeUnknown ||
            row.steals !== "" || row.stealsUnknown ||
            row.blocks !== "" || row.blocksUnknown ||
            row.turnovers !== "" || row.turnoversUnknown
          );
        })
        .map((pid) => {
          const row = statInputs[pid] ?? defaultStatRow;
          // Unknown → null; blank (not unknown) → null for pts/reb/ast, 0 for 3PM
          const parseNullable = (s: string, unknown: boolean): number | null =>
            unknown ? null : (s === "" ? null : (parseInt(s) || 0));
          const parse3PM = (s: string, unknown: boolean): number | null =>
            unknown ? null : (s === "" ? 0 : (parseInt(s) || 0));
          return {
            playerId:            pid,
            points:              parseNullable(row.points,    row.pointsUnknown),
            rebounds:            parseNullable(row.rebounds,  row.reboundsUnknown),
            assists:             parseNullable(row.assists,   row.assistsUnknown),
            steals:              parseNullable(row.steals,    row.stealsUnknown),
            blocks:              parseNullable(row.blocks,    row.blocksUnknown),
            turnovers:           parseNullable(row.turnovers, row.turnoversUnknown),
            minutesPlayed:       0,
            fieldGoalsMade:      0,
            fieldGoalsAttempted: 0,
            threesMade:          parse3PM(row.threesMade, row.threesMadeUnknown),
            threesAttempted:     0,
            freeThrowsMade:      0,
            freeThrowsAttempted: 0,
          };
        });

      if (stats.length === 0) {
        setStatSaveSuccess(true);
        setTimeout(() => setStatSaveSuccess(false), 3000);
        return;
      }

      await upsertGamePlayerStats.mutateAsync({ id, data: stats });
      await updateGame.mutateAsync({ id, data: { status: game?.status ?? "final" } });

      // Invalidate game-specific queries
      await qc.invalidateQueries({ queryKey: [`/api/games/${id}/player-stats`] });
      await qc.invalidateQueries({ queryKey: [`/api/games/${id}`] });

      // For every edited player, invalidate their career stats, player record,
      // season-specific stats (custom hook key), and seasons list
      await Promise.all(
        stats.map((s) =>
          Promise.all([
            qc.invalidateQueries({ queryKey: [`/api/players/${s.playerId}/stats`] }),
            qc.invalidateQueries({ queryKey: [`/api/players/${s.playerId}`] }),
            qc.invalidateQueries({ queryKey: ["playerStats", s.playerId] }),
            qc.invalidateQueries({ queryKey: ["playerSeasons", s.playerId] }),
          ])
        )
      );

      // Invalidate all profile queries (stamps, tides, archetype live here).
      // Use a predicate so every /api/profiles/* URL is caught regardless of clerkUserId.
      await qc.invalidateQueries({
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith("/api/profiles");
        },
      });

      // Invalidate the stat leaders leaderboard
      await qc.invalidateQueries({ queryKey: ["/api/stats/leaders"] });

      // Wait 500 ms to give the backend time to finish all recognition/aggregation
      // before forcing a hard refetch so the player card always shows fresh data.
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Hard-refetch the players list first so profile.tsx can resolve playerId
      // from matchedPlayer before the career stats refetch runs.
      await qc.refetchQueries({ queryKey: ["/api/players"], type: "all" });

      // Hard-refetch all player-related queries (type:'all' ensures inactive
      // queries — i.e. the profile page when it is not currently mounted — are
      // also force-fetched so the player card shows fresh data on next render).
      await Promise.all(
        stats.map((s) =>
          Promise.all([
            qc.refetchQueries({ queryKey: [`/api/players/${s.playerId}/stats`], type: "all" }),
            qc.refetchQueries({ queryKey: [`/api/players/${s.playerId}`],       type: "all" }),
            qc.refetchQueries({ queryKey: ["playerStats", s.playerId],          type: "all" }),
            qc.refetchQueries({ queryKey: ["playerSeasons", s.playerId],        type: "all" }),
          ])
        )
      );

      // Hard-refetch all profile queries (stamps, tides, archetype).
      await qc.refetchQueries({
        type: "all",
        predicate: (query) => {
          const first = query.queryKey[0];
          return typeof first === "string" && first.startsWith("/api/profiles");
        },
      });

      // Hard-refetch stat leaders leaderboard.
      await qc.refetchQueries({ queryKey: ["/api/stats/leaders"], type: "all" });

      setStatSaveSuccess(true);
      setTimeout(() => setStatSaveSuccess(false), 3000);
    } catch {
      setStatSaveError("Failed to save stats. Please try again.");
    } finally {
      setSavingStats(false);
    }
  }

  function openScoreEditor() {
    setHomeScoreInput(game?.homeScore != null ? String(game.homeScore) : "");
    setAwayScoreInput(game?.awayScore != null ? String(game.awayScore) : "");
    setScoreError(null);
    setEditingScore(true);
  }

  function openFilmInfoEditor() {
    setNotesInput(game?.notes ?? "");
    const links = (game?.externalLinks ?? []) as { label: string; url: string }[];
    setExternalLinksInput(links.length > 0 ? links : [{ label: "", url: "" }]);
    setFilmSaveError(null);
    setEditingFilmInfo(true);
  }

  async function handleFilmInfoSave(e: React.FormEvent) {
    e.preventDefault();
    const validLinks = externalLinksInput
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url !== "");
    for (const l of validLinks) {
      if (!/^https?:\/\/.+/.test(l.url)) {
        setFilmSaveError(`"${l.url}" is not a valid URL. URLs must start with http:// or https://`);
        return;
      }
    }
    try {
      await updateGame.mutateAsync({
        id,
        data: {
          notes: notesInput.trim() || null,
          externalLinks: validLinks,
        },
      });
      await qc.invalidateQueries({ queryKey: [`/api/games/${id}`] });
      setEditingFilmInfo(false);
    } catch {
      setFilmSaveError("Failed to save. Please try again.");
    }
  }

  async function handleScoreSave(e: React.FormEvent) {
    e.preventDefault();
    const home = parseInt(homeScoreInput);
    const away = parseInt(awayScoreInput);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setScoreError("Please enter valid scores for both teams.");
      return;
    }
    await updateGame.mutateAsync({ id, data: { homeScore: home, awayScore: away, status: "final" } });
    await qc.invalidateQueries({ queryKey: [`/api/games/${id}`] });
    setEditingScore(false);
  }

  async function handleVideoSave() {
    if (!pendingObjectPath) return;
    if (!videoTitle.trim()) {
      setTitleError("Please enter a title for this video.");
      return;
    }
    setSavingVideo(true);
    try {
      await addGameVideo.mutateAsync({ id, data: { title: videoTitle.trim(), objectPath: pendingObjectPath } });
      await qc.invalidateQueries({ queryKey: [`/api/games/${id}/videos`] });
      setVideoTitle("");
      setPendingObjectPath(null);
      setShowUploadForm(false);
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleDeleteVideo(videoId: number) {
    await deleteGameVideo.mutateAsync({ id, videoId });
    await qc.invalidateQueries({ queryKey: [`/api/games/${id}/videos`] });
  }

  async function handleDeleteStat(playerId: number) {
    setDeletingStatPlayerId(playerId);
    try {
      await deleteGamePlayerStat.mutateAsync({ id, playerId });
      await qc.invalidateQueries({ queryKey: [`/api/games/${id}/player-stats`] });
      setConfirmingDeleteStatPlayerId(null);
      setDeleteModalPlayerId(null);
      setStatInputs((prev) => { const next = { ...prev }; delete next[playerId]; return next; });
    } finally {
      setDeletingStatPlayerId(null);
    }
  }

  function friendlyUploadError(raw: string): string {
    const r = raw.toLowerCase();
    if (r.includes("file size too large") || r.includes("413") || r.includes("file_size")) {
      return "This video exceeds your Cloudinary plan's file size limit. Try compressing the video first, or upgrade your Cloudinary plan.";
    }
    if (r.includes("invalid signature") || r.includes("401") || r.includes("403") || r.includes("not allowed")) {
      return "Upload authorization failed — please refresh the page and try again. If the problem persists, contact the administrator.";
    }
    if (r.includes("invalid cloud_name") || r.includes("cloud_name")) {
      return "Cloudinary is not configured correctly. Please contact the administrator.";
    }
    if (r.includes("timed out") || r.includes("timeout")) {
      return "The upload timed out. Your connection may be too slow for this file. Try a shorter video or move to a faster network.";
    }
    if (r.includes("network error") || r.includes("network")) {
      return "A network error stopped the upload. Check your internet connection and try again.";
    }
    return raw || "Upload failed. Please try again.";
  }

  async function uploadChunk(
    chunk: Blob,
    start: number,
    end: number,
    totalSize: number,
    chunkIndex: number,
    totalChunks: number,
    uploadId: string,
    cloudName: string,
    apiKey: string,
    timestamp: number,
    signature: string,
    folder: string,
    onProgress: (pct: number) => void,
  ): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);

    return new Promise<string | null>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
      xhr.setRequestHeader("X-Unique-Upload-Id", uploadId);
      xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${totalSize}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const chunkFraction = ev.loaded / ev.total;
          onProgress(Math.round(((chunkIndex + chunkFraction) / totalChunks) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url ?? null);
          } catch {
            resolve(null);
          }
        } else {
          let msg = `Chunk ${chunkIndex + 1}/${totalChunks} was rejected by Cloudinary`;
          try {
            const errData = JSON.parse(xhr.responseText);
            msg = errData?.error?.message ?? msg;
          } catch { /* */ }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () =>
        reject(new Error(`Network error on chunk ${chunkIndex + 1}/${totalChunks} — check your connection and try again.`));
      xhr.ontimeout = () =>
        reject(new Error(`Chunk ${chunkIndex + 1}/${totalChunks} timed out — your connection may be too slow.`));
      xhr.timeout = 5 * 60 * 1000; // 5 min per chunk
      xhr.send(formData);
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Get signed upload credentials from our server
      const sigRes = await fetch(`${BASE_URL}/api/cloudinary/signature`, { method: "POST" });
      if (!sigRes.ok) {
        const errData = await sigRes.json().catch(() => ({}));
        throw new Error(errData.error ?? `Could not get upload credentials (${sigRes.status})`);
      }
      const { signature, apiKey, cloudName, timestamp, folder } = await sigRes.json();

      // Chunked upload: split into 20 MB pieces so large files (up to ~2 GB) work reliably
      const CHUNK_SIZE = 20 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uploadId = crypto.randomUUID();
      let secureUrl = "";

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const result = await uploadChunk(
          chunk, start, end, file.size,
          i, totalChunks,
          uploadId, cloudName, apiKey, timestamp, signature, folder,
          (pct) => setUploadProgress(pct),
        );
        if (result) secureUrl = result;
      }

      if (!secureUrl) throw new Error("Upload completed but no video URL was returned — please try again.");

      setPendingObjectPath(secureUrl);
      if (!videoTitle) setVideoTitle(file.name.replace(/\.[^.]+$/, ""));
      setUploadProgress(100);

    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Upload failed";
      setUploadError(friendlyUploadError(raw));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  }

  if (loadingGame || loadingStats) {
    return (
      <div className="space-y-8 animate-pulse max-w-4xl mx-auto">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-56 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="card-base p-16 text-center max-w-4xl mx-auto">
        <CalendarDays className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-bold text-secondary text-lg">Game not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to Games
      </Link>

      {/* Score Card */}
      <div className="rounded-2xl overflow-hidden bg-secondary text-white">
        <div className="flex items-center justify-center gap-1 py-2 px-4 border-b border-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">{game.season}</p>
          {game.location && <p className="text-xs text-white/60 before:content-['·'] before:mx-2">{game.location}</p>}
        </div>

        <div className="grid grid-cols-3 items-center py-10 px-6">
          <Link href={awayTeam ? `/teams/${awayTeam.id}` : "#"} className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-2xl text-white shadow-lg" style={{ backgroundColor: awayTeam?.primaryColor ?? "#555" }}>
              {awayTeam?.abbreviation ?? "?"}
            </div>
            <div className="text-center">
              <p className={`font-display text-lg leading-tight group-hover:text-primary transition-colors ${awayWon ? "text-white" : "text-white/60"}`}>
                {awayTeam?.name?.toUpperCase() ?? "AWAY"}
              </p>
              <p className="text-xs text-white/60 mt-0.5">{awayTeam?.city}</p>
            </div>
          </Link>

          <div className="flex flex-col items-center gap-2">
            {isFinal ? (
              <>
                <div className="flex items-center gap-4">
                  <span className={`font-display text-6xl ${awayWon ? "text-primary" : "text-white/90"}`}>{game.awayScore}</span>
                  <span className="font-display text-2xl text-white/50">–</span>
                  <span className={`font-display text-6xl ${homeWon ? "text-primary" : "text-white/90"}`}>{game.homeScore}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/65">Final · {game.gameDate}</p>
              </>
            ) : (
              <>
                <p className="font-display text-4xl text-white/55">VS</p>
                <p className={`text-xs font-bold uppercase tracking-widest ${game.status === "in_progress" ? "text-green-400" : "text-white/65"}`}>
                  {game.status === "in_progress" ? "Live" : game.gameDate}
                </p>
              </>
            )}
          </div>

          <Link href={homeTeam ? `/teams/${homeTeam.id}` : "#"} className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-2xl text-white shadow-lg" style={{ backgroundColor: homeTeam?.primaryColor ?? "#555" }}>
              {homeTeam?.abbreviation ?? "?"}
            </div>
            <div className="text-center">
              <p className={`font-display text-lg leading-tight group-hover:text-primary transition-colors ${homeWon ? "text-white" : "text-white/60"}`}>
                {homeTeam?.name?.toUpperCase() ?? "HOME"}
              </p>
              <p className="text-xs text-white/60 mt-0.5">{homeTeam?.city}</p>
            </div>
          </Link>
        </div>

        {isAdmin && !editingScore && (
          <div className="flex justify-center pb-5">
            <button
              onClick={openScoreEditor}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/50 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/30"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isFinal ? "Edit Score" : "Enter Final Score"}
            </button>
          </div>
        )}
      </div>

      {/* Admin Score Entry Form */}
      {isAdmin && editingScore && (
        <form onSubmit={handleScoreSave} className="card-base p-6 space-y-5 border-primary/40">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-secondary">{isFinal ? "EDIT SCORE" : "ENTER FINAL SCORE"}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Setting scores marks the game as final.</p>
            </div>
            <button type="button" onClick={() => setEditingScore(false)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label-upper block mb-2">{awayTeam?.name ?? "Away"} Score</label>
              <input type="number" min={0} value={awayScoreInput} onChange={(e) => { setAwayScoreInput(e.target.value); setScoreError(null); }} placeholder="0"
                className="w-full border border-border rounded-lg px-4 py-3 text-2xl font-display text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="label-upper block mb-2">{homeTeam?.name ?? "Home"} Score</label>
              <input type="number" min={0} value={homeScoreInput} onChange={(e) => { setHomeScoreInput(e.target.value); setScoreError(null); }} placeholder="0"
                className="w-full border border-border rounded-lg px-4 py-3 text-2xl font-display text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>
          </div>
          {scoreError && <p className="text-red-600 text-sm font-medium">{scoreError}</p>}
          {updateGame.isError && <p className="text-red-600 text-sm font-medium">Failed to save score.</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={updateGame.isPending} className="btn-primary">
              <Save className="h-4 w-4" />
              {updateGame.isPending ? "Saving..." : "Save Final Score"}
            </button>
            <button type="button" onClick={() => setEditingScore(false)} className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Game Film ─────────────────────────────────────────────────── */}
      {loadingVideos ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-7 w-48 bg-muted rounded" />
          <div className="card-base overflow-hidden">
            <div className="w-full aspect-video bg-muted" />
            <div className="px-6 py-4 space-y-2">
              <div className="h-4 bg-muted rounded w-48" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Section heading — visible when there's any film content or admin access */}
          {(videos && videos.length > 0 || (game.externalLinks ?? []).length > 0 || canUpload || isAdmin) && (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Highlights</p>
                <h2 className="font-display text-5xl text-primary leading-none tracking-tight">GAME FILM</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && !showUploadForm && !editingFilmInfo && (
                  <button
                    onClick={openFilmInfoEditor}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    {(game.externalLinks ?? []).length > 0 || game.notes ? "Edit Film Info" : "Add Film Info"}
                  </button>
                )}
                {canUpload && !showUploadForm && !editingFilmInfo && (
                  <button
                    onClick={() => { setShowUploadForm(true); setPendingObjectPath(null); setVideoTitle(""); setTitleError(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity"
                  >
                    <Upload className="h-3.5 w-3.5" /> Attach Video
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Inline admin edit form for film info */}
          {isAdmin && editingFilmInfo && (
            <form onSubmit={handleFilmInfoSave} className="card-base p-6 space-y-6 border-primary/40">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xl text-secondary">GAME FILM INFO</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Add one or more links to external video footage.</p>
                </div>
                <button type="button" onClick={() => setEditingFilmInfo(false)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Multi-link inputs */}
              <div className="space-y-3">
                <label className="label-upper block">Video Links</label>
                {externalLinksInput.map((link, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-[1fr_2fr] gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => {
                          const updated = externalLinksInput.map((l, j) => j === i ? { ...l, label: e.target.value } : l);
                          setExternalLinksInput(updated);
                          setFilmSaveError(null);
                        }}
                        placeholder="Label (e.g. First Half)"
                        className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => {
                          const updated = externalLinksInput.map((l, j) => j === i ? { ...l, url: e.target.value } : l);
                          setExternalLinksInput(updated);
                          setFilmSaveError(null);
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setExternalLinksInput(externalLinksInput.filter((_, j) => j !== i))}
                      className="p-2.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0 mt-0.5"
                      title="Remove link"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExternalLinksInput([...externalLinksInput, { label: "", url: "" }])}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity px-1"
                >
                  <span className="text-lg leading-none">+</span> Add another link
                </button>
                <p className="text-xs text-muted-foreground">YouTube links show "Watch on YouTube". Any other URL shows "Watch Film".</p>
              </div>

              {/* Notes */}
              <div>
                <label className="label-upper block mb-2">Game Notes</label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Optional notes about this game..."
                  rows={3}
                  className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              {filmSaveError && <p className="text-red-500 text-sm font-medium">{filmSaveError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={updateGame.isPending} className="btn-primary">
                  <Save className="h-4 w-4" />
                  {updateGame.isPending ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => setEditingFilmInfo(false)} className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Main player — shown when at least one video exists */}
          {videos && videos.length > 0 && (() => {
            const active = videos.find(v => v.id === selectedVideoId) ?? videos[0];
            const canDeleteActive = isAdmin || myProfile?.clerkUserId === active.uploaderClerkUserId;
            return (
              <div className="card-base overflow-hidden shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <video
                  key={active.id}
                  src={videoUrl(active.objectPath)}
                  controls
                  className="w-full aspect-video bg-black"
                />
                <div className="px-5 py-4 flex items-center gap-4 border-t border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-secondary text-base truncate">{active.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Uploaded by {active.uploaderName} · {new Date(active.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {canDeleteActive && (
                    <button
                      onClick={() => handleDeleteVideo(active.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-900/30 transition-colors flex-shrink-0"
                      title="Delete video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Playlist — shown when 2+ videos */}
          {videos && videos.length > 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                All Footage · {videos.length} Videos
              </p>
              <div className="card-base overflow-hidden divide-y divide-border">
                {videos.map((v) => {
                  const thumb = cloudinaryThumbnail(videoUrl(v.objectPath));
                  const isActive = v.id === (selectedVideoId ?? videos[0]?.id);
                  const canDelete = isAdmin || myProfile?.clerkUserId === v.uploaderClerkUserId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVideoId(v.id)}
                      className={`relative w-full flex items-center gap-4 px-4 py-3 text-left transition-colors border-l-4 ${isActive ? "bg-primary/5 border-primary" : "border-transparent hover:bg-muted/50"}`}
                    >
                      <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0">
                        {thumb ? (
                          <img src={thumb} alt={v.title} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <Video className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${isActive ? "bg-primary" : "bg-white/90"}`}>
                            <Play className={`h-4 w-4 ml-0.5 ${isActive ? "text-white" : "text-black"}`} />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${isActive ? "text-primary" : "text-secondary"}`}>{v.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.uploaderName}</p>
                      </div>
                      {canDelete && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); handleDeleteVideo(v.id); }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-900/30 transition-colors flex-shrink-0"
                          title="Delete video"
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* External links card — one row per link */}
          {!editingFilmInfo && (game.externalLinks ?? []).length > 0 && (
            <div className="card-base overflow-hidden shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              {game.notes && (
                <div className="px-5 py-3.5 border-b border-border bg-muted/20">
                  <p className="text-sm text-muted-foreground leading-relaxed">{game.notes}</p>
                </div>
              )}
              <div className="divide-y divide-border">
                {(game.externalLinks as { label: string; url: string }[]).map((link, i) => {
                  const isYouTube = /youtube\.com|youtu\.be/.test(link.url);
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isYouTube ? "rgba(255,0,0,0.12)" : "rgba(249,115,22,0.12)" }}
                      >
                        {isYouTube
                          ? <Youtube className="h-5 w-5" style={{ color: "#FF0000" }} />
                          : <Film className="h-5 w-5 text-primary" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-secondary text-sm truncate">
                          {link.label || (isYouTube ? "YouTube" : "External Video")}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                        style={isYouTube
                          ? { background: "#FF0000", color: "#fff" }
                          : { background: "hsl(24 95% 50%)", color: "#fff" }
                        }
                      >
                        {isYouTube ? <Youtube className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                        {isYouTube ? "Watch on YouTube" : "Watch Film"}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload form */}
          {canUpload && showUploadForm && (
            <div className="card-base overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
                <p className="font-semibold text-secondary text-sm">Attach a Video</p>
                <button
                  onClick={() => { setShowUploadForm(false); setPendingObjectPath(null); }}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                {!pendingObjectPath ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Select a video file (MP4, MOV, MKV, etc.)</p>
                    <label className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer transition-colors ${uploading ? "border-primary/40 bg-primary/5 cursor-default" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                      {uploading ? (
                        <div className="w-full space-y-3 pointer-events-none select-none">
                          <Loader2 className="h-7 w-7 text-primary animate-spin mx-auto" />
                          <p className="text-sm font-semibold text-secondary text-center">
                            {uploadProgress > 0 ? `Uploading… ${uploadProgress}%` : "Preparing upload…"}
                          </p>
                          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-primary h-2.5 rounded-full transition-all duration-150"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Uploading in chunks — large videos may take several minutes. Keep this page open.
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-7 w-7 text-muted-foreground/50" />
                          <span className="text-sm font-medium text-secondary">Click to choose a video file</span>
                          <span className="text-xs text-muted-foreground">MP4, MOV, MKV — up to 2 GB supported</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        disabled={uploading}
                        onChange={handleFileUpload}
                      />
                    </label>
                    {uploadError && (
                      <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-xs font-medium leading-relaxed">{uploadError}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400 bg-green-900/30 rounded-lg px-3 py-2 text-sm font-medium">
                      <Video className="h-4 w-4" /> Video uploaded — add a title to save it
                    </div>
                    <div>
                      <label className="label-upper block mb-1.5">Video Title *</label>
                      <input
                        type="text"
                        value={videoTitle}
                        onChange={(e) => { setVideoTitle(e.target.value); setTitleError(null); }}
                        placeholder="e.g. Full game highlights"
                        className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      {titleError && <p className="text-red-600 text-xs mt-1">{titleError}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleVideoSave} disabled={savingVideo} className="btn-primary text-sm py-2">
                        <Save className="h-3.5 w-3.5" />
                        {savingVideo ? "Saving..." : "Save Video"}
                      </button>
                      <button onClick={() => setPendingObjectPath(null)} className="px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors">
                        Re-upload
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state — only shown when there's truly no film content */}
          {(!videos || videos.length === 0) && (game.externalLinks ?? []).length === 0 && !editingFilmInfo && !showUploadForm && (
            <div className="card-base px-6 py-12 text-center">
              <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-secondary mb-1">No footage yet</p>
              <p className="text-xs text-muted-foreground">
                {canUpload ? 'Click "Attach Video" above to add game footage.' : "Game footage will appear here once videos are attached."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin: Stat Entry */}
      {isAdmin && (
        <div className="card-base overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-secondary">Player Stats</h2>
            {!showStatEntry && (
              <button
                onClick={openStatEntry}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity"
              >
                <Pencil className="h-3.5 w-3.5" />
                {playerStats && playerStats.length > 0 ? "Edit Stats" : "Enter Stats"}
              </button>
            )}
          </div>

          {showStatEntry && (
            <div className="p-6 space-y-6">
              {[
                { label: awayTeam?.name ?? "Away", teamId: game.awayTeamId, color: awayTeam?.primaryColor ?? "#555" },
                { label: homeTeam?.name ?? "Home", teamId: game.homeTeamId, color: homeTeam?.primaryColor ?? "#555" },
              ].map(({ label, teamId, color }) => {
                const teamPlayers = players?.filter((p) => p.teamId === teamId) ?? [];
                return (
                  <div key={teamId}>
                    <div
                      className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                      style={{ background: `${color}22`, borderLeft: `3px solid ${color}` }}
                    >
                      <p className="font-bold text-sm uppercase tracking-wide text-secondary">{label}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[400px] text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-3 py-2 label-upper text-[10px] font-bold text-muted-foreground">Player</th>
                            {["PTS", "REB", "AST", "3PM", "STL", "BLK", "TOV"].map((h) => (
                              <th key={h} className="px-3 py-2 label-upper text-[10px] font-bold text-muted-foreground text-center w-20">{h}</th>
                            ))}
                            <th className="px-2 py-2 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {teamPlayers.map((player) => {
                            const row = statInputs[player.id] ?? { points: "", rebounds: "", assists: "", threesMade: "" };
                            const hasExistingStats = !!playerStats?.find((s) => s.playerId === player.id);
                            return (
                              <tr key={player.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 font-semibold text-secondary">
                                  {player.number != null && (
                                    <span className="text-primary font-black mr-1">#{player.number}</span>
                                  )}
                                  {player.firstName} {player.lastName}
                                </td>
                                {([
                                  { field: "points"     as const, unknownField: "pointsUnknown"     as const },
                                  { field: "rebounds"   as const, unknownField: "reboundsUnknown"   as const },
                                  { field: "assists"    as const, unknownField: "assistsUnknown"    as const },
                                  { field: "threesMade" as const, unknownField: "threesMadeUnknown" as const },
                                  { field: "steals"     as const, unknownField: "stealsUnknown"     as const },
                                  { field: "blocks"     as const, unknownField: "blocksUnknown"     as const },
                                  { field: "turnovers"  as const, unknownField: "turnoversUnknown"  as const },
                                ]).map(({ field, unknownField }) => {
                                  const isUnknown = row[unknownField] as boolean;
                                  return (
                                    <td key={field} className="px-2 py-1.5 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <input
                                          type="number"
                                          min={0}
                                          placeholder="–"
                                          value={isUnknown ? "" : row[field]}
                                          disabled={isUnknown}
                                          onChange={(e) => updateStatInput(player.id, field, e.target.value)}
                                          className={`w-16 border rounded-md px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                                            isUnknown
                                              ? "border-border/40 bg-muted/60 text-muted-foreground cursor-not-allowed"
                                              : "border-border bg-background text-foreground"
                                          }`}
                                        />
                                        <label className="flex items-center gap-1 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={isUnknown}
                                            onChange={() => toggleStatUnknown(player.id, unknownField)}
                                            className="w-3 h-3 rounded accent-primary"
                                          />
                                          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">N/A</span>
                                        </label>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="px-2 py-1.5 text-right">
                                  {hasExistingStats && (
                                    <button
                                      onClick={() => setDeleteModalPlayerId(player.id)}
                                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                      title="Delete stat entry"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {teamPlayers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground text-center">
                                No players registered for this team.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {statSaveError && (
                <p className="text-red-500 text-sm font-medium">{statSaveError}</p>
              )}
              {statSaveSuccess && (
                <p className="text-green-400 text-sm font-medium">
                  Stats saved — recognition system updated.
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleStatSave}
                  disabled={savingStats}
                  className="btn-primary"
                >
                  {savingStats ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Stats</>
                  )}
                </button>
                <button
                  onClick={() => setShowStatEntry(false)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Box Score */}
      {game && (
        <div className="space-y-6">
          {[
            { label: awayTeam?.name ?? "Away", team: awayTeam, teamId: game.awayTeamId },
            { label: homeTeam?.name ?? "Home", team: homeTeam, teamId: game.homeTeamId },
          ].map(({ label, team, teamId }) => {
            const teamPlayers = players?.filter((p) => p.teamId === teamId) ?? [];
            // Sort: recorded points first (desc), then null-points rows, then no-row players
            const sorted = [...teamPlayers].sort((a, b) => {
              const sa = playerStats?.find((s) => s.playerId === a.id);
              const sb = playerStats?.find((s) => s.playerId === b.id);
              const aHasPoints = sa != null && sa.points !== null;
              const bHasPoints = sb != null && sb.points !== null;
              if (aHasPoints && bHasPoints) return sb!.points! - sa!.points!;
              if (aHasPoints) return -1;
              if (bHasPoints) return 1;
              if (sa && !sb) return -1;
              if (!sa && sb) return 1;
              return 0;
            });
            return (
              <div key={label} className="card-base overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-3" style={{ background: `linear-gradient(to right, ${team?.secondaryColor ?? "#132237"}, ${team?.primaryColor ?? "#C85A1B"})` }}>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-display text-sm text-white">
                    {team?.abbreviation ?? "?"}
                  </div>
                  <p className="font-bold text-white text-sm uppercase tracking-wide">{label}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[280px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 label-upper text-[10px]">Player</th>
                        {["PTS", "REB", "AST", "3PM", "STL", "BLK", "TOV"].map((col) => (
                          <th key={col} className="px-3 py-3 label-upper text-[10px]">{col}</th>
                        ))}
                        {isAdmin && <th className="px-3 py-3 w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((player) => {
                        const statsRow = playerStats?.find((s) => s.playerId === player.id);
                        const hasStats = statsRow != null;
                        const isConfirming = confirmingDeleteStatPlayerId === player.id;
                        const isDeleting = deletingStatPlayerId === player.id;
                        return (
                          <tr key={player.id} className="group border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link href={`/players/${player.id}`} className="font-semibold text-secondary hover:text-primary transition-colors">
                                {player.number != null && (
                                  <span className="text-primary font-black mr-1">#{player.number}</span>
                                )}
                                {player.firstName} {player.lastName}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-primary">
                              {hasStats && statsRow!.points !== null ? statsRow!.points : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">
                              {hasStats && statsRow!.rebounds !== null ? statsRow!.rebounds : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">
                              {hasStats && statsRow!.assists !== null ? statsRow!.assists : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">
                              {hasStats && statsRow!.threesMade !== null ? statsRow!.threesMade : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">
                              {hasStats && statsRow!.steals !== null ? statsRow!.steals : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">
                              {hasStats && statsRow!.blocks !== null ? statsRow!.blocks : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center text-secondary font-medium">
                              {hasStats && statsRow!.turnovers !== null ? statsRow!.turnovers : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            {isAdmin && (
                              <td className="px-3 py-3 text-right">
                                {hasStats && (isConfirming ? (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button
                                      onClick={() => handleDeleteStat(player.id)}
                                      disabled={isDeleting}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                                    >
                                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmingDeleteStatPlayerId(null)}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmingDeleteStatPlayerId(player.id)}
                                    className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete stat entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {sorted.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-sm text-muted-foreground text-center">
                            No players registered for this team.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete stat confirmation modal ── */}
      {deleteModalPlayerId !== null && (() => {
        const modalPlayer = players?.find((p) => p.id === deleteModalPlayerId);
        const isDeleting = deletingStatPlayerId === deleteModalPlayerId;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setDeleteModalPlayerId(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="font-bold text-secondary text-base">Delete Player Stats</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Delete all stats for{" "}
                <span className="font-semibold text-secondary">
                  {modalPlayer?.firstName} {modalPlayer?.lastName}
                </span>{" "}
                in this game? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteStat(deleteModalPlayerId)}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Stats
                </button>
                <button
                  onClick={() => setDeleteModalPlayerId(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
