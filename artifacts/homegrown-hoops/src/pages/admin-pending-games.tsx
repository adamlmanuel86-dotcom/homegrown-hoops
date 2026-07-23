import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListPendingGames,
  useApprovePendingGame,
  useRejectPendingGame,
} from "@workspace/api-client-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function AdminPendingGamesPage() {
  const [, navigate] = useLocation();
  const { data: myProfile } = useGetMyProfile();
  const { data: pending, isPending: loading, refetch } = useListPendingGames();
  const approve = useApprovePendingGame();
  const reject = useRejectPendingGame();
  const { toast } = useToast();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const isAdmin = myProfile?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="border-2 border-border p-8 shadow-[6px_6px_0_0_rgba(0,0,0,1)] text-center">
          <h2 className="font-display text-2xl mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  async function handleApprove(id: number) {
    try {
      await approve.mutateAsync({ id });
      toast({ title: "Game approved!", description: "Stats are now live." });
      refetch();
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    }
  }

  async function handleReject(id: number) {
    if (!rejectNote.trim()) {
      toast({ title: "Enter a rejection note", variant: "destructive" });
      return;
    }
    try {
      await reject.mutateAsync({ id, data: { note: rejectNote } });
      toast({ title: "Game rejected", description: "Submission has been removed." });
      setRejectingId(null);
      setRejectNote("");
      refetch();
    } catch {
      toast({ title: "Rejection failed", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Back to Admin
        </button>
        <div className="flex items-center gap-4 mt-2">
          <h1 className="font-display text-4xl">Pending Games</h1>
          {!loading && (
            <span className="bg-yellow-600 text-white text-sm font-bold px-2 py-1 border-2 border-border">
              {(pending ?? []).length}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve or reject game submissions from managers.
        </p>
      </div>

      {loading && (
        <div className="text-muted-foreground text-center py-12">Loading…</div>
      )}

      {!loading && (pending ?? []).length === 0 && (
        <div className="border-2 border-border shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-8 text-center">
          <div className="text-4xl mb-2">✓</div>
          <h2 className="font-display text-2xl mb-1">All clear</h2>
          <p className="text-muted-foreground">No pending game submissions.</p>
        </div>
      )}

      <div className="space-y-4">
        {(pending ?? []).map((game) => {
          const isExpanded = expandedId === game.id;
          const isRejecting = rejectingId === game.id;
          const homeDisplay = game.homeTeamName ?? `Team #${game.homeTeamId}`;
          const awayDisplay = game.awayTeamName ?? game.opponentName ?? "Opponent";
          const hs = game.homeScore ?? 0;
          const as_ = game.awayScore ?? 0;

          return (
            <div
              key={game.id}
              className="border-2 border-border shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-card"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-lg">
                      <span className="text-primary">{homeDisplay}</span>
                      <span className="text-muted-foreground mx-2">{hs} — {as_}</span>
                      <span>{awayDisplay}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {game.gameDate} · {game.season}
                      {game.location && ` · ${game.location}`}
                    </div>
                    {game.submittedByName && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Submitted by <strong>{game.submittedByName}</strong>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {game.playerStats.length} player{game.playerStats.length !== 1 ? "s" : ""} tracked
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : game.id)}
                    className="border-2 border-border px-3 py-1 text-xs font-bold hover:bg-muted shrink-0"
                  >
                    {isExpanded ? "Hide" : "View Box Score"}
                  </button>
                </div>

                {/* Action buttons */}
                {!isRejecting && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApprove(game.id)}
                      disabled={approve.isPending}
                      className="flex-1 bg-green-600 text-white border-2 border-border py-2 text-sm font-bold uppercase tracking-wide hover:opacity-90 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setRejectingId(game.id); setRejectNote(""); }}
                      className="flex-1 bg-red-700 text-white border-2 border-border py-2 text-sm font-bold uppercase tracking-wide hover:opacity-90"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {/* Reject note form */}
                {isRejecting && (
                  <div className="mt-3 border-2 border-red-700 p-3">
                    <div className="text-xs font-bold uppercase text-red-400 mb-2">Rejection Note</div>
                    <textarea
                      className="w-full border-2 border-border bg-background p-2 text-sm focus:outline-none focus:border-primary resize-none"
                      rows={3}
                      placeholder="Explain why this is being rejected…"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { setRejectingId(null); setRejectNote(""); }}
                        className="flex-1 border-2 border-border py-2 text-sm font-bold hover:bg-muted"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(game.id)}
                        disabled={reject.isPending}
                        className="flex-1 bg-red-700 text-white border-2 border-border py-2 text-sm font-bold uppercase disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Box score */}
              {isExpanded && (
                <div className="border-t-2 border-border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left p-2 font-bold">Player</th>
                        <th className="p-2">PTS</th>
                        <th className="p-2">REB</th>
                        <th className="p-2">AST</th>
                        <th className="p-2">STL</th>
                        <th className="p-2">BLK</th>
                        <th className="p-2">FG</th>
                        <th className="p-2">3P</th>
                        <th className="p-2">FT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {game.playerStats.map((s) => (
                        <tr key={s.id} className="border-b border-border last:border-0">
                          <td className="p-2 font-medium">
                            {s.playerFirstName} {s.playerLastName}
                          </td>
                          <td className="p-2 text-center font-bold text-primary">{s.points ?? 0}</td>
                          <td className="p-2 text-center">{s.rebounds ?? 0}</td>
                          <td className="p-2 text-center">{s.assists ?? 0}</td>
                          <td className="p-2 text-center">{s.steals ?? 0}</td>
                          <td className="p-2 text-center">{s.blocks ?? 0}</td>
                          <td className="p-2 text-center">{s.fieldGoalsMade}/{s.fieldGoalsAttempted}</td>
                          <td className="p-2 text-center">{s.threePointersMade ?? 0}/{s.threePointersAttempted}</td>
                          <td className="p-2 text-center">{s.freeThrowsMade}/{s.freeThrowsAttempted}</td>
                        </tr>
                      ))}
                      {game.playerStats.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-muted-foreground">
                            No player stats submitted
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
