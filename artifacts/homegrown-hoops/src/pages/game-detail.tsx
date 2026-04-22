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
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CalendarDays, Pencil, Save, X, Video, Trash2, Upload, ExternalLink, Loader2, BarChart3 } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function videoUrl(objectPath: string) {
  if (objectPath.startsWith("http")) return objectPath;
  return `${BASE_URL}/api/storage${objectPath}`;
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

  const [editingScore, setEditingScore] = useState(false);

  // ── Stat entry ──────────────────────────────────────────────────────────────
  type StatRow = { points: string; rebounds: string; assists: string };
  const [showStatEntry, setShowStatEntry] = useState(false);
  const [statInputs, setStatInputs] = useState<Record<number, StatRow>>({});
  const [savingStats, setSavingStats] = useState(false);
  const [statSaveError, setStatSaveError] = useState<string | null>(null);
  const [statSaveSuccess, setStatSaveSuccess] = useState(false);
  const [homeScoreInput, setHomeScoreInput] = useState("");
  const [awayScoreInput, setAwayScoreInput] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);

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

  const homeStats = playerStats?.filter((s) => players?.find((p) => p.id === s.playerId)?.teamId === game?.homeTeamId) ?? [];
  const awayStats = playerStats?.filter((s) => players?.find((p) => p.id === s.playerId)?.teamId === game?.awayTeamId) ?? [];

  function openStatEntry() {
    const initial: Record<number, StatRow> = {};
    if (playerStats) {
      for (const s of playerStats) {
        initial[s.playerId] = {
          points:   s.points   > 0 ? String(s.points)   : "",
          rebounds: s.rebounds > 0 ? String(s.rebounds) : "",
          assists:  s.assists  > 0 ? String(s.assists)  : "",
        };
      }
    }
    setStatInputs(initial);
    setStatSaveError(null);
    setStatSaveSuccess(false);
    setShowStatEntry(true);
  }

  function updateStatInput(playerId: number, field: keyof StatRow, value: string) {
    setStatInputs((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? { points: "", rebounds: "", assists: "" }), [field]: value },
    }));
  }

  async function handleStatSave() {
    setSavingStats(true);
    setStatSaveError(null);
    setStatSaveSuccess(false);
    try {
      const teamPlayerIds = new Set(
        [...(players?.filter((p) => p.teamId === game?.homeTeamId || p.teamId === game?.awayTeamId) ?? [])].map((p) => p.id)
      );
      const stats = [...teamPlayerIds]
        .map((pid) => {
          const row = statInputs[pid] ?? { points: "", rebounds: "", assists: "" };
          return {
            playerId:              pid,
            points:                parseInt(row.points)   || 0,
            rebounds:              parseInt(row.rebounds) || 0,
            assists:               parseInt(row.assists)  || 0,
            steals:                0,
            blocks:                0,
            turnovers:             0,
            minutesPlayed:         0,
            fieldGoalsMade:        0,
            fieldGoalsAttempted:   0,
            threesMade:            0,
            threesAttempted:       0,
            freeThrowsMade:        0,
            freeThrowsAttempted:   0,
          };
        })
        .filter((s) => s.points > 0 || s.rebounds > 0 || s.assists > 0);

      if (stats.length === 0) {
        setStatSaveError("Enter stats for at least one player before saving.");
        return;
      }

      await upsertGamePlayerStats.mutateAsync({ id, data: stats });
      await qc.invalidateQueries({ queryKey: [`/api/games/${id}/player-stats`] });
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    try {
      const sigRes = await fetch(`${BASE_URL}/api/cloudinary/signature`, { method: "POST" });
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const { signature, apiKey, cloudName, timestamp, folder } = await sigRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);

      // Use XHR so we can track upload progress for large videos
      const secureUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url);
          } else {
            let msg = "Upload to Cloudinary failed";
            try { msg = JSON.parse(xhr.responseText)?.error?.message ?? msg; } catch { /* */ }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error("Network error — check your connection and try again."));
        xhr.ontimeout = () => reject(new Error("Upload timed out — try a smaller file or a faster connection."));
        xhr.timeout = 10 * 60 * 1000; // 10 minute timeout for long videos
        xhr.send(formData);
      });

      setPendingObjectPath(secureUrl);
      if (!videoTitle) setVideoTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
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

      {/* Game Videos */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
          <Video className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-secondary">Game Videos</h2>
          {videos && videos.length > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">{videos.length} {videos.length === 1 ? "video" : "videos"}</span>
          )}
          {canUpload && !showUploadForm && (
            <button
              onClick={() => { setShowUploadForm(true); setPendingObjectPath(null); setVideoTitle(""); setTitleError(null); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:opacity-90 transition-opacity"
            >
              <Upload className="h-3.5 w-3.5" /> Attach Video
            </button>
          )}
        </div>

        {/* Upload Form */}
        {canUpload && showUploadForm && (
          <div className="px-6 py-5 border-b border-border bg-primary/5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-secondary text-sm">Attach a Video</p>
              <button onClick={() => { setShowUploadForm(false); setPendingObjectPath(null); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!pendingObjectPath ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Select a video file (MP4, MOV, MKV, etc.)</p>
                <label className={`flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer transition-colors ${uploading ? "border-primary/40 bg-primary/5 cursor-default" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}>
                  {uploading ? (
                    <div className="w-full space-y-3 pointer-events-none">
                      <Loader2 className="h-7 w-7 text-primary animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-secondary text-center">
                        {uploadProgress > 0 ? `Uploading… ${uploadProgress}%` : "Preparing upload…"}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Large videos may take several minutes — please keep this page open.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-7 w-7 text-muted-foreground/50" />
                      <span className="text-sm font-medium text-secondary">Click to choose a video file</span>
                      <span className="text-xs text-muted-foreground">MP4, MOV, MKV — any size</span>
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
                  <p className="text-red-600 text-xs font-medium">{uploadError}</p>
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
        )}

        {/* Video List */}
        {loadingVideos ? (
          <div className="divide-y divide-border">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="divide-y divide-border">
            {videos.map((v) => {
              const canDelete = isAdmin || (myProfile?.clerkUserId === v.uploaderClerkUserId);
              return (
                <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={videoUrl(v.objectPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                    >
                      {v.title}
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Uploaded by {v.uploaderName} · {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteVideo(v.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-900/30 transition-colors flex-shrink-0"
                      title="Delete video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-secondary mb-1">No videos yet</p>
            <p className="text-xs text-muted-foreground">
              {canUpload ? 'Click "Attach Video" above to add game footage.' : "Sign in to attach video footage to this game."}
            </p>
          </div>
        )}
      </div>

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
                      <table className="w-full min-w-[340px] text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-3 py-2 label-upper text-[10px] font-bold text-muted-foreground">Player</th>
                            {["PTS", "REB", "AST"].map((h) => (
                              <th key={h} className="px-3 py-2 label-upper text-[10px] font-bold text-muted-foreground text-center w-20">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamPlayers.map((player) => {
                            const row = statInputs[player.id] ?? { points: "", rebounds: "", assists: "" };
                            return (
                              <tr key={player.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 font-semibold text-secondary">
                                  {player.firstName} {player.lastName}
                                </td>
                                {(["points", "rebounds", "assists"] as const).map((field) => (
                                  <td key={field} className="px-2 py-1.5 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      placeholder="–"
                                      value={row[field]}
                                      onChange={(e) => updateStatInput(player.id, field, e.target.value)}
                                      className="w-16 border border-border rounded-md px-2 py-1.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-background text-foreground"
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                          {teamPlayers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-4 text-sm text-muted-foreground text-center">
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
      {playerStats && playerStats.length > 0 ? (
        <div className="space-y-6">
          {[
            { label: awayTeam?.name ?? "Away", team: awayTeam, stats: awayStats },
            { label: homeTeam?.name ?? "Home", team: homeTeam, stats: homeStats },
          ].map(({ label, team, stats }) => (
            <div key={label} className="card-base overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: `linear-gradient(to right, ${team?.secondaryColor ?? "#132237"}, ${team?.primaryColor ?? "#C85A1B"})` }}>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-display text-sm text-white">
                  {team?.abbreviation ?? "?"}
                </div>
                <p className="font-bold text-white text-sm uppercase tracking-wide">{label}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 label-upper text-[10px]">Player</th>
                      {["PTS", "REB", "AST", "STL", "BLK", "TO", "MIN", "FG", "3P", "FT"].map((col) => (
                        <th key={col} className="px-3 py-3 label-upper text-[10px]">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.sort((a, b) => b.points - a.points).map((s) => {
                      const player = players?.find((p) => p.id === s.playerId);
                      return (
                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            {player ? (
                              <Link href={`/players/${player.id}`} className="font-semibold text-secondary hover:text-primary transition-colors">
                                {player.firstName} {player.lastName}
                              </Link>
                            ) : <span className="text-muted-foreground">Unknown</span>}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-primary">{s.points}</td>
                          <td className="px-3 py-3 text-center text-secondary font-medium">{s.rebounds}</td>
                          <td className="px-3 py-3 text-center text-secondary font-medium">{s.assists}</td>
                          <td className="px-3 py-3 text-center text-secondary font-medium">{s.steals}</td>
                          <td className="px-3 py-3 text-center text-secondary font-medium">{s.blocks}</td>
                          <td className="px-3 py-3 text-center text-secondary font-medium">{s.turnovers}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{s.minutesPlayed}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{s.fieldGoalsMade}/{s.fieldGoalsAttempted}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{s.threesMade}/{s.threesAttempted}</td>
                          <td className="px-3 py-3 text-center text-muted-foreground">{s.freeThrowsMade}/{s.freeThrowsAttempted}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : isFinal ? (
        <div className="card-base p-12 text-center">
          <p className="font-bold text-secondary text-lg mb-1">No Box Score Data</p>
          <p className="text-muted-foreground text-sm">Player stats weren't recorded for this game.</p>
        </div>
      ) : null}

      {game.notes && (
        <div className="card-base p-5">
          <p className="label-upper mb-2">Notes</p>
          <p className="text-sm text-muted-foreground">{game.notes}</p>
        </div>
      )}
    </div>
  );
}
