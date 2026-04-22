import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetMyProfile,
  useCreateMyProfile,
  useListTeams,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, Camera, Compass, X, Upload } from "lucide-react";
import { HomegrownHoopsLogo } from "@/components/logo";
import { PlayerCard } from "@/components/player-card";
import { Walkthrough } from "@/components/walkthrough";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i - 1);

type Step =
  | "welcome"
  | "name"
  | "school"
  | "position"
  | "year"
  | "photo"
  | "submitting"
  | "reveal"
  | "walkthrough";

const PROFILE_STEPS: Step[] = ["name", "school", "position", "year", "photo"];

function stepIndex(step: Step): number {
  return PROFILE_STEPS.indexOf(step);
}

export function OnboardingPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });
  const { data: teams } = useListTeams({ query: { enabled: isSignedIn === true } });
  const createProfile = useCreateMyProfile();

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn, setLocation]);

  // Redirect if already has a profile (onboarding already done)
  useEffect(() => {
    if (!profileLoading && profile) setLocation("/");
  }, [profileLoading, profile, setLocation]);

  const [step, setStep] = useState<Step>("welcome");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    school: "",
    teamId: "",
    position: "",
    graduationYear: "",
    avatarUrl: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ref mirror of isSubmitting — avoids stale closure in touch handlers
  const isSubmittingRef = useRef(false);

  // Reveal animation phases
  const [revealPhase, setRevealPhase] = useState(0);

  // Populate name from Clerk
  useEffect(() => {
    if (user && !form.firstName) {
      setForm((f) => ({
        ...f,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
      }));
    }
  }, [user]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setUploadError(null);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!avatarFile) return null;
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: avatarFile.name,
          size: avatarFile.size,
          contentType: avatarFile.type,
        }),
      });
      if (!urlRes.ok) return null;
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: avatarFile,
        headers: { "Content-Type": avatarFile.type },
      });

      return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
    } catch {
      return null;
    }
  }

  async function advanceFromPhoto(skip: boolean) {
    console.log("[HH] advanceFromPhoto called — skip:", skip, "isSubmittingRef:", isSubmittingRef.current);
    if (isSubmittingRef.current) {
      console.log("[HH] advanceFromPhoto — already submitting, ignoring");
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setUploadError(null);
    setSubmitError(null);
    let finalAvatarUrl = "";

    try {
      if (!skip && avatarFile) {
        const url = await uploadPhoto();
        if (url) {
          finalAvatarUrl = url;
          setForm((f) => ({ ...f, avatarUrl: url }));
        }
      }

      // Submit profile
      setStep("submitting");
      await createProfile.mutateAsync({
        data: {
          firstName: form.firstName,
          lastName: form.lastName,
          school: form.school || null,
          teamId: form.teamId ? parseInt(form.teamId) : null,
          position: form.position || null,
          graduationYear: form.graduationYear ? parseInt(form.graduationYear) : null,
          avatarUrl: finalAvatarUrl || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setStep("reveal");
      triggerReveal();
    } catch (err) {
      console.log("[HH] advanceFromPhoto error:", err);
      setSubmitError("Something went wrong. Please try again.");
      setStep("photo");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      console.log("[HH] advanceFromPhoto done, isSubmitting reset to false");
    }
  }

  function triggerReveal() {
    setRevealPhase(0);
    setTimeout(() => setRevealPhase(1), 600);
    setTimeout(() => setRevealPhase(2), 2200);
    setTimeout(() => setRevealPhase(3), 3800);
  }

  function enterLeague() {
    if (user?.id) {
      localStorage.setItem(`hh_onboarding_${user.id}`, "done");
    }
    setLocation("/");
  }

  async function shareCard() {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}profiles/${user?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Homegrown Hoops Card", url });
      } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  if (!isLoaded || profileLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // WALKTHROUGH
  // ──────────────────────────────────────────────────
  if (step === "walkthrough") {
    return (
      <Walkthrough
        onClose={() => {
          if (user?.id) localStorage.setItem(`hh_onboarding_${user.id}`, "done");
          setLocation("/");
        }}
        afterClose={() => setLocation("/")}
      />
    );
  }

  // ──────────────────────────────────────────────────
  // CARD REVEAL
  // ──────────────────────────────────────────────────
  if (step === "reveal") {
    const cardProfile = {
      firstName: form.firstName,
      lastName: form.lastName,
      school: form.school || null,
      archetype: "Uncharted",
      stamps: [],
      tides: [],
    };
    const teamData = teams?.find((t) => t.id.toString() === form.teamId);

    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 50% 100%, hsl(22 78% 12% / 0.6), hsl(222 42% 5%) 70%)" }}
      >
        {/* Phase 1 — opening text */}
        <div
          className="text-center mb-6 transition-all duration-1000"
          style={{ opacity: revealPhase >= 1 ? 1 : 0, transform: revealPhase >= 1 ? "translateY(0)" : "translateY(12px)" }}
        >
          <p className="text-white/50 text-lg font-medium tracking-wide">
            Every player starts the same way.
          </p>
        </div>

        {/* Phase 2 — Uncharted badge */}
        <div
          className="flex items-center gap-3 mb-10 transition-all duration-1000"
          style={{
            opacity: revealPhase >= 2 ? 1 : 0,
            transform: revealPhase >= 2 ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
            transitionDelay: "0s",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#94A3B820", boxShadow: "0 0 30px #94A3B830" }}
          >
            <Compass className="h-6 w-6 text-slate-400" />
          </div>
          <span
            className="font-display text-4xl text-slate-300"
            style={{ letterSpacing: "0.04em" }}
          >
            UNCHARTED.
          </span>
        </div>

        {/* Phase 3 — Player card */}
        <div
          className="w-full max-w-xs transition-all duration-1000"
          style={{
            opacity: revealPhase >= 3 ? 1 : 0,
            transform: revealPhase >= 3 ? "translateY(0)" : "translateY(60px)",
          }}
        >
          <PlayerCard
            profile={cardProfile}
            stats={{ avgPoints: 0, avgRebounds: 0, avgAssists: 0 }}
            primaryColor={teamData?.primaryColor ?? "#B45309"}
            secondaryColor={teamData?.secondaryColor ?? "#1E3A5F"}
          />
        </div>

        {/* Phase 3 — caption + buttons */}
        <div
          className="mt-8 flex flex-col items-center gap-5 transition-all duration-700"
          style={{ opacity: revealPhase >= 3 ? 1 : 0 }}
        >
          <p className="text-white/50 text-sm text-center max-w-xs leading-relaxed">
            Your card will update after every game. Earn Stamps. Earn your Archetype. Build your Legacy.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={shareCard}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors"
            >
              Share My Card
            </button>
            <button
              onClick={enterLeague}
              className="flex-1 btn-primary justify-center"
            >
              Enter the League <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setStep("walkthrough")}
            className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2 mt-1"
          >
            How It Works →
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // WELCOME
  // ──────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6"
        style={{ background: "radial-gradient(ellipse at 50% 60%, hsl(22 78% 16% / 0.4), hsl(222 42% 5%) 70%)" }}
      >
        <div className="flex flex-col items-center gap-10 text-center" style={{ animation: "fadeUp 0.8s ease both" }}>
          {/* Logo — pulses once */}
          <div style={{ animation: "pulseBig 1.2s ease 0.2s 1 both" }}>
            <HomegrownHoopsLogo size="lg" />
          </div>

          <p
            className="text-white/70 text-xl font-medium tracking-wide"
            style={{ animation: "fadeUp 0.8s ease 0.6s both" }}
          >
            Your legacy starts here.
          </p>

          <button
            onClick={() => setStep("name")}
            className="btn-primary text-base px-8 py-3.5 mt-2"
            style={{ animation: "fadeUp 0.8s ease 1s both" }}
          >
            Build My Profile <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <style>{`
          @keyframes pulseBig {
            0%   { transform: scale(0.9); opacity: 0; }
            50%  { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // PROFILE STEPS
  // ──────────────────────────────────────────────────
  const currentStepIdx = stepIndex(step);

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(22 78% 12% / 0.3), hsl(222 42% 5%) 60%)" }}
    >
      {/* Progress bar */}
      <div className="flex items-center justify-center pt-8 pb-4 px-4 gap-2">
        {PROFILE_STEPS.map((s, i) => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === currentStepIdx ? "32px" : "12px",
              backgroundColor: i <= currentStepIdx ? "hsl(22, 78%, 46%)" : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm" style={{ animation: "fadeUp 0.5s ease both" }}>

          {/* ── NAME ── */}
          {step === "name" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 1 of 5</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  WHAT'S YOUR NAME?
                </h2>
              </div>
              <div className="space-y-3">
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  autoFocus
                  placeholder="First name"
                  className="onboarding-input"
                />
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="onboarding-input"
                />
              </div>
              <button
                onClick={() => { if (form.firstName && form.lastName) setStep("school"); }}
                disabled={!form.firstName || !form.lastName}
                className="btn-primary w-full justify-center py-3.5 text-base"
              >
                Next <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* ── SCHOOL / TEAM ── */}
          {step === "school" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 2 of 5</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  WHAT SCHOOL DO YOU PLAY FOR?
                </h2>
              </div>
              <div className="space-y-3">
                <input
                  name="school"
                  value={form.school}
                  onChange={handleChange}
                  autoFocus
                  placeholder="School name (e.g. Citadel High)"
                  className="onboarding-input"
                />
                <select
                  name="teamId"
                  value={form.teamId}
                  onChange={handleChange}
                  className="onboarding-input"
                >
                  <option value="">Select your team (optional)</option>
                  {teams?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.city}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/30 font-medium leading-relaxed">
                  Not sure? An admin can assign your team after you join.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("name")}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("position")}
                  className="flex-[2] btn-primary justify-center py-3.5 text-base"
                >
                  Next <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── POSITION ── */}
          {step === "position" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 3 of 5</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  WHAT POSITION DO YOU PLAY?
                </h2>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm((f) => ({ ...f, position: f.position === p ? "" : p }))}
                    className={`py-4 rounded-xl text-sm font-display transition-all ${
                      form.position === p
                        ? "bg-primary text-white shadow-[0_0_20px_hsl(22_78%_46%_/_40%)]"
                        : "border border-white/15 text-white/60 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("school")}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("year")}
                  className="flex-[2] btn-primary justify-center py-3.5 text-base"
                >
                  Next <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── GRADUATION YEAR ── */}
          {step === "year" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 4 of 5</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  WHAT YEAR DO YOU GRADUATE?
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GRAD_YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setForm((f) => ({ ...f, graduationYear: f.graduationYear === y.toString() ? "" : y.toString() }))}
                    className={`py-4 rounded-xl text-lg font-display transition-all ${
                      form.graduationYear === y.toString()
                        ? "bg-primary text-white shadow-[0_0_20px_hsl(22_78%_46%_/_40%)]"
                        : "border border-white/15 text-white/60 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("position")}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("photo")}
                  className="flex-[2] btn-primary justify-center py-3.5 text-base"
                >
                  Next <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── PHOTO ── */}
          {step === "photo" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 5 of 5</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  ADD A PHOTO
                </h2>
                <p className="text-white/40 text-sm mt-2 font-medium">Optional — you can skip this.</p>
              </div>

              <PhotoPicker
                preview={avatarPreview}
                onFileChange={handleFileChange}
                onClear={() => { setAvatarPreview(null); setAvatarFile(null); }}
              />

              {uploadError && (
                <p className="text-red-400 text-sm font-medium">{uploadError}</p>
              )}
              {submitError && (
                <p className="text-red-400 text-sm font-medium">{submitError}</p>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                {/* SKIP button */}
                <button
                  type="button"
                  onTouchEnd={(e) => {
                    console.log("[HH] Skip onTouchEnd fired, isSubmitting:", isSubmittingRef.current);
                    e.preventDefault();
                    advanceFromPhoto(true);
                  }}
                  onClick={() => {
                    console.log("[HH] Skip onClick fired, isSubmitting:", isSubmittingRef.current);
                    advanceFromPhoto(true);
                  }}
                  style={{
                    flex: 1,
                    padding: "14px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: isSubmitting ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                >
                  {isSubmitting ? "…" : "Skip"}
                </button>

                {/* CREATE MY CARD button — no btn-primary, pure inline styles */}
                <button
                  type="button"
                  onTouchEnd={(e) => {
                    console.log("[HH] CreateMyCard onTouchEnd fired, isSubmitting:", isSubmittingRef.current, "avatarFile:", !!avatarFile);
                    e.preventDefault();
                    advanceFromPhoto(false);
                  }}
                  onClick={() => {
                    console.log("[HH] CreateMyCard onClick fired, isSubmitting:", isSubmittingRef.current, "avatarFile:", !!avatarFile);
                    advanceFromPhoto(false);
                  }}
                  style={{
                    flex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "14px 12px",
                    borderRadius: 12,
                    border: "none",
                    background: isSubmitting ? "hsl(22, 60%, 36%)" : "hsl(22, 78%, 46%)",
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.04em",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: "background 0.2s, opacity 0.2s",
                  }}
                >
                  {isSubmitting ? "Creating…" : "Create My Card"}
                  {!isSubmitting && <ArrowRight style={{ width: 18, height: 18, flexShrink: 0 }} />}
                </button>
              </div>
            </div>
          )}

          {/* ── SUBMITTING ── */}
          {step === "submitting" && (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white/50 text-sm font-medium">Building your card…</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .onboarding-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          font-weight: 500;
          color: white;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .onboarding-input::placeholder { color: rgba(255,255,255,0.25); }
        .onboarding-input:focus {
          border-color: hsl(22, 78%, 46%);
          box-shadow: 0 0 0 3px hsl(22 78% 46% / 20%);
        }
        .onboarding-input option { background: hsl(220, 36%, 10%); }
      `}</style>
    </div>
  );
}

function PhotoPicker({
  preview,
  onFileChange,
  onClear,
}: {
  preview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  // The <input> stays in the DOM at ALL times — never unmounted.
  // On iOS Safari, unmounting a file input after the picker closes leaves
  // residual touch state that swallows subsequent taps on nearby elements.
  return (
    <div style={{ position: "relative" }}>
      {/* Always-present hidden file input */}
      <input
        id="hh-avatar-upload"
        type="file"
        accept="image/*"
        onChange={(e) => {
          console.log("[HH] PhotoPicker file input onChange, files:", e.target.files?.length);
          onFileChange(e);
          // Reset so the same file can be re-selected
          e.target.value = "";
        }}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
        tabIndex={-1}
      />

      {preview ? (
        /* Preview state */
        <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto" }}>
          <img
            src={preview}
            alt="Preview"
            style={{ width: 160, height: 160, borderRadius: 16, objectFit: "cover", border: "2px solid hsl(22, 78%, 46%)", display: "block" }}
          />
          <button
            type="button"
            onTouchEnd={(e) => {
              console.log("[HH] PhotoPicker clear onTouchEnd");
              e.preventDefault();
              onClear();
            }}
            onClick={() => {
              console.log("[HH] PhotoPicker clear onClick");
              onClear();
            }}
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#ef4444",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ) : (
        /* Upload label — triggers the always-present input above */
        <label
          htmlFor="hh-avatar-upload"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "40px 16px",
            borderRadius: 16,
            border: "1.5px dashed rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera style={{ width: 24, height: 24 }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Tap to add a photo</p>
            <p style={{ fontSize: 12, marginTop: 4, opacity: 0.6, marginBottom: 0 }}>JPG, PNG up to 10MB</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "hsl(22, 78%, 52%)", fontSize: 12, fontWeight: 700 }}>
            <Upload style={{ width: 14, height: 14 }} /> Choose File
          </div>
        </label>
      )}
    </div>
  );
}
