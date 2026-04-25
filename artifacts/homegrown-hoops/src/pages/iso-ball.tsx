import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, ChevronLeft, RotateCcw, Zap, Trophy, Timer, BookOpen, Medal, Lock, Info } from "lucide-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetIsoBallLeaderboard } from "@workspace/api-client-react";

type Difficulty = "rookie" | "varsity" | "elite";
type AnswerKey = "A" | "B" | "C" | "D";

interface Question {
  q: string;
  opts: [string, string, string, string];
  ans: AnswerKey;
}

const QUESTIONS: Record<Difficulty, Question[]> = {
  rookie: [
    { q: "How many players from each team are on the court at one time?", opts: ["4", "6", "5", "7"], ans: "C" },
    { q: "How many seconds does a player have in the key before a violation?", opts: ["2", "3", "4", "5"], ans: "B" },
    { q: "A player catches a pass, takes two steps, and shoots a layup. Is this travelling?", opts: ["Yes, always", "No — the two-step rule allows this", "Only in the paint", "Only if dribbling first"], ans: "B" },
    { q: "What does a referee making a T shape with their hands mean?", opts: ["Timeout", "Technical foul", "Travelling", "Ten-second violation"], ans: "B" },
    { q: "How many seconds does a team have to advance past halfcourt?", opts: ["5", "15", "8", "10"], ans: "C" },
    { q: "What happens when a team accumulates too many fouls in a quarter?", opts: ["Nothing", "Technical foul shot", "Bonus free throws on non-shooting fouls", "Coach ejected"], ans: "C" },
    { q: "How many fouls does a player need to foul out?", opts: ["4", "5", "6", "3"], ans: "B" },
    { q: "What is a fast break?", opts: ["Quick timeout", "Pushing ball up court before defense sets", "Foul on defender", "Coach-drawn play"], ans: "B" },
    { q: "What does boxing out mean?", opts: ["Fighting", "Positioning body between opponent and basket for rebound", "Setting a screen", "Dribbling with two hands"], ans: "B" },
    { q: "What is a double dribble?", opts: ["Dribbling two hands simultaneously or stopping and restarting dribble", "Bouncing too hard", "Behind-the-back dribble", "Dribbling out of bounds"], ans: "A" },
    { q: "What is an assist?", opts: ["Helping an injured player", "Pass directly leading to a made basket", "Defensive play", "Coaching timeout"], ans: "B" },
    { q: "What is a turnover?", opts: ["Defensive rotation", "Offense loses possession to defense", "Shot off the rim", "Substitution"], ans: "B" },
    { q: "Where must a player stand when shooting a free throw?", opts: ["Anywhere behind the three-point line", "On the free throw line without stepping over until ball hits rim", "Inside the key", "Baseline"], ans: "B" },
    { q: "What is a jump ball?", opts: ["Player jumping for a pass", "Two players gain possession simultaneously and referee tosses ball between them", "Shot attempt", "Type of foul"], ans: "B" },
    { q: "What does man-to-man defense mean?", opts: ["Only men play defense", "Each defender guards one specific offensive player", "All defend the ball handler", "Defenders switch every play"], ans: "B" },
    { q: "What is a rebound?", opts: ["Recovering a missed shot", "Second-chance free throw", "Pass off the floor", "Running back on defense"], ans: "A" },
    { q: "What is the shot clock for?", opts: ["Time substitutions", "Limit possession time before a shot attempt", "Track player time", "Count to halftime"], ans: "B" },
    { q: "What is an offensive foul?", opts: ["Foul on defense", "Foul committed by the offensive player", "Any foul in the paint", "Foul on a three-point shot"], ans: "B" },
    { q: "What does 'shooting pocket' mean?", opts: ["Standing in their way", "Position where player naturally catches and shoots in one fluid motion", "Defensive technique", "Court location"], ans: "B" },
    { q: "What is goaltending?", opts: ["Playing goalkeeper", "Illegally interfering with a shot on its downward arc or on the rim", "Standing under the basket", "Blocking a pass"], ans: "B" },
  ],
  varsity: [
    { q: "A team inbounds from halfcourt, down 2, with 2 seconds left. Pass hits the backboard and goes in. Ruling?", opts: ["3 points", "2 points — overtime", "No basket", "Technical foul"], ans: "C" },
    { q: "What is a pick and roll?", opts: ["Catch and shoot", "Offensive player sets screen then cuts to basket", "Defensive trap", "Players switch positions"], ans: "B" },
    { q: "What does help defense mean?", opts: ["Asking a teammate for advice", "Defender leaves assignment to assist a beaten teammate", "Intentional foul", "Sagging off the corner man"], ans: "B" },
    { q: "Difference between a blocking and charging foul?", opts: ["No difference", "Blocking on offense, charging on defense", "Blocking = no position; charging = defender established position and offense runs into them", "Charging only in the paint"], ans: "C" },
    { q: "What is a skip pass?", opts: ["Bounce pass", "Pass directly across court to weak side, skipping defenders", "No-look pass", "Behind-the-back pass"], ans: "B" },
    { q: "In a 2-3 zone, what do the numbers represent?", opts: ["Two guards at the top, three across the baseline", "Two forwards, three guards", "Two shot-clock seconds, three pointers", "Two at halfcourt, three in the paint"], ans: "A" },
    { q: "What is motion offense?", opts: ["A set play every possession", "Free-flowing system reading the defense without predetermined plays", "Fast break only", "Isolation offense"], ans: "B" },
    { q: "What is a back screen?", opts: ["Screening behind the ball handler", "Screen on a defender between the screener and basket, allowing a teammate to cut toward the ball", "Baseline screen", "Halfcourt screen"], ans: "B" },
    { q: "What is an 'and-one'?", opts: ["Three-point shot", "Fouled while making the shot — earns one free throw", "Isolation play", "Bonus free throw"], ans: "B" },
    { q: "What does transition defense mean?", opts: ["Switch from man to zone", "Getting back quickly when team loses possession", "Post defense", "Switching assignments"], ans: "B" },
    { q: "What is a give-and-go?", opts: ["Pass to teammate and immediately cut to basket for return pass", "Turnover", "Defensive switch", "Timeout play"], ans: "A" },
    { q: "What does 'weak side' mean?", opts: ["Side with the weakest player", "Side of the court away from the ball", "Side nearest the bench", "Side nearest halfcourt"], ans: "B" },
    { q: "What is a closeout?", opts: ["Ending the game", "Defender sprints toward offensive player to contest shot while staying under control", "Full-court press", "Double team"], ans: "B" },
    { q: "What is the high post used for in offense?", opts: ["Just standing there", "Player at the free throw line area creates scoring opportunities and acts as offensive hub", "Inbound plays only", "Defensive position"], ans: "B" },
    { q: "What does 'running a play off timeout' mean?", opts: ["Coach draws up a specific play to run immediately after timeout", "Players rest", "Switch to zone", "Best player improvises"], ans: "A" },
    { q: "What is a defensive rotation?", opts: ["Substituting defenders", "Defenders shift positions responding to offensive movement to maintain coverage", "Zone-to-man switch", "Practice drill"], ans: "B" },
    { q: "What does 'penetrate and kick' mean?", opts: ["Kicking the ball intentionally", "Ball handler drives into paint drawing defenders then passes to open perimeter player", "Fast break play", "Post entry"], ans: "B" },
    { q: "What is a 'hedge' in pick-and-roll defense?", opts: ["Hiding behind the screen", "Big defender steps up aggressively to slow ball handler off screen giving teammate recovery time", "Zone adjustment", "Post double team"], ans: "B" },
    { q: "What does 'playing off the ball' mean?", opts: ["Not touching the ball", "Movement, cutting and positioning of players without the ball", "Defense only", "Standing in the corner"], ans: "B" },
    { q: "What is a secondary break?", opts: ["Halftime", "After the initial fast break, offense continues pushing pace with quick structured actions before defense fully sets", "Second timeout", "Substitution pattern"], ans: "B" },
  ],
  elite: [
    { q: "In a 2-3 zone, there's a skip pass to the weak-side corner. Which defender contests?", opts: ["Top left guard", "Center", "Weak-side wing", "Strong-side forward"], ans: "C" },
    { q: "Advantage of a dribble hand-off over a pick and roll?", opts: ["Faster", "Screener becomes the ball handler option — harder to switch", "Less spacing needed", "End-game only"], ans: "B" },
    { q: "What is a horns set?", opts: ["Two bigs at the elbows, guards in corners", "Fast break play", "Full-court press", "Isolation"], ans: "A" },
    { q: "Purpose of a DHO (dribble hand-off)?", opts: ["Slow the pace", "Create a guard advantage — forces a difficult defensive decision", "Get ball to the post", "Run the clock"], ans: "B" },
    { q: "What is a scramble switch?", opts: ["Practice drill", "Emergency defensive adjustment switching assignments when a screen breaks coverage", "Offensive set", "Press break"], ans: "B" },
    { q: "Why is shooting off the catch effective?", opts: ["No difference", "One motion requiring less time — harder to contest", "More accurate", "Three-pointers only"], ans: "B" },
    { q: "'Playing the gaps' in zone defense means?", opts: ["Standing between offensive players, denying lanes and creating deflections", "Playing behind the zone", "Post double", "Trapping the ball handler"], ans: "A" },
    { q: "'Paint touches create offense' means?", opts: ["Fouling strategy", "Ball in paint forces collapse, creating open perimeter shots", "Post player always shoots", "Driving draws fouls"], ans: "B" },
    { q: "What is a flare screen?", opts: ["Halfcourt screen", "Screen away from the ball freeing a shooter moving toward the three-point line or corner", "Baseline screen", "Post screen"], ans: "B" },
    { q: "What does 'icing a pick-and-roll' mean?", opts: ["Freezing the ball handler", "Defender forces ball handler away from screen toward the sideline while big protects the paint", "Double team the screener", "Switch every screen"], ans: "B" },
    { q: "What is a 'dunker spot'?", opts: ["Where the best dunker stands", "Position inside paint near baseline opposite the ball, stretching defense and creating lob or dump-off options", "Low post", "Short corner"], ans: "B" },
    { q: "What is 'chin action'?", opts: ["Defensive signal", "Point guard dribbles toward big at elbow, triggering cuts and screens", "Fast break", "Press break"], ans: "B" },
    { q: "What is the 'nail position' in defense?", opts: ["Halfcourt", "Help defender at the middle of the free throw line, ready to help on drives from either side", "Weakest position", "Post guard"], ans: "B" },
    { q: "Difference between a pin-down screen and a curl cut?", opts: ["No difference", "Pin down frees player cutting from baseline toward ball; curl means cutter wraps around screen toward the basket", "Pin down is zone only", "Curl is defensive"], ans: "B" },
    { q: "'Going under a screen' on defense means?", opts: ["Ducking", "Defender goes behind screener on the basket side, giving space to prevent turning the corner", "Switching", "Hard hedge"], ans: "B" },
    { q: "What is a short roll?", opts: ["Small player screens", "Screener stops short in the paint after the pick as a secondary ball handler option", "Quick post pass", "Fast break"], ans: "B" },
    { q: "What does 'early offense' mean?", opts: ["Starting the game early", "Pushing pace immediately after a made basket or rebound before defense sets", "Specific play", "Quick timeout"], ans: "B" },
    { q: "What is a 'trip wire' in full-court pressure?", opts: ["Tripping players", "Designated spot where a defender turns the ball handler or forces a dribble pickup, triggering a teammate trap", "Zone defense", "Half-court trap"], ans: "B" },
    { q: "What does 'spacing' mean and why does it matter?", opts: ["Bench distance", "Deliberate positioning stretching the defense — creates driving lanes and passing angles", "Distance from the three-point line", "NBA-only concept"], ans: "B" },
    { q: "What is a ghost screen?", opts: ["Invisible screen", "Player acts like setting a screen then peels away — ball handler uses the fake screen to attack while screener becomes an immediate scoring option", "Out-of-bounds screen", "Halfcourt screen"], ans: "B" },
  ],
};

const DIFF_META: Record<Difficulty, { label: string; color: string; bg: string; ring: string; tagline: string; pts: number }> = {
  rookie:  { label: "ROOKIE",  color: "#4ade80", bg: "rgba(74,222,128,0.1)",  ring: "rgba(74,222,128,0.4)",  tagline: "Learn the fundamentals",           pts: 10 },
  varsity: { label: "VARSITY", color: "#fb923c", bg: "rgba(251,146,60,0.1)",  ring: "rgba(251,146,60,0.4)",  tagline: "Prove your court sense",            pts: 15 },
  elite:   { label: "ELITE",   color: "#c084fc", bg: "rgba(192,132,252,0.1)", ring: "rgba(192,132,252,0.4)", tagline: "Separate yourself from the field",  pts: 20 },
};

const LABELS: [AnswerKey, string][] = [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]];
const DAILY_SESSION_LIMIT = 5;
const COOLDOWN_SECONDS = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPerformance(score: number, diff: Difficulty): string {
  if (diff === "rookie") {
    if (score === 10) return "Perfect Rookie!";
    if (score >= 8)  return "Strong Foundation";
    if (score >= 6)  return "Getting There";
    return "Keep Studying";
  }
  if (diff === "varsity") {
    if (score === 10) return "Varsity Captain";
    if (score >= 8)  return "High IQ Player";
    if (score >= 6)  return "Good Court Sense";
    return "Keep Grinding";
  }
  if (score === 10) return "Elite Basketball Mind";
  if (score >= 8)  return "Scout-Level Vision";
  if (score >= 6)  return "Advanced IQ";
  return "Back to the Film Room";
}

function getBallKnowledgeLevel(pts: number): string {
  if (pts >= 800) return "Elite Playmaker";
  if (pts >= 500) return "High Basketball IQ";
  if (pts >= 250) return "Varsity Vision";
  if (pts >= 100) return "Court Aware";
  if (pts >= 1)   return "Rookie IQ";
  return "none";
}

function getLevelColor(level: string): string {
  if (level === "Elite Playmaker")    return "#c084fc";
  if (level === "High Basketball IQ") return "#fb923c";
  if (level === "Varsity Vision")     return "#60a5fa";
  if (level === "Court Aware")        return "#4ade80";
  return "#94a3b8";
}

const TIMER_SECS = 15;
const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type DailyStatus = {
  sessionsByDifficulty: Record<string, number>;
  lastSessionAt: string | null;
  cooldownSecondsLeft: number;
};

type SessionResponse = {
  success: boolean;
  pointsEarned: number;
  deduped: number;
  totalPoints: number;
  level: string;
  reason: string | null;
  sessionsToday: number;
  dailySessionsLeft: number;
  locked: boolean;
  cooldownSecondsLeft?: number;
};

export function IsoBallPage() {
  const { isSignedIn, user } = useUser();
  const qc = useQueryClient();

  const [screen, setScreen] = useState<"landing" | "quiz" | "results">("landing");
  const [difficulty, setDifficulty] = useState<Difficulty>("rookie");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [originalIndices, setOriginalIndices] = useState<number[]>([]);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionPtsEarned, setSessionPtsEarned] = useState<number | null>(null);
  const [sessionDeduped, setSessionDeduped] = useState<number | null>(null);
  const [sessionReason, setSessionReason] = useState<string | null>(null);
  const [newTotalPoints, setNewTotalPoints] = useState<number | null>(null);
  const [newLevel, setNewLevel] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  const [dailyStatus, setDailyStatus] = useState<Record<string, number>>({ rookie: 0, varsity: 0, elite: 0 });
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: leaderboard, isLoading: lbLoading } = useGetIsoBallLeaderboard();

  // Fetch daily status for signed-in users on mount
  useEffect(() => {
    if (!isSignedIn) { setStatusLoaded(true); return; }
    fetch(`${BASE_URL}/api/iso-ball/daily-status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: DailyStatus) => {
        setDailyStatus(data.sessionsByDifficulty);
        if (data.cooldownSecondsLeft > 0) {
          startCooldown(data.cooldownSecondsLeft);
        }
        setStatusLoaded(true);
      })
      .catch(() => setStatusLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  function startCooldown(seconds: number) {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldownLeft(Math.ceil(seconds));
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((t) => {
        if (t <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const advance = useCallback((wasCorrect: boolean) => {
    stopTimer();
    const newStreak = wasCorrect ? streak + 1 : 0;
    const newBest = Math.max(bestStreak, newStreak);
    setStreak(newStreak);
    setBestStreak(newBest);
    if (wasCorrect) {
      setCorrect((c) => c + 1);
      setCorrectIndices((ci) => [...ci, originalIndices[qIndex]]);
    }

    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        setScreen("results");
      } else {
        setQIndex((i) => i + 1);
        setSelected(null);
        setAnswered(false);
        setTimeLeft(TIMER_SECS);
      }
    }, 900);
  }, [qIndex, questions.length, streak, bestStreak, stopTimer, originalIndices]);

  const handleAnswer = useCallback((key: AnswerKey) => {
    if (answered) return;
    setAnswered(true);
    setSelected(key);
    advance(key === questions[qIndex].ans);
  }, [answered, questions, qIndex, advance]);

  useEffect(() => {
    if (screen !== "quiz" || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { advance(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
  }, [screen, qIndex, answered, advance, stopTimer]);

  // Submit session when results screen shows
  useEffect(() => {
    if (screen !== "results" || !isSignedIn) return;

    startCooldown(COOLDOWN_SECONDS);

    let cancelled = false;
    async function save() {
      try {
        const res = await fetch(`${BASE_URL}/api/iso-ball/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ difficulty, correctQuestionIndices: correctIndices }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json() as SessionResponse;
        if (cancelled) return;
        setSessionPtsEarned(data.pointsEarned);
        setSessionDeduped(data.deduped ?? 0);
        setSessionReason(data.reason);
        setNewTotalPoints(data.totalPoints);
        setNewLevel(data.level);
        setSessionSaved(true);
        setDailyStatus((prev) => ({
          ...prev,
          [difficulty]: data.sessionsToday ?? (prev[difficulty] + 1),
        }));
        if (data.reason === "cooldown" && data.cooldownSecondsLeft) {
          startCooldown(data.cooldownSecondsLeft);
        }
        qc.invalidateQueries({ queryKey: ["isoBallLeaderboard"] });
        qc.invalidateQueries({ queryKey: ["isoBallProfile", user?.id] });
      } catch {
        if (!cancelled) setSaveError(true);
      }
    }
    save();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function startQuiz(diff: Difficulty) {
    const pool = QUESTIONS[diff].map((q, i) => ({ q, origIdx: i }));
    const shuffled = shuffle(pool).slice(0, 10);
    setDifficulty(diff);
    setQuestions(shuffled.map((x) => x.q));
    setOriginalIndices(shuffled.map((x) => x.origIdx));
    setCorrectIndices([]);
    setQIndex(0);
    setSelected(null);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setAnswered(false);
    setTimeLeft(TIMER_SECS);
    setSessionSaved(false);
    setSessionPtsEarned(null);
    setSessionDeduped(null);
    setSessionReason(null);
    setNewTotalPoints(null);
    setNewLevel(null);
    setSaveError(false);
    setScreen("quiz");
  }

  function goLanding() {
    stopTimer();
    setScreen("landing");
  }

  const meta = DIFF_META[difficulty];
  const timerPct = (timeLeft / TIMER_SECS) * 100;
  const timerColor = timeLeft > 8 ? "#4ade80" : timeLeft > 4 ? "#fb923c" : "#f87171";

  // ── Landing ──────────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 mb-2">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight" style={{ fontFamily: "'Anton', sans-serif" }}>
            Iso Ball
          </h1>
          <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Test your basketball IQ. Three levels. Ten questions. How deep is your knowledge?
          </p>
          {!isSignedIn && (
            <p className="text-xs text-muted-foreground/70">
              <a href={`${BASE_URL}/sign-in`} className="underline text-primary/70 hover:text-primary">Sign in</a> to save your score and appear on The Playbook.
            </p>
          )}
        </div>

        {/* Difficulty cards */}
        <div className="grid gap-4">
          {(["rookie", "varsity", "elite"] as Difficulty[]).map((diff) => {
            const m = DIFF_META[diff];
            const sessionsToday = dailyStatus[diff] ?? 0;
            const isLocked = isSignedIn && statusLoaded && sessionsToday >= DAILY_SESSION_LIMIT;
            const onCooldown = isSignedIn && cooldownLeft > 0;

            return (
              <div key={diff} className="relative">
                <button
                  onClick={() => !isLocked && startQuiz(diff)}
                  disabled={isLocked}
                  className="w-full text-left rounded-2xl p-5 border transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: m.bg, borderColor: isLocked ? "rgba(255,255,255,0.08)" : m.ring }}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xl font-black uppercase tracking-wider flex items-center gap-2" style={{ color: isLocked ? "rgba(255,255,255,0.35)" : m.color, fontFamily: "'Anton', sans-serif" }}>
                        {m.label}
                        {isLocked && <Lock className="h-4 w-4" />}
                      </div>
                      {isLocked ? (
                        <div className="text-sm font-semibold text-muted-foreground/70">
                          Come back tomorrow to keep earning
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">{m.tagline}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isLocked ? (
                        <div className="text-xs text-muted-foreground/50 font-semibold">
                          {sessionsToday}/{DAILY_SESSION_LIMIT} sessions
                        </div>
                      ) : onCooldown ? (
                        <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <Timer className="h-3.5 w-3.5" /> {cooldownLeft}s
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: m.color }}>
                          Play <Zap className="h-4 w-4" />
                        </div>
                      )}
                      {!isLocked && (
                        <span className="text-xs text-muted-foreground">{m.pts} pts/correct</span>
                      )}
                      {isSignedIn && !isLocked && statusLoaded && sessionsToday > 0 && (
                        <span className="text-xs text-muted-foreground/50">{sessionsToday}/{DAILY_SESSION_LIMIT} today</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Daily earning note */}
        <div className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/3 px-4 py-3">
          <Info className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            Ball Knowledge points are earned once per question per day — come back daily to keep climbing.
          </p>
        </div>

        {/* The Playbook Leaderboard */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-white/4 border-b border-white/8">
            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <h2 className="font-black text-sm uppercase tracking-widest text-foreground">The Playbook</h2>
              <p className="text-xs text-muted-foreground">Who Knows The Game</p>
            </div>
          </div>

          {lbLoading ? (
            <div className="divide-y divide-white/6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                  <div className="w-6 h-4 bg-muted/30 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted/30 rounded w-32" />
                    <div className="h-2.5 bg-muted/20 rounded w-20" />
                  </div>
                  <div className="h-3 bg-muted/30 rounded w-16" />
                </div>
              ))}
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              No players on the board yet. Be the first!
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {leaderboard.slice(0, 10).map((entry) => {
                const levelColor = getLevelColor(entry.level);
                const isElite = entry.level === "Elite Playmaker";
                const isMe = isSignedIn && user?.id === entry.clerkUserId;
                return (
                  <div
                    key={entry.clerkUserId}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${isMe ? "bg-primary/8" : ""}`}
                  >
                    <span className={`text-sm font-black w-6 text-center tabular-nums ${entry.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {entry.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                          {entry.firstName} {entry.lastName}
                          {isMe && <span className="text-xs text-primary/70 font-medium ml-1">(you)</span>}
                        </p>
                        {isElite && (
                          <Medal className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#c084fc" }} />
                        )}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: levelColor }}>{entry.level}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black tabular-nums text-foreground">{entry.totalPoints.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{entry.sessions} {entry.sessions === 1 ? "session" : "sessions"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  if (screen === "quiz") {
    const q = questions[qIndex];
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={goLanding} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-sm font-semibold text-muted-foreground">{qIndex + 1} / {questions.length}</span>
            <div className="flex items-center gap-1 text-xs font-bold text-primary">
              <Trophy className="h-3.5 w-3.5" /> {correct}
            </div>
            {streak >= 2 && (
              <div className="flex items-center gap-1 text-xs font-bold text-orange-400">
                <Zap className="h-3.5 w-3.5" /> {streak}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3 w-3" /> Timer
            </div>
            <span className="font-bold tabular-nums" style={{ color: timerColor }}>{timeLeft}s</span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${timerPct}%`, background: timerColor, transition: "width 1s linear, background 0.3s" }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 p-6">
          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-3">Question {qIndex + 1}</p>
          <p className="text-lg font-bold leading-snug">{q.q}</p>
        </div>

        <div className="grid gap-3">
          {LABELS.map(([key], i) => {
            const optText = q.opts[i];
            const isCorrect = key === q.ans;
            const isSelected = key === selected;

            let bg = "rgba(255,255,255,0.04)";
            let border = "rgba(255,255,255,0.1)";
            let textColor = "inherit";

            if (answered) {
              if (isCorrect) { bg = "rgba(74,222,128,0.15)"; border = "rgba(74,222,128,0.5)"; textColor = "#4ade80"; }
              else if (isSelected && !isCorrect) { bg = "rgba(248,113,113,0.15)"; border = "rgba(248,113,113,0.5)"; textColor = "#f87171"; }
            }

            return (
              <button
                key={key}
                disabled={answered}
                onClick={() => handleAnswer(key)}
                className="w-full text-left rounded-xl px-5 py-4 border transition-all hover:bg-white/8 disabled:cursor-default flex items-center gap-4"
                style={{ background: bg, borderColor: border, color: textColor }}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border" style={{ borderColor: border, color: textColor }}>
                  {key}
                </span>
                <span className="text-sm font-semibold">{optText}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const pct = Math.round((correct / 10) * 100);
  const perfLabel = getPerformance(correct, difficulty);
  const ringColor = correct >= 8 ? "#4ade80" : correct >= 6 ? "#fb923c" : "#f87171";
  const pointsEarnedThisSession = correct * DIFF_META[difficulty].pts;
  const isOnCooldown = isSignedIn && cooldownLeft > 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8 text-center">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label} · Results</p>
        <h2 className="text-3xl font-black uppercase tracking-tight" style={{ fontFamily: "'Anton', sans-serif" }}>{perfLabel}</h2>
      </div>

      <div className="flex justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={ringColor} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tabular-nums" style={{ color: ringColor }}>{correct}</span>
            <span className="text-sm text-muted-foreground font-semibold">/ 10</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/4 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accuracy</p>
          <p className="text-2xl font-black">{pct}%</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/4 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Best Streak</p>
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="h-5 w-5 text-orange-400" />
            <p className="text-2xl font-black">{bestStreak}</p>
          </div>
        </div>
      </div>

      {/* Ball Knowledge points earned */}
      {isSignedIn ? (
        <div
          className="rounded-xl border p-4 space-y-1.5"
          style={{
            borderColor: sessionSaved ? "rgba(192,132,252,0.3)" : "rgba(255,255,255,0.08)",
            background: sessionSaved ? "rgba(192,132,252,0.08)" : "rgba(255,255,255,0.04)",
          }}
        >
          {sessionSaved ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#c084fc" }}>Ball Knowledge</p>

              {sessionReason === "daily_limit" ? (
                <p className="text-sm font-semibold text-muted-foreground">
                  No points — daily session limit reached
                </p>
              ) : sessionReason === "cooldown" ? (
                <p className="text-sm font-semibold text-muted-foreground">
                  No points — played too quickly
                </p>
              ) : (
                <>
                  <p className="text-lg font-black">
                    +{sessionPtsEarned} pts earned
                    {(sessionDeduped ?? 0) > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({sessionDeduped} already earned today)
                      </span>
                    )}
                  </p>
                  {newTotalPoints !== null && newLevel && (
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="font-bold text-foreground">{newTotalPoints.toLocaleString()} pts</span>
                      {" · "}
                      <span className="font-bold" style={{ color: getLevelColor(newLevel) }}>{newLevel}</span>
                    </p>
                  )}
                  {newLevel === "Elite Playmaker" && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Medal className="h-4 w-4" style={{ color: "#c084fc" }} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c084fc" }}>The Playbook Stamp Earned</span>
                    </div>
                  )}
                </>
              )}
            </>
          ) : saveError ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ball Knowledge</p>
              <p className="text-xs text-muted-foreground">+{pointsEarnedThisSession} pts (could not save — try again later)</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ball Knowledge</p>
              <p className="text-xs text-muted-foreground animate-pulse">Saving…</p>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ball Knowledge</p>
          <p className="text-sm text-muted-foreground">
            <a href={`${BASE_URL}/sign-in`} className="text-primary underline font-semibold">Sign in</a> to save your score and earn a spot on The Playbook.
          </p>
          <p className="text-xs text-muted-foreground/60">You would have earned +{pointsEarnedThisSession} pts this session.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={() => startQuiz(difficulty)}
          disabled={isOnCooldown}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOnCooldown ? (
            <>
              <Timer className="h-4 w-4" />
              Next play in {cooldownLeft}s
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" /> Play Again — {meta.label}
            </>
          )}
        </button>
        <button
          onClick={goLanding}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/12 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/6 active:scale-95 transition-all"
        >
          Change Difficulty
        </button>
      </div>
    </div>
  );
}
