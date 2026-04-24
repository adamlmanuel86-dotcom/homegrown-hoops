import { useState } from "react";
import { Link, useParams } from "wouter";
import { useUser } from "@clerk/react";
import { useGetProfile, useListPlayers, useGetPlayerStats, useListTeams } from "@workspace/api-client-react";
import { User, Pencil, ChevronLeft, School, Calendar, Trophy, Share2, Check } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";
import { PlayerCard } from "@/components/player-card";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ProfilePage() {
  const { clerkUserId = "" } = useParams<{ clerkUserId: string }>();
  const { user, isSignedIn } = useUser();
  const [copied, setCopied] = useState(false);

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

  const { data: profile, isLoading } = useGetProfile(clerkUserId, {
    query: { enabled: !!clerkUserId },
  });

  const { data: players } = useListPlayers();
  const matchedPlayer = players?.find(
    (p) =>
      p.firstName.toLowerCase() === (profile?.firstName ?? "").toLowerCase() &&
      p.lastName.toLowerCase() === (profile?.lastName ?? "").toLowerCase()
  );

  const { data: playerStats } = useGetPlayerStats(matchedPlayer?.id ?? 0, {
    query: { enabled: !!matchedPlayer?.id },
  });

  const { data: teams } = useListTeams();
  const team = teams?.find((t) => t.id === matchedPlayer?.teamId);
  const teamLabel = team?.name ?? "Unaffiliated / No Team";

  const isOwner = isSignedIn && user?.id === clerkUserId;

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

  const cardStats =
    playerStats && playerStats.gamesPlayed > 0
      ? {
          avgPoints: playerStats.avgPoints,
          avgRebounds: playerStats.avgRebounds,
          avgAssists: playerStats.avgAssists,
          avgThreesMade: playerStats.avgThreesMade,
          gamesPlayed: playerStats.gamesPlayed,
          totalPoints: playerStats.totalPoints,
          totalRebounds: playerStats.totalRebounds,
          totalAssists: playerStats.totalAssists,
        }
      : undefined;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <Link
        href="/players"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-secondary transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex flex-col items-center gap-4">
        <PlayerCard
          profile={profile}
          stats={cardStats}
          primaryColor={team?.primaryColor ?? "#B45309"}
          secondaryColor={team?.secondaryColor ?? "#1E3A5F"}
        />
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
          <div className="pt-2 border-t border-border">
            <Link href="/my-profile" className="btn-primary">
              <Pencil className="h-4 w-4" /> Edit Profile
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
        tides={profile.tides ?? []}
        archetype={profile.archetype}
      />
    </div>
  );
}
