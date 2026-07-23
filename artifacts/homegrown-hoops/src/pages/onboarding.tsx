import React, { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetMyProfile,
  useCreateMyProfile,
  useListTeams,
  useListPlayers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, Camera, Compass, X, Upload, Gamepad2, Users, ClipboardList, Clock } from "lucide-react";
import { HomegrownHoopsLogo } from "@/components/logo";
import { PlayerCard } from "@/components/player-card";
import { Walkthrough } from "@/components/walkthrough";
import { AvatarCreator } from "@/components/AvatarCreator";
import type { AvatarConfig } from "@/lib/avatarCanvas";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i - 1);

type Step =
  | "welcome"
  | "accountType"
  | "name"
  | "school"
  | "position"
  | "number"
  | "year"
  | "photo"
  | "submitting"
  | "avatar"
  | "reveal"
  | "pendingReveal"
  | "ballers"
  | "walkthrough";

const PROFILE_STEPS: Step[] = ["name", "school", "position", "number", "year", "photo"];

const POSITION_LABELS: Record<string, string> = {
  PG: "POINT GUARD",
  SG: "SHOOTING GUARD",
  SF: "SMALL FORWARD",
  PF: "POWER FORWARD",
  C: "CENTER",
};

function stepIndex(step: Step): number {
  return PROFILE_STEPS.indexOf(step);
}

export function OnboardingPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });
  const { data: teams } = useListTeams({ query: { enabled: isSignedIn === true } });
  const { data: allPlayers } = useListPlayers(undefined, { query: { enabled: isSignedIn === true } });
  const createProfile = useCreateMyProfile();

  // ── ALL useState / useRef declarations come first ──────────────────────────
  // This order is required: const/let bindings are in TDZ until their
  // declaration runs, so any useEffect that references them in its dependency
  // array would throw "Cannot access uninitialized variable" (fatal on Safari)
  // if those declarations appeared AFTER the useEffect call.
  const [step, setStep] = useState<Step>("welcome");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    school: "",
    teamId: "",
    position: "",
    jerseyNumber: "",
    graduationYear: "",
    avatarUrl: "",
    accountType: "" as "" | "player" | "parent" | "manager",
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
  const [showColorWash, setShowColorWash] = useState(false);
  const [introPhase, setIntroPhase] = useState(0); // 0=hidden 1=team 2=pos+num 3=name 4=fade-out
  // Prevents redirect-on-profile-load from firing right after we just created
  // the profile (must be declared before the useEffect that references it)
  const [justCreated, setJustCreated] = useState(false);
  const [pendingAvatarConfig, setPendingAvatarConfig] = useState<AvatarConfig | null>(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [pendingBallers, setPendingBallers] = useState<number[]>([]);
  const [ballerSearch, setBallerSearch] = useState("");

  // ── Effects ────────────────────────────────────────────────────────────────

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn, setLocation]);

  // Redirect if already has a profile (onboarding already done).
  // Skip redirect when justCreated=true — we want to show the reveal instead.
  useEffect(() => {
    if (!profileLoading && profile && !justCreated) setLocation("/");
  }, [profileLoading, profile, justCreated, setLocation]);

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

  async function advanceFromPhoto(skip: boolean, overrideAvatarConfig?: AvatarConfig) {
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
        } else {
          // Upload failed — clear file so a retry won't re-attempt it,
          // show a friendly message, and bail out so the user sees the
          // photo step (not the loading screen) with the error visible.
          setAvatarFile(null);
          setAvatarPreview(null);
          setUploadError(
            "Photo upload failed — you can add a photo later in your profile settings."
          );
          return; // finally block will reset isSubmitting
        }
      }

      // Lock in — prevent the "already has profile" redirect from firing
      setJustCreated(true);
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
          number: form.jerseyNumber || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      const avatarConfigToSave = overrideAvatarConfig ?? pendingAvatarConfig;
      if (avatarConfigToSave) {
        try {
          const token = await getToken();
          await fetch("/api/profiles/me/avatar-config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ avatarConfig: avatarConfigToSave }),
          });
          await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
        } catch {
          // non-fatal — avatar can be set later from profile page
        }
      }
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

  async function handlePendingSubmit() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setJustCreated(true);
    try {
      await createProfile.mutateAsync({
        data: {
          firstName: form.firstName,
          lastName: form.lastName,
          requestedRole: form.accountType as "parent" | "manager",
          ...(form.accountType === "parent" && pendingBallers.length > 0
            ? { myBallers: pendingBallers }
            : {}),
        },
      });
      await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setStep("pendingReveal");
    } catch (err) {
      console.log("[HH] handlePendingSubmit error:", err);
      setSubmitError("Something went wrong. Please try again.");
      setStep("name");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function triggerReveal() {
    setRevealPhase(0);
    setShowColorWash(false);
    setIntroPhase(0);
    setTimeout(() => setRevealPhase(1), 600);        // "Every player starts the same way"
    setTimeout(() => setRevealPhase(2), 2200);       // UNCHARTED badge
    setTimeout(() => setShowColorWash(true), 2900);  // team color wash sweeps across
    setTimeout(() => setIntroPhase(1), 4000);        // lineup intro: team name
    setTimeout(() => setIntroPhase(2), 5000);        // lineup intro: position + jersey
    setTimeout(() => setIntroPhase(3), 6000);        // lineup intro: full name (the big moment)
    setTimeout(() => { setIntroPhase(4); setRevealPhase(3); }, 8100); // intro out + card in
    setTimeout(() => setRevealPhase(4), 9700);       // CTA buttons
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
  // SUBMITTING — full-screen cinematic loading
  // Triggers immediately on tap (isSubmitting=true) so the photo-upload phase
  // is also covered — not just the API call phase.
  // ──────────────────────────────────────────────────
  if (isSubmitting || step === "submitting") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "hsl(222, 42%, 4%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          zIndex: 50,
        }}
      >
        {/* Orange ring spinner */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "3px solid rgba(249,115,22,0.15)",
            borderTopColor: "#F97316",
            animation: "spinCard 0.9s linear infinite",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.85)",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Building your card…
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
            One moment
          </p>
        </div>
        <style>{`
          @keyframes spinCard {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // CARD REVEAL — cinematic 4-phase sequence
  // ──────────────────────────────────────────────────
  if (step === "reveal") {
    const cardProfile = {
      firstName: form.firstName,
      lastName: form.lastName,
      school: form.school || null,
      archetype: "Uncharted",
      avatarUrl: form.avatarUrl || null,
      stamps: [] as { id: string; earnedAt: string }[],
      tides: [] as { id: string; earnedAt: string }[],
      number: form.jerseyNumber || null,
    };
    const teamData = teams?.find((t) => t.id.toString() === form.teamId);

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          overflow: "hidden",
          background: "hsl(222, 42%, 4%)",
          position: "relative",
        }}
      >
        {/* Background glow — fades in with phase 1, uses team primary color */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 75%, ${teamData?.primaryColor ?? "#F97316"}30, transparent 60%)`,
            opacity: revealPhase >= 1 ? 1 : 0,
            transition: "opacity 2s ease",
            pointerEvents: "none",
          }}
        />

        {/* Color wash — cinematic sweep between UNCHARTED reveal and card appear */}
        <style>{`
          @keyframes hghColorWash {
            0%   { transform: translateX(-130%) skewX(-6deg); opacity: 0; }
            12%  { opacity: 1; }
            45%  { transform: translateX(-5%) skewX(-3deg); opacity: 0.92; }
            72%  { transform: translateX(15%) skewX(0deg); opacity: 0.7; }
            100% { transform: translateX(130%) skewX(4deg); opacity: 0; }
          }
          @keyframes hghTeamSlide {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes hghInfoSlide {
            from { opacity: 0; transform: translateY(18px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes hghNameBoom {
            0%   { opacity: 0; transform: scale(1.18) translateY(-16px); filter: blur(8px); }
            45%  { opacity: 1; filter: blur(0px); }
            68%  { transform: scale(0.97) translateY(5px); }
            84%  { transform: scale(1.02) translateY(-2px); }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes hghSpotPulse {
            0%, 100% { opacity: 0.55; transform: scale(1); }
            50%      { opacity: 0.85; transform: scale(1.08); }
          }
        `}</style>
        {showColorWash && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 8,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-20%",
                width: "140%",
                background: `linear-gradient(to right,
                  transparent 0%,
                  ${teamData?.primaryColor ?? "#F97316"}55 28%,
                  ${teamData?.primaryColor ?? "#F97316"}cc 50%,
                  ${teamData?.primaryColor ?? "#F97316"}55 72%,
                  transparent 100%)`,
                animation: "hghColorWash 1.9s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              }}
            />
          </div>
        )}

        {/* ── LINEUP INTRO OVERLAY ── */}
        {introPhase >= 1 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 15,
              pointerEvents: "none",
              background: "rgba(10, 16, 28, 0.97)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              padding: "0 24px",
              opacity: introPhase >= 4 ? 0 : 1,
              transition: introPhase >= 4 ? "opacity 1s ease" : "none",
            }}
          >
            {/* Top rule */}
            <div style={{
              width: 48,
              height: 2,
              background: teamData?.primaryColor ?? "#F97316",
              marginBottom: 28,
              opacity: 0.7,
            }} />

            {/* Team name */}
            <div style={{
              textAlign: "center",
              animation: "hghTeamSlide 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
              marginBottom: 20,
            }}>
              <p style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: 8,
                fontFamily: "inherit",
              }}>
                Now entering the court
              </p>
              <p style={{
                fontFamily: "'Barlow Condensed', Impact, sans-serif",
                fontSize: 24,
                fontWeight: 700,
                color: teamData?.primaryColor ?? "#F97316",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                {teamData?.name ?? "Homegrown Hoops"}
              </p>
            </div>

            {/* Position + jersey number */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 36,
              opacity: introPhase >= 2 ? 1 : 0,
              transform: introPhase >= 2 ? "translateY(0)" : "translateY(14px)",
              transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
            }}>
              {form.position && (
                <span style={{
                  fontFamily: "'Barlow Condensed', Impact, sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}>
                  {POSITION_LABELS[form.position] ?? form.position}
                </span>
              )}
              {form.position && form.jerseyNumber && (
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>·</span>
              )}
              {form.jerseyNumber && (
                <span style={{
                  fontFamily: "'Barlow Condensed', Impact, sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: teamData?.primaryColor ?? "#F97316",
                  letterSpacing: "0.06em",
                }}>
                  #{form.jerseyNumber}
                </span>
              )}
            </div>

            {/* Full name — the big moment */}
            <div style={{ position: "relative", textAlign: "center" }}>
              {/* Spotlight glow */}
              {introPhase >= 3 && (
                <div style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "140%",
                  height: "200%",
                  background: `radial-gradient(ellipse at center, ${teamData?.primaryColor ?? "#F97316"}35 0%, transparent 65%)`,
                  filter: "blur(28px)",
                  zIndex: -1,
                  animation: "hghSpotPulse 2.4s ease-in-out infinite",
                }} />
              )}
              <p style={{
                fontFamily: "'Barlow Condensed', Impact, sans-serif",
                fontSize: "clamp(58px, 15vw, 100px)",
                fontWeight: 900,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                lineHeight: 0.88,
                margin: 0,
                textShadow: introPhase >= 3
                  ? `0 0 40px rgba(255,255,255,0.25), 0 0 80px ${teamData?.primaryColor ?? "#F97316"}30`
                  : "none",
                opacity: introPhase >= 3 ? 1 : 0,
                animation: introPhase >= 3 ? "hghNameBoom 0.75s cubic-bezier(0.16,1,0.3,1) forwards" : "none",
              }}>
                {form.firstName.toUpperCase()}
              </p>
              <p style={{
                fontFamily: "'Barlow Condensed', Impact, sans-serif",
                fontSize: "clamp(58px, 15vw, 100px)",
                fontWeight: 900,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                lineHeight: 0.88,
                margin: "0.05em 0 0",
                textShadow: introPhase >= 3
                  ? `0 0 40px rgba(255,255,255,0.25), 0 0 80px ${teamData?.primaryColor ?? "#F97316"}30`
                  : "none",
                opacity: introPhase >= 3 ? 1 : 0,
                animation: introPhase >= 3 ? "hghNameBoom 0.75s 0.12s cubic-bezier(0.16,1,0.3,1) forwards" : "none",
              }}>
                {form.lastName.toUpperCase()}
              </p>
            </div>

            {/* Bottom rule */}
            <div style={{
              width: 48,
              height: 2,
              background: teamData?.primaryColor ?? "#F97316",
              marginTop: 28,
              opacity: 0.7,
            }} />
          </div>
        )}

        {/* Phase 1 — opening text */}
        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textAlign: "center",
            marginBottom: 20,
            opacity: revealPhase >= 1 ? 1 : 0,
            transform: revealPhase >= 1 ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 1.8s ease, transform 1.8s ease",
          }}
        >
          Every player starts the same way.
        </p>

        {/* Phase 2 — UNCHARTED badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 40,
            opacity: revealPhase >= 2 ? 1 : 0,
            transform: revealPhase >= 2 ? "translateY(0) scale(1)" : "translateY(14px) scale(0.88)",
            transition: "opacity 1.6s ease, transform 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#94A3B812",
              border: "1.5px solid #94A3B840",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 36px #94A3B830",
            }}
          >
            <Compass style={{ width: 26, height: 26, color: "#94A3B8" }} />
          </div>
          <span
            style={{
              fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
              fontSize: 42,
              fontWeight: 800,
              color: "#CBD5E1",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Uncharted.
          </span>
        </div>

        {/* Phase 3 — Player card sliding up */}
        <div
          style={{
            width: "100%",
            maxWidth: 320,
            opacity: revealPhase >= 3 ? 1 : 0,
            transform: revealPhase >= 3 ? "translateY(0) scale(1)" : "translateY(110px) scale(0.85)",
            transition: "opacity 1.4s ease, transform 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <PlayerCard
            profile={cardProfile}
            stats={{ avgPoints: 0, avgRebounds: 0, avgAssists: 0 }}
            primaryColor={teamData?.primaryColor ?? "#B45309"}
            secondaryColor={teamData?.secondaryColor ?? "#1E3A5F"}
          />
        </div>

        {/* Phase 3 — caption + CTA buttons */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            width: "100%",
            maxWidth: 320,
            opacity: revealPhase >= 4 ? 1 : 0,
            transition: "opacity 1.2s ease 0.1s",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center", lineHeight: 1.6, margin: 0, letterSpacing: "0.01em" }}>
            Homegrown Hoops isn't about stat chasing. It is about your contribution. Every role matters here.
          </p>

          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
            Your card updates after every game. Earn Stamps, claim your Archetype, build your Legacy.
          </p>

          {/* ── Arcade callout ── */}
          <a
            href="/arcade"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              maxWidth: 320,
              padding: "14px 18px",
              borderRadius: 14,
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.35)",
              color: "inherit",
              textDecoration: "none",
              opacity: revealPhase >= 4 ? 1 : 0,
              transition: "opacity 1.2s ease 0.3s",
              cursor: "pointer",
            }}
            onClick={enterLeague}
          >
            <span style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(249,115,22,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Gamepad2 style={{ width: 20, height: 20, color: "#F97316" }} />
            </span>
            <span style={{ flex: 1, textAlign: "left" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Arcade</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                  background: "#F97316", color: "#fff",
                  padding: "1px 5px", borderRadius: 4, textTransform: "uppercase",
                }}>NEW</span>
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                Ball IQ quizzes, mini-games &amp; more
              </span>
            </span>
            <ArrowRight style={{ width: 15, height: 15, color: "rgba(249,115,22,0.6)", flexShrink: 0 }} />
          </a>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <button
              onClick={enterLeague}
              style={{
                width: "100%",
                padding: "15px 20px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #F97316, #B45309)",
                border: "none",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.03em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Enter the League <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
            <button
              onClick={shareCard}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Share My Card
            </button>
          </div>

          <button
            onClick={() => setStep("walkthrough")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.25)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              touchAction: "manipulation",
            }}
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
            onClick={() => setStep("accountType")}
            className="btn-primary text-base px-8 py-3.5 mt-2"
            style={{ animation: "fadeUp 0.8s ease 1s both" }}
          >
            Get Started <ArrowRight className="h-5 w-5" />
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
  // ACCOUNT TYPE SELECTION
  // ──────────────────────────────────────────────────
  if (step === "accountType") {
    const options: { id: "player" | "parent" | "manager"; icon: React.ReactNode; label: string; sub: string }[] = [
      {
        id: "player",
        icon: <span style={{ fontSize: 28 }}>🏀</span>,
        label: "Player",
        sub: "I play in the league — track my stats and build my legacy",
      },
      {
        id: "parent",
        icon: <Users style={{ width: 26, height: 26, color: "#F97316" }} />,
        label: "Parent",
        sub: "I support a player — follow their journey and stats",
      },
      {
        id: "manager",
        icon: <ClipboardList style={{ width: 26, height: 26, color: "#F97316" }} />,
        label: "Manager / Coach",
        sub: "I manage or coach a team — I'll track games and submit stats",
      },
    ];

    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6"
        style={{ background: "radial-gradient(ellipse at 50% 60%, hsl(22 78% 16% / 0.4), hsl(222 42% 5%) 70%)" }}
      >
        <div className="w-full max-w-sm" style={{ animation: "fadeUp 0.5s ease both" }}>
          <p className="label-upper text-xs text-primary mb-2">Who are you?</p>
          <h2 className="font-display text-4xl text-white leading-tight mb-8">
            SELECT YOUR<br />ACCOUNT TYPE
          </h2>

          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setForm((f) => ({ ...f, accountType: opt.id }));
                  setStep("name");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 20px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "rgba(249,115,22,0.12)",
                  border: "1px solid rgba(249,115,22,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {opt.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{opt.label}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{opt.sub}</p>
                </div>
                <ArrowRight style={{ width: 16, height: 16, color: "rgba(249,115,22,0.6)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
          {submitError && (
            <p className="text-red-400 text-sm mt-4 text-center">{submitError}</p>
          )}
        </div>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // PENDING APPROVAL SCREEN
  // ──────────────────────────────────────────────────
  if (step === "pendingReveal") {
    const isPendingManager = form.accountType === "manager";
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center px-6"
        style={{ background: "radial-gradient(ellipse at 50% 60%, hsl(22 78% 16% / 0.4), hsl(222 42% 5%) 70%)" }}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center" style={{ animation: "fadeUp 0.8s ease both" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "rgba(249,115,22,0.12)",
            border: "1.5px solid rgba(249,115,22,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clock style={{ width: 34, height: 34, color: "#F97316" }} />
          </div>

          <div>
            <h2 className="font-display text-4xl text-white leading-tight mb-3">
              YOU'RE ON<br />DECK
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.6 }}>
              Your {isPendingManager ? "Manager / Coach" : "Parent"} account is pending approval.
              An admin will review your application and activate your access.
            </p>
          </div>

          {isPendingManager && (
            <div style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 12,
              background: "rgba(249,115,22,0.06)",
              border: "1px solid rgba(249,115,22,0.2)",
              textAlign: "left",
            }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                Once approved, you'll be able to track games and submit stats for any team.
              </p>
            </div>
          )}

          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            You can sign back in at any time to check your status.
          </p>

          <button
            onClick={enterLeague}
            style={{
              width: "100%",
              padding: "15px 20px",
              borderRadius: 14,
              background: "linear-gradient(135deg, #F97316, #B45309)",
              border: "none",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            View the League <ArrowRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // AVATAR STEP (pre-submit — avatar stored in state, saved after profile creation)
  // ──────────────────────────────────────────────────
  if (step === "avatar") {
    return (
      <div
        className="min-h-[100dvh] flex flex-col"
        style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(22 78% 12% / 0.3), hsl(222 42% 5%) 60%)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 20px 8px" }}>
          <button
            type="button"
            onClick={() => setStep("photo")}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "hsl(22,78%,52%)", margin: 0 }}>
              Optional
            </p>
            <h2 style={{ fontFamily: "'Anton','Barlow Condensed',Impact,sans-serif", fontSize: "clamp(22px,6vw,28px)", fontWeight: 900, color: "#fff", lineHeight: 1.05, margin: 0, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              Design Your Baller
            </h2>
          </div>
        </div>

        {/* Scrollable creator */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <AvatarCreator
            initialConfig={pendingAvatarConfig}
            onConfigReady={(config) => {
              setPendingAvatarConfig(config);
              void advanceFromPhoto(false, config);
            }}
          />
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // BALLERS STEP (parent only — pick which players are their kids)
  // ──────────────────────────────────────────────────
  if (step === "ballers") {
    const lc = ballerSearch.toLowerCase();
    const filtered = (allPlayers ?? []).filter(
      (p) =>
        !p.isJerseyStub &&
        (`${p.firstName} ${p.lastName}`.toLowerCase().includes(lc))
    );
    return (
      <div
        className="min-h-[100dvh] flex flex-col"
        style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(22 78% 12% / 0.3), hsl(222 42% 5%) 60%)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 20px 8px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setStep("name")}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
              color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "hsl(22,78%,52%)", margin: 0 }}>
              Optional
            </p>
            <h2 style={{ fontFamily: "'Anton','Barlow Condensed',Impact,sans-serif", fontSize: "clamp(22px,6vw,28px)", fontWeight: 900, color: "#fff", lineHeight: 1.05, margin: 0, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              Who Are Your Ballers?
            </h2>
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, padding: "0 20px 12px", margin: 0, flexShrink: 0 }}>
          Select the players you're here to support. You can always update this later.
        </p>

        {/* Search */}
        <div style={{ padding: "0 20px 12px", flexShrink: 0 }}>
          <input
            value={ballerSearch}
            onChange={(e) => setBallerSearch(e.target.value)}
            placeholder="Search by name…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 16px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff", fontSize: 14, fontWeight: 500, outline: "none",
            }}
          />
        </div>

        {/* Player list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {filtered.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "center", marginTop: 40 }}>
              {allPlayers?.length === 0 ? "No registered players yet." : "No players match your search."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16 }}>
              {filtered.map((player) => {
                const selected = pendingBallers.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setPendingBallers((prev) =>
                        prev.includes(player.id)
                          ? prev.filter((id) => id !== player.id)
                          : [...prev, player.id]
                      );
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 14, border: "none",
                      background: selected ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                      outline: selected ? "1.5px solid hsl(22,78%,50%)" : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* Avatar circle */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: selected ? "hsl(22,78%,30%)" : "rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 16 }}>🏀</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: selected ? "hsl(22,78%,75%)" : "#fff", margin: 0, lineHeight: 1.2 }}>
                        {player.firstName} {player.lastName}
                        {player.number && <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 12, marginLeft: 6 }}>#{player.number}</span>}
                      </p>
                      {player.position && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {player.position}
                        </p>
                      )}
                    </div>
                    {/* Checkmark */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      background: selected ? "hsl(22,78%,46%)" : "rgba(255,255,255,0.08)",
                      border: selected ? "none" : "1.5px solid rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 13, fontWeight: 900,
                    }}>
                      {selected && "✓"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "16px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {pendingBallers.length > 0 && (
            <p style={{ textAlign: "center", fontSize: 13, color: "hsl(22,78%,65%)", margin: 0, fontWeight: 600 }}>
              {pendingBallers.length} baller{pendingBallers.length !== 1 ? "s" : ""} selected
            </p>
          )}
          <button
            type="button"
            onClick={() => { void handlePendingSubmit(); }}
            disabled={isSubmitting}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 14,
              background: "linear-gradient(135deg, #F97316, #B45309)",
              border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
              letterSpacing: "0.03em", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Submitting…" : pendingBallers.length > 0 ? "Request Access →" : "Request Access →"}
            {!isSubmitting && <ArrowRight style={{ width: 18, height: 18 }} />}
          </button>
          <button
            type="button"
            onClick={() => { setPendingBallers([]); void handlePendingSubmit(); }}
            disabled={isSubmitting}
            style={{
              width: "100%", padding: "10px 20px", borderRadius: 14,
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Skip — I'll add ballers later
          </button>
        </div>
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

      <div className={`flex-1 flex flex-col items-center px-6 py-8 ${step === "photo" ? "justify-start overflow-y-auto" : "justify-center"}`}>
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
              {submitError && (
                <p className="text-red-400 text-sm text-center">{submitError}</p>
              )}
              <button
                onClick={() => {
                  if (!form.firstName || !form.lastName) return;
                  if (form.accountType === "parent") {
                    setStep("ballers");
                  } else if (form.accountType === "manager") {
                    void handlePendingSubmit();
                  } else {
                    setStep("school");
                  }
                }}
                disabled={!form.firstName || !form.lastName || isSubmitting}
                className="btn-primary w-full justify-center py-3.5 text-base"
              >
                {isSubmitting ? "Submitting…" : form.accountType === "manager" ? "Request Access" : "Next"}
                {!isSubmitting && <ChevronRight className="h-5 w-5" />}
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
                <p className="label-upper text-xs text-primary mb-2">Step 3 of 6</p>
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
                  onClick={() => setStep("number")}
                  className="flex-[2] btn-primary justify-center py-3.5 text-base"
                >
                  Next <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── JERSEY NUMBER ── */}
          {step === "number" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 4 of 6</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  JERSEY NUMBER
                </h2>
                <p className="text-white/40 text-sm mt-2 font-medium">Optional — skip if you don't have one yet.</p>
              </div>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="e.g. 23"
                  value={form.jerseyNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm((f) => ({ ...f, jerseyNumber: val }));
                  }}
                  className="w-full bg-transparent border border-white/15 rounded-xl px-5 py-5 text-white text-center font-display text-5xl placeholder:text-white/20 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all tracking-wider"
                />
                {form.jerseyNumber && (
                  <p className="text-center text-white/40 text-sm mt-3 font-medium">
                    #{form.jerseyNumber}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("position")}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("year")}
                  className="flex-[2] btn-primary justify-center py-3.5 text-base"
                >
                  {form.jerseyNumber ? "Next" : "Skip"} <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* ── GRADUATION YEAR ── */}
          {step === "year" && (
            <div className="space-y-6">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 5 of 6</p>
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
                  onClick={() => setStep("number")}
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
            <div className="space-y-5">
              <div>
                <p className="label-upper text-xs text-primary mb-2">Step 6 of 6</p>
                <h2 className="font-display text-4xl text-white leading-tight">
                  ADD YOUR LOOK
                </h2>
                <p className="text-white/40 text-sm mt-2 font-medium">Both optional — add what you like.</p>
              </div>

              {/* Avatar CTA — shown first so it's always above the fold */}
              <button
                type="button"
                onClick={() => setStep("avatar")}
                style={{
                  width: "100%",
                  padding: "16px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "hsl(22,78%,46%)",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase" as const,
                  boxShadow: "0 4px 20px hsl(22 78% 46% / 35%)",
                }}
              >
                🎮 Create My Avatar
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: 600 }}>or add a photo</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
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
