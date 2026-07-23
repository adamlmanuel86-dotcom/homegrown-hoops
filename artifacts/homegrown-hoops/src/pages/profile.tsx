import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { useUser, useAuth } from "@clerk/react";
import {
  useGetProfile,
  useGetMyProfile,
  useListPlayers,
  useGetPlayerStats,
  useListTeams,
  useGetPlayerSeasons,
  useGetPlayerStatsBySeason,
  useGetIsoBallProfile,
  useGetMyArcadeStats,
  useGetMyArcadeRank,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Pencil, ChevronLeft, School, Calendar, Trophy, Share2, Check, ChevronDown, Brain, Medal, RefreshCw, Camera, Loader2, X as XIcon, Award, Gamepad2 } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";
import { PlayerCard } from "@/components/player-card";
import { MILESTONE_BONUSES } from "@/components/player-card";
import { apiBase } from "@/lib/api";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ProfilePage() {
  const { clerkUserId = "" } = useParams<{ clerkUserId: string }>();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [arcadeModal, setArcadeModal] = useState<"fastBreak" | "whoYaGot" | "shotClock" | null>(null);

  async function handleShare() {
    const url = `${window.location.origin}${BASE_URL}/p/${clerkUserId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchPlayers(),
        refetchStats(),
        refetchSeasons(),
        refetchSeasonStats(),
        refetchTeams(),
        refetchIsoBall(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const { data: profile, isLoading, refetch: refetchProfile } = useGetProfile(clerkUserId, {
    query: { enabled: !!clerkUserId },
  });

  const { data: players, refetch: refetchPlayers } = useListPlayers(undefined, {
    query: { staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: true },
  });
  const matchedPlayer = players?.find(
    (p) =>
      p.firstName.toLowerCase() === (profile?.firstName ?? "").toLowerCase() &&
      p.lastName.toLowerCase() === (profile?.lastName ?? "").toLowerCase()
  );

  const playerId = matchedPlayer?.id ?? 0;

  // All-season stats (used for career Legacy Score on top of the careerStats snapshot)
  const { data: allSeasonStats, refetch: refetchStats } = useGetPlayerStats(playerId, {
    query: { enabled: !!playerId, staleTime: 0, refetchOnMount: true, refetchOnWindowFocus: true },
  });

  // Available seasons for this player
  const { data: seasonsData, refetch: refetchSeasons } = useGetPlayerSeasons(playerId, {
    query: { enabled: !!playerId },
  });
  const seasons = seasonsData?.seasons ?? [];

  // Auto-select the team's active season (or most recent with game data) once loaded
  useEffect(() => {
    if (seasonsData && selectedSeason === null) {
      const target = seasonsData.activeSeason ?? seasonsData.seasons[0] ?? null;
      if (target) setSelectedSeason(target);
    }
  }, [seasonsData, selectedSeason]);

  // Season-specific stats (for display when a season is selected)
  const { data: seasonStats, refetch: refetchSeasonStats } = useGetPlayerStatsBySeason(playerId, selectedSeason, {
    query: { enabled: !!playerId && !!selectedSeason },
  });

  const { data: teams, refetch: refetchTeams } = useListTeams();
  const team = teams?.find((t) => t.id === matchedPlayer?.teamId);
  const teamLabel = team?.name ?? "Unaffiliated / No Team";

  const isOwner = isSignedIn && user?.id === clerkUserId;

  const qc = useQueryClient();

  // Admin detection — fetch the signed-in user's own profile to check isAdmin
  const { data: myProfile } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });
  const isViewerAdmin = myProfile?.isAdmin === true;

  // ── Admin photo upload state ──────────────────────────────────────────────
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openPhotoEditor() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setPhotoError(null);
    setEditingPhoto(true);
  }

  function closePhotoEditor() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setPhotoError(null);
    setEditingPhoto(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setPhotoError(null);
  }

  /**
   * Compress and resize an image file using the browser Canvas API.
   * - Resizes to at most maxPx × maxPx (maintains aspect ratio)
   * - Reduces JPEG quality iteratively until the blob is under maxBytes
   * No external library required.
   */
  function compressImage(file: File, maxPx = 800, maxBytes = 500 * 1024): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width >= height) {
            height = Math.round((height * maxPx) / width);
            width = maxPx;
          } else {
            width = Math.round((width * maxPx) / height);
            height = maxPx;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const qualities = [0.85, 0.72, 0.58, 0.42];
        let attempt = 0;
        function tryQuality() {
          const q = qualities[attempt] ?? 0.42;
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Image compression failed")); return; }
            if (blob.size <= maxBytes || attempt >= qualities.length - 1) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else {
              attempt++;
              tryQuality();
            }
          }, "image/jpeg", q);
        }
        tryQuality();
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Failed to load image")); };
      img.src = blobUrl;
    });
  }

  async function saveAvatar(avatarUrl: string | null) {
    const token = await getToken();
    const res = await fetch(`${apiBase}/api/profiles/${clerkUserId}/avatar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ avatarUrl }),
    });
    if (!res.ok) throw new Error("Failed to update avatar");
    await qc.invalidateQueries({ queryKey: [`/api/profiles/${clerkUserId}`] });
    await refetchProfile();
  }

  /** Convert a File/Blob to a base64 data URI. */
  function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSavePhoto() {
    if (!avatarFile) return;
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      // Step 1: Compress/resize client-side (max 800×800 px, max 500 KB).
      // The compressed blob is ~≤700 KB as base64 — well under the 10 MB Express limit.
      const compressed = await compressImage(avatarFile);

      // Step 2: Encode as base64 data URI and POST to the API server.
      // The server uses requireAuth (same middleware as every other working admin
      // route), uploads to Cloudinary server-side, and saves the URL to the DB.
      // This avoids the cookie/token ambiguity on the two-hop Vercel→Railway path
      // that was causing 401s on the separate signature endpoint.
      const dataUri = await fileToDataUri(compressed);
      const token = await getToken();
      const res = await fetch(`${apiBase}/api/profiles/${clerkUserId}/avatar/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ dataUri }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        console.error("[profile] avatar/upload failed:", res.status, errData);
        setPhotoError(errData.error ?? `Upload failed (${res.status}) — please try again.`);
        return;
      }
      await qc.invalidateQueries({ queryKey: [`/api/profiles/${clerkUserId}`] });
      await refetchProfile();
      closePhotoEditor();
    } catch (err) {
      console.error("[profile] Photo upload error:", err);
      setPhotoError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      await saveAvatar(null);
      closePhotoEditor();
    } catch {
      setPhotoError("Failed to remove photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  const { data: isoBallData, refetch: refetchIsoBall } = useGetIsoBallProfile(clerkUserId || null);

  const { data: arcadeStats } = useGetMyArcadeStats({
    query: { enabled: isOwner },
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-[568px] bg-muted rounded-[22px] max-w-[320px] mx-auto" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto card-base p-16 text-center">
        <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-bold text-secondary text-lg mb-1">Profile Not Found</p>
        <p className="text-muted-foreground text-sm">This player hasn't set up a profile yet.</p>
      </div>
    );
  }

  // ── Career totals for Legacy Score ─────────────────────────────────────────
  // All game stats are permanently in the DB — allSeasonStats (no season filter)
  // already covers every season a player has ever played.
  const careerGames = allSeasonStats?.gamesPlayed ?? 0;
  const careerPoints = allSeasonStats?.totalPoints ?? 0;
  const careerRebounds = allSeasonStats?.totalRebounds ?? 0;
  const careerAssists = allSeasonStats?.totalAssists ?? 0;

  const careerSteals    = allSeasonStats?.totalSteals    ?? 0;
  const careerBlocks    = allSeasonStats?.totalBlocks    ?? 0;
  const careerTurnovers = allSeasonStats?.totalTurnovers ?? 0;

  const careerTotalsForCard =
    careerGames > 0
      ? {
          gamesPlayed:    careerGames,
          wins:           allSeasonStats?.wins ?? 0,
          totalPoints:    careerPoints,
          totalRebounds:  careerRebounds,
          totalAssists:   careerAssists,
          totalSteals:    careerSteals,
          totalBlocks:    careerBlocks,
          totalTurnovers: careerTurnovers,
          totalFieldGoalsMade:      allSeasonStats?.totalFieldGoalsMade      ?? 0,
          totalFieldGoalsAttempted: allSeasonStats?.totalFieldGoalsAttempted ?? 0,
          totalThreesMade:          allSeasonStats?.totalThreesMade          ?? 0,
          totalThreesAttempted:     allSeasonStats?.totalThreesAttempted     ?? 0,
          totalFreeThrowsMade:      allSeasonStats?.totalFreeThrowsMade      ?? 0,
          totalFreeThrowsAttempted: allSeasonStats?.totalFreeThrowsAttempted ?? 0,
          fieldGoalPct:  allSeasonStats?.fieldGoalPct  ?? 0,
          threePointPct: allSeasonStats?.threePointPct ?? 0,
          freeThrowPct:  allSeasonStats?.freeThrowPct  ?? 0,
          avgPoints:    careerPoints    / careerGames,
          avgRebounds:  careerRebounds  / careerGames,
          avgAssists:   careerAssists   / careerGames,
        }
      : undefined;

  // ── Display stats: selected season's stats, or current season's live stats ──
  const displayStats = selectedSeason
    ? seasonStats && seasonStats.gamesPlayed > 0
      ? {
          avgPoints:     seasonStats.avgPoints,
          avgRebounds:   seasonStats.avgRebounds,
          avgAssists:    seasonStats.avgAssists,
          avgThreesMade: seasonStats.avgThreesMade,
          avgSteals:     seasonStats.avgSteals,
          avgBlocks:     seasonStats.avgBlocks,
          avgTurnovers:  seasonStats.avgTurnovers,
          gamesPlayed:   seasonStats.gamesPlayed,
          totalPoints:   seasonStats.totalPoints,
          totalRebounds: seasonStats.totalRebounds,
          totalAssists:  seasonStats.totalAssists,
          totalSteals:   seasonStats.totalSteals,
          totalBlocks:   seasonStats.totalBlocks,
          totalTurnovers:seasonStats.totalTurnovers,
          totalFieldGoalsMade:      seasonStats.totalFieldGoalsMade      ?? 0,
          totalFieldGoalsAttempted: seasonStats.totalFieldGoalsAttempted ?? 0,
          totalThreesMade:          seasonStats.totalThreesMade          ?? 0,
          totalThreesAttempted:     seasonStats.totalThreesAttempted     ?? 0,
          totalFreeThrowsMade:      seasonStats.totalFreeThrowsMade      ?? 0,
          totalFreeThrowsAttempted: seasonStats.totalFreeThrowsAttempted ?? 0,
          fieldGoalPct:  seasonStats.fieldGoalPct  ?? 0,
          threePointPct: seasonStats.threePointPct ?? 0,
          freeThrowPct:  seasonStats.freeThrowPct  ?? 0,
        }
      : undefined
    : allSeasonStats && allSeasonStats.gamesPlayed > 0
    ? {
        avgPoints:     allSeasonStats.avgPoints,
        avgRebounds:   allSeasonStats.avgRebounds,
        avgAssists:    allSeasonStats.avgAssists,
        avgThreesMade: allSeasonStats.avgThreesMade,
        avgSteals:     allSeasonStats.avgSteals,
        avgBlocks:     allSeasonStats.avgBlocks,
        avgTurnovers:  allSeasonStats.avgTurnovers,
        gamesPlayed:   allSeasonStats.gamesPlayed,
        totalPoints:   allSeasonStats.totalPoints,
        totalRebounds: allSeasonStats.totalRebounds,
        totalAssists:  allSeasonStats.totalAssists,
        totalSteals:   allSeasonStats.totalSteals,
        totalBlocks:   allSeasonStats.totalBlocks,
        totalTurnovers:allSeasonStats.totalTurnovers,
        totalFieldGoalsMade:      allSeasonStats.totalFieldGoalsMade      ?? 0,
        totalFieldGoalsAttempted: allSeasonStats.totalFieldGoalsAttempted ?? 0,
        totalThreesMade:          allSeasonStats.totalThreesMade          ?? 0,
        totalThreesAttempted:     allSeasonStats.totalThreesAttempted     ?? 0,
        totalFreeThrowsMade:      allSeasonStats.totalFreeThrowsMade      ?? 0,
        totalFreeThrowsAttempted: allSeasonStats.totalFreeThrowsAttempted ?? 0,
        fieldGoalPct:  allSeasonStats.fieldGoalPct  ?? 0,
        threePointPct: allSeasonStats.threePointPct ?? 0,
        freeThrowPct:  allSeasonStats.freeThrowPct  ?? 0,
      }
    : undefined;

  // ── Tides ─────────────────────────────────────────────────────────────────
  // Career view (no season selected): show all tides ever earned, with counter
  // badges for multiple wins across seasons.
  // Season view (season selected): show only that season's tides.
  const allTides = profile.tides ?? [];
  const tidesForBlock = selectedSeason
    ? allTides.filter((t) => t.season === selectedSeason)
    : allTides;

  // ── Archetype for selected season ──
  // Prefers the archived history entry for that season. Falls back to the
  // live profile.archetype if this is the current (not-yet-archived) season.
  const displayArchetype = selectedSeason
    ? (profile.archetypeHistory ?? []).find((h) => h.season === selectedSeason)?.archetype
      ?? profile.archetype
      ?? "Uncharted"
    : profile.archetype;

  // Profile view adjusted for the selected season.
  // tides: keep ALL career-wide tides so PlayerCard Legacy Score counts correctly.
  // RecognitionBlock receives displayTides separately for the season-filtered grid.
  // Stamps are always career-wide — never filtered.
  const displayProfile = {
    ...profile,
    archetype: displayArchetype,
  };

  const isCurrent = !selectedSeason;
  const seasonLabel = selectedSeason ?? "Current Season";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/players"
          className="inline-flex items-center gap-1.5 text-sm font-bold border-2 border-foreground/30 text-foreground/80 px-3 py-1.5 hover:border-primary hover:text-primary transition-all"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh profile"
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</span>
          <div className="relative">
            <select
              value={selectedSeason ?? ""}
              onChange={(e) => setSelectedSeason(e.target.value || null)}
              className="appearance-none bg-white/8 border border-white/12 text-sm font-semibold text-foreground rounded-xl px-4 py-2 pr-9 cursor-pointer hover:bg-white/12 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>{s}{s === seasonsData?.activeSeason ? " · Current" : ""}</option>
              ))}
              <option value="">Career · All Seasons</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {selectedSeason && selectedSeason !== seasonsData?.activeSeason && (
            <span className="text-xs text-muted-foreground">
              Archived season · Legacy Score always shows career total
            </span>
          )}
          {!selectedSeason && (
            <span className="text-xs text-muted-foreground">
              All-time · Tides show career wins with counters
            </span>
          )}
        </div>
      )}

      {/* Milestone notifications — show for milestones earned in last 30 days */}
      {(() => {
        const now = Date.now();
        const recentMs = 30 * 24 * 60 * 60 * 1000;
        const recent = (profile.milestones ?? []).filter((m) => {
          try { return now - new Date(m.earnedAt).getTime() <= recentMs; } catch { return false; }
        });
        if (recent.length === 0) return null;
        return (
          <div className="space-y-2">
            {recent.map((m) => {
              const info = MILESTONE_BONUSES[m.id];
              if (!info) return null;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }}
                >
                  <Trophy className="h-4 w-4 shrink-0" style={{ color: "#F59E0B" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "#F59E0B" }}>Career Milestone Reached!</p>
                    <p className="text-xs text-white/70">{info.label} — +{info.bonusLP.toLocaleString()} Legacy Points</p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Hidden file input — accept="image/*" opens camera roll on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Admin photo editor modal */}
      {editingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={closePhotoEditor}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ background: "hsl(222 42% 9%)", border: "1px solid hsl(220 28% 16%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #F97316, #A78BFA)" }} />
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <p className="font-bold text-white text-base">Edit Photo</p>
              <button
                onClick={closePhotoEditor}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "hsl(220 28% 14%)" }}
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Preview */}
              {(avatarPreview || profile.avatarUrl) && (
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary/40">
                    <img
                      src={avatarPreview ?? profile.avatarUrl!}
                      alt="Photo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {photoError && (
                <p className="text-xs text-red-400 text-center">{photoError}</p>
              )}

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                style={{ background: "hsl(220 28% 14%)", border: "1px solid hsl(220 28% 22%)", color: "hsl(210 16% 88%)" }}
              >
                <Camera className="h-4 w-4" />
                {avatarPreview ? "Choose different photo" : "Upload photo from camera roll"}
              </button>

              {/* Save button — shown only when a new file is chosen */}
              {avatarFile && (
                <button
                  onClick={handleSavePhoto}
                  disabled={isUploadingPhoto}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 btn-primary"
                >
                  {isUploadingPhoto ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  ) : (
                    <><Award className="h-4 w-4" /> Save Photo</>
                  )}
                </button>
              )}

              {/* Remove button — shown only when there's a current photo */}
              {profile.avatarUrl && !avatarFile && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}
                >
                  {isUploadingPhoto ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Removing…</>
                  ) : (
                    <><XIcon className="h-4 w-4" /> Remove current photo</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <PlayerCard
          profile={displayProfile}
          stats={displayStats}
          careerTotals={careerTotalsForCard}
          primaryColor={team?.primaryColor ?? "#B45309"}
          secondaryColor={team?.secondaryColor ?? "#1E3A5F"}
        />
        {isViewerAdmin && (
          <button
            onClick={openPhotoEditor}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-colors"
            style={{ background: "hsl(220 28% 14%)", border: "1px solid hsl(220 28% 22%)", color: "hsl(210 16% 65%)" }}
          >
            <Camera className="h-3.5 w-3.5" />
            Edit Photo
          </button>
        )}
        {isoBallData && isoBallData.sessionCount > 0 && (
          <BallKnowledgeBlock
            totalPoints={isoBallData.totalPoints}
            sessionCount={isoBallData.sessionCount}
            level={isoBallData.level}
          />
        )}
        <button
          onClick={handleShare}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            copied
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-white/8 hover:bg-white/12 text-foreground/80 hover:text-white border border-white/10"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Profile link copied — share it anywhere.
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Share Profile
            </>
          )}
        </button>
      </div>

      {displayStats && (
        <div className="card-base p-4">
          <p className="label-upper mb-3 px-1">Defensive &amp; Ball Stats · {seasonLabel}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "SPG", value: displayStats.avgSteals?.toFixed(1) ?? "—", sub: `${displayStats.totalSteals ?? 0} total` },
              { label: "BPG", value: displayStats.avgBlocks?.toFixed(1) ?? "—",  sub: `${displayStats.totalBlocks ?? 0} total` },
              { label: "TOPG", value: displayStats.avgTurnovers?.toFixed(1) ?? "—", sub: `${displayStats.totalTurnovers ?? 0} total` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="font-display text-2xl font-black text-primary leading-none">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayStats && (displayStats.totalFieldGoalsAttempted ?? 0) > 0 && (
        <div className="card-base p-4 space-y-3">
          <p className="label-upper mb-1 px-1">Shooting Splits · {seasonLabel}</p>
          {[
            {
              label: "Field Goals",
              made: displayStats.totalFieldGoalsMade ?? 0,
              att: displayStats.totalFieldGoalsAttempted ?? 0,
              pct: displayStats.fieldGoalPct ?? 0,
              color: "#F97316",
            },
            {
              label: "3-Pointers",
              made: displayStats.totalThreesMade ?? 0,
              att: displayStats.totalThreesAttempted ?? 0,
              pct: displayStats.threePointPct ?? 0,
              color: "#A78BFA",
            },
            {
              label: "Free Throws",
              made: displayStats.totalFreeThrowsMade ?? 0,
              att: displayStats.totalFreeThrowsAttempted ?? 0,
              pct: displayStats.freeThrowPct ?? 0,
              color: "#34D399",
            },
          ].map(({ label, made, att, pct, color }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                  {label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">{made}-{att}</span>
                  <span className="font-display text-lg font-black tabular-nums" style={{ color }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, pct)}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden bg-secondary text-white">
        <div className="px-8 py-10 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl text-white leading-tight">
              {profile.number != null && (
                <span className="text-primary mr-2">#{profile.number}</span>
              )}
              {profile.firstName.toUpperCase()} {profile.lastName.toUpperCase()}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.position && (
                <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-bold uppercase px-3 py-1 rounded-full">
                  <Trophy className="h-3 w-3" />
                  {profile.position}
                </span>
              )}
              {profile.graduationYear && (
                <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-bold px-3 py-1 rounded-full">
                  <Calendar className="h-3 w-3" />
                  Class of {profile.graduationYear}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-bold px-3 py-1 rounded-full">
                <School className="h-3 w-3" />
                {teamLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-base p-6 space-y-5">
        {profile.school && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <School className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="label-upper mb-0.5">School</p>
              <p className="font-semibold text-secondary">{profile.school}</p>
            </div>
          </div>
        )}

        {profile.bio && (
          <div>
            <p className="label-upper mb-2">About</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {!profile.school && !profile.bio && (
          <p className="text-muted-foreground text-sm text-center py-4">
            No additional info provided.
          </p>
        )}

        {isOwner && (
          <div className="pt-2 border-t border-border flex flex-wrap gap-2">
            <Link href="/my-profile" className="btn-primary">
              <Pencil className="h-4 w-4" /> Edit Profile
            </Link>
            <Link href="/my-avatar" className="btn-secondary flex items-center gap-1.5">
              <Gamepad2 className="h-4 w-4" /> Customize Avatar
            </Link>
          </div>
        )}
      </div>

      {profile.isAdmin && (
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary tracking-wider px-1">
          <Trophy className="h-3.5 w-3.5" /> League Admin
        </div>
      )}

      <RecognitionBlock
        stamps={profile.stamps ?? []}
        tides={tidesForBlock}
        archetype={displayArchetype}
      />

      {isOwner && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <h3 className="label-upper text-xs text-muted-foreground">Arcade</h3>
          </div>

          {/* ── FAST BREAK ────────────────────────────────────────────── */}
          {(() => {
            const fb = arcadeStats?.fastBreak ?? null;
            const fgPct = fb && fb.totalFga && fb.totalFga > 0
              ? Math.round((fb.totalFgm! / fb.totalFga) * 100) : null;
            const tpPct = fb && fb.totalTpa && fb.totalTpa > 0
              ? Math.round((fb.totalTpm! / fb.totalTpa) * 100) : null;
            return (
              <Link href="/fast-break">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #0f1a10 0%, #1a2e1a 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: "radial-gradient(ellipse at 0% 50%, rgba(255,140,0,0.18) 0%, transparent 60%)",
                  }} />
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 18 }}>🏀</span>
                      <span className="font-display text-sm tracking-widest text-white/60 uppercase">Fast Break</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-orange-500/60" style={{ color: "#ff8c00", background: "rgba(255,140,0,0.1)" }}>
                      Shooting
                    </span>
                  </div>
                  {fb ? (
                    <>
                      <div className="flex items-end gap-6 px-4 pb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">High Score</p>
                          <p className="font-display leading-none" style={{ fontSize: "clamp(52px,12vw,72px)", color: "#ff8c00" }}>{fb.bestScore}</p>
                        </div>
                        <div className="flex-1 space-y-2 pb-1">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">FG%</span>
                              <span className="text-[11px] font-black text-white">
                                {fgPct !== null ? `${fgPct}%` : "—"}
                                <span className="text-white/30 font-normal text-[9px] ml-1">{fb.totalFgm ?? 0}/{fb.totalFga ?? 0}</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${fgPct ?? 0}%`, background: "linear-gradient(90deg,#ff8c00,#ffb347)" }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">3PT%</span>
                              <span className="text-[11px] font-black text-white">
                                {tpPct !== null ? `${tpPct}%` : "—"}
                                <span className="text-white/30 font-normal text-[9px] ml-1">{fb.totalTpm ?? 0}/{fb.totalTpa ?? 0}</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${tpPct ?? 0}%`, background: "linear-gradient(90deg,#ff4500,#ff8c00)" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center border-t border-white/10" style={{ background: "rgba(0,0,0,0.3)" }}>
                        {[
                          { label: "Dunks", val: fb.totalDunks ?? 0 },
                          { label: "Best Streak", val: fb.bestStreak },
                          { label: "Games", val: fb.gamesPlayed },
                        ].map((s, i) => (
                          <div key={s.label} className={`flex-1 py-2.5 text-center ${i < 2 ? "border-r border-white/10" : ""}`}>
                            <p className="font-black text-base text-white leading-none">{s.val}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                        <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-orange-400 group-hover:text-orange-300 transition-colors border-l border-white/10">Play →</div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 pb-4 flex items-center justify-between">
                      <p className="text-sm text-white/30 italic">No games yet</p>
                      <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 group-hover:text-orange-300 transition-colors">Play Now →</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* ── WHO YA GOT ────────────────────────────────────────────── */}
          {(() => {
            const wyg = arcadeStats?.whoYaGot ?? null;
            const wygPlayed = wyg?.gamesPlayed ?? 0;
            const wygScore  = wyg?.bestScore ?? 0;
            const goatIq = wygPlayed > 0
              ? Math.round((wygScore / Math.max(wygPlayed * 3, 1)) * 100) : 0;
            return (
              <Link href="/who-ya-got">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #0e0a1f 0%, #1a1040 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(168,85,247,0.2) 0%, transparent 55%)" }} />
                  <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none" style={{ background: "radial-gradient(circle at 80% 20%, rgba(234,179,8,0.12) 0%, transparent 70%)" }} />
                  <div className="flex items-stretch">
                    <div className="p-4 flex flex-col justify-between" style={{ minWidth: 130 }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 16 }}>🏆</span>
                        <span className="font-display text-xs tracking-widest text-white/50 uppercase">Who Ya Got</span>
                      </div>
                      <div className="mt-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400/70 mb-0.5">High Score</p>
                        <p className="font-display leading-none" style={{ fontSize: "clamp(48px,11vw,68px)", color: "#c084fc" }}>
                          {wyg ? wyg.bestScore : "—"}
                        </p>
                      </div>
                      <span className="mt-3 self-start text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-purple-500/50" style={{ color: "#a855f7", background: "rgba(168,85,247,0.1)" }}>
                        Trivia
                      </span>
                    </div>
                    <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      {wyg ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Best Streak</p>
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-3xl text-yellow-400">{wyg.bestStreak}</span>
                              <span className="text-[10px] text-white/30">in a row</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">GOAT IQ</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(goatIq, 100)}%`, background: "linear-gradient(90deg,#a855f7,#eab308)" }} />
                              </div>
                              <span className="text-[11px] font-black text-white">{Math.min(goatIq, 100)}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Games Played</p>
                            <span className="font-display text-3xl text-white/80">{wyg.gamesPlayed}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center h-full gap-1">
                          <p className="text-sm text-white/30 italic">No games yet</p>
                          <span className="text-[11px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300 transition-colors">Play Now →</span>
                        </div>
                      )}
                      {wyg && (
                        <div className="mt-2 self-end text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300 transition-colors">Play →</div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })()}

          {/* ── SHOT CLOCK ────────────────────────────────────────────── */}
          {(() => {
            const sc = arcadeStats?.shotClock ?? null;
            return (
              <Link href="/shot-clock">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #1a0808 0%, #2a1010 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.15) 0%, transparent 60%)" }} />
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 18 }}>⏱</span>
                      <span className="font-display text-sm tracking-widest text-white/60 uppercase">Shot Clock</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-red-500/60" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                      Pressure
                    </span>
                  </div>
                  {sc ? (
                    <>
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">High Score</p>
                          <p className="font-display leading-none" style={{ fontSize: "clamp(52px,12vw,72px)", color: "#ef4444" }}>{sc.bestScore}</p>
                        </div>
                        <div className="flex-1 flex justify-end items-center pr-2">
                          <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-red-800/50" />
                            <div className="absolute inset-1 rounded-full border-2 border-red-600/40" style={{ animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-display text-xl text-red-500">{sc.bestStreak}</span>
                            </div>
                            <p className="absolute -bottom-4 left-0 right-0 text-center text-[8px] uppercase tracking-wider text-white/30">streak</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex border-t border-white/8" style={{ background: "rgba(0,0,0,0.35)" }}>
                        {[
                          { label: "Best Streak", val: sc.bestStreak, highlight: true },
                          { label: "Games Played", val: sc.gamesPlayed, highlight: false },
                        ].map((s, i) => (
                          <div key={s.label} className={`flex-1 py-3 text-center ${i < 1 ? "border-r border-white/8" : ""}`}>
                            <p className={`font-black text-xl leading-none ${s.highlight ? "text-red-400" : "text-white"}`}>{s.val}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                        <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-300 transition-colors border-l border-white/8">Play →</div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 pb-4 flex items-center justify-between">
                      <p className="text-sm text-white/30 italic">No games yet</p>
                      <span className="text-[11px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-300 transition-colors">Play Now →</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}
        </div>
      )}

      {arcadeModal && arcadeStats && (
        <ArcadeStatModal
          gameKey={arcadeModal}
          stats={
            arcadeModal === "fastBreak" ? arcadeStats.fastBreak :
            arcadeModal === "whoYaGot" ? arcadeStats.whoYaGot :
            arcadeStats.shotClock
          }
          onClose={() => setArcadeModal(null)}
        />
      )}
    </div>
  );
}

// ── Arcade stat modal ────────────────────────────────────────────────────────

type ArcadeGameKey = "fastBreak" | "whoYaGot" | "shotClock";

const GAME_LABEL: Record<ArcadeGameKey, string> = {
  fastBreak: "FAST BREAK",
  whoYaGot:  "WHO YA GOT",
  shotClock: "SHOT CLOCK",
};
const GAME_SLUG: Record<ArcadeGameKey, "fast-break" | "who-ya-got" | "shot-clock"> = {
  fastBreak: "fast-break",
  whoYaGot:  "who-ya-got",
  shotClock: "shot-clock",
};
const GAME_EMOJI: Record<ArcadeGameKey, string> = {
  fastBreak: "🏀",
  whoYaGot:  "🎯",
  shotClock: "⏱️",
};

function fmtArcadePct(made: number, att: number): string {
  if (!att) return "—";
  return ((made / att) * 100).toFixed(1) + "%";
}

type GameStatShape = {
  bestScore?: number;
  bestStreak?: number;
  gamesPlayed?: number;
  totalFgm?: number;
  totalFga?: number;
  totalTpm?: number;
  totalTpa?: number;
  totalDunks?: number;
} | null | undefined;

function ArcadeStatModal({
  gameKey,
  stats,
  onClose,
}: {
  gameKey: ArcadeGameKey;
  stats: GameStatShape;
  onClose: () => void;
}) {
  const { data: rankData } = useGetMyArcadeRank({ game: GAME_SLUG[gameKey] });

  const isFB = gameKey === "fastBreak";
  const fgm = stats?.totalFgm ?? 0;
  const fga = stats?.totalFga ?? 0;
  const tpm = stats?.totalTpm ?? 0;
  const tpa = stats?.totalTpa ?? 0;
  const dunks = stats?.totalDunks ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border-t-2 sm:border-2 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {GAME_EMOJI[gameKey]} Arcade
            </p>
            <h2 className="font-display text-3xl leading-none mt-0.5">{GAME_LABEL[gameKey]}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors mt-1">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Best score hero */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Best Score</p>
          <p className="font-display text-5xl text-primary mt-1">{stats?.bestScore ?? 0}</p>
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="font-display text-2xl">{stats?.gamesPlayed ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Games Played</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="font-display text-2xl">{stats?.bestStreak ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Best Streak</p>
          </div>
        </div>

        {/* Shooting stats — Fast Break only */}
        {isFB && fga > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Career Shooting</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <p className="font-bold text-sm">{fgm}-{fga}</p>
                <p className="text-[10px] text-muted-foreground">FG</p>
                <p className="text-xs font-bold text-primary">{fmtArcadePct(fgm, fga)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <p className="font-bold text-sm">{tpm}-{tpa}</p>
                <p className="text-[10px] text-muted-foreground">3PT</p>
                <p className="text-xs font-bold text-primary">{fmtArcadePct(tpm, tpa)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <p className="font-bold text-sm">{dunks}</p>
                <p className="text-[10px] text-muted-foreground">Dunks</p>
                <p className="text-xs font-bold text-primary">💪</p>
              </div>
            </div>
          </div>
        )}

        {/* Rank */}
        {rankData && (
          <div className="bg-muted/40 rounded-xl p-4 flex items-center gap-3">
            <span className="text-3xl">
              {rankData.rank === 1 ? "🏆" : rankData.rank === 2 ? "🥈" : rankData.rank === 3 ? "🥉" : "🎮"}
            </span>
            <div>
              {rankData.rank ? (
                <>
                  <p className="font-display text-xl leading-none">
                    #{rankData.rank}{" "}
                    <span className="text-sm font-sans font-normal text-muted-foreground">
                      out of {rankData.total} player{rankData.total !== 1 ? "s" : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">All-time leaderboard</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No ranking yet — play more games!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getBallKnowledgeLevelColor(level: string): string {
  if (level === "Elite Playmaker")    return "#c084fc";
  if (level === "High Basketball IQ") return "#fb923c";
  if (level === "Varsity Vision")     return "#60a5fa";
  if (level === "Court Aware")        return "#4ade80";
  return "#94a3b8";
}

function BallKnowledgeBlock({ totalPoints, sessionCount, level }: { totalPoints: number; sessionCount: number; level: string }) {
  const levelColor = getBallKnowledgeLevelColor(level);
  const isElite = level === "Elite Playmaker";
  const pct = Math.min(100, Math.round((totalPoints / 800) * 100));

  return (
    <div className="card-base overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <Brain className="h-5 w-5" style={{ color: levelColor }} />
        <h2 className="font-bold text-secondary">Ball Knowledge</h2>
        {isElite && <Medal className="h-4 w-4" style={{ color: "#c084fc" }} />}
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <p className="label-upper mb-0.5">Level</p>
            <p className="text-xl font-black" style={{ color: levelColor }}>{level}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="label-upper mb-0.5">Total Points</p>
            <p className="text-xl font-black text-secondary tabular-nums">{totalPoints.toLocaleString()}</p>
          </div>
        </div>
        {!isElite && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress to Elite Playmaker</span>
              <span className="font-bold tabular-nums">{totalPoints} / 800 pts</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: levelColor }}
              />
            </div>
          </div>
        )}
        {isElite && (
          <div className="flex items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/8 px-4 py-2.5">
            <Medal className="h-4 w-4 flex-shrink-0" style={{ color: "#c084fc" }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c084fc" }}>The Playbook Stamp Earned</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"} completed on Iso Ball
        </p>
      </div>
    </div>
  );
}
