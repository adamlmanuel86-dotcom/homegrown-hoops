import { Link, useParams } from "wouter";
import { useUser } from "@clerk/react";
import { useGetProfile, useListPlayers, useGetPlayerStats, useListTeams } from "@workspace/api-client-react";
import { User, Pencil, ChevronLeft, School, Calendar, Trophy } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";
import { PlayerCard } from "@/components/player-card";

export function ProfilePage() {
  const { clerkUserId = "" } = useParams<{ clerkUserId: string }>();
  const { user, isSignedIn } = useUser();

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

      {/* ── Player Card (first thing visible) ── */}
      <div className="flex justify-center">
        <PlayerCard
          profile={profile}
          stats={cardStats}
          primaryColor={team?.primaryColor ?? "#B45309"}
          secondaryColor={team?.secondaryColor ?? "#1E3A5F"}
        />
      </div>

      {/* ── Banner ── */}
      <div className="rounded-2xl overflow-hidden bg-secondary text-white">
        <div className="px-8 py-10 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl text-white leading-tight">
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
            </div>
          </div>
        </div>
      </div>

      {/* ── Details ── */}
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

      {/* ── Recognition ── */}
      <RecognitionBlock
        stamps={profile.stamps ?? []}
        tides={profile.tides ?? []}
        archetype={profile.archetype}
      />
    </div>
  );
}
