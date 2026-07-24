import { useState, useEffect } from "react";
import { useSignUp, useClerk } from "@clerk/react";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const LS_KEY = "hh_su_state";

function saveState(email: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ email, ts: Date.now() }));
  } catch {}
}

function clearState() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

function loadState(): { email: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email: string; ts: number };
    // Discard stale state older than 20 minutes
    if (Date.now() - parsed.ts > 20 * 60 * 1000) {
      clearState();
      return null;
    }
    return { email: parsed.email };
  } catch {
    return null;
  }
}

export function CustomSignUpPage() {
  const { signUp } = useSignUp();
  const { setActive } = useClerk();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"form" | "verify" | "link-sent">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSavedState, setHasSavedState] = useState(false);
  const [consented, setConsented] = useState(false);
  const [legalModal, setLegalModal] = useState<{ url: string; title: string } | null>(null);

  // ── Auto-restore: if Clerk still has a pending verification and we have a
  //    saved email in localStorage, jump straight to the code entry screen.
  //    This covers the "user switched to Mail app and came back" scenario.
  useEffect(() => {
    if (!signUp) return;
    if (step !== "form") return;

    const pendingEmailVerification =
      signUp.status === "missing_requirements" &&
      (signUp.unverifiedFields as string[]).includes("email_address");

    const saved = loadState();

    if (pendingEmailVerification && saved?.email) {
      setEmail(saved.email);
      setStep("verify");
      return;
    }

    // Even if Clerk state is gone, show the "Already have a code?" hint
    setHasSavedState(!!saved);
  }, [signUp, step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!signUp) {
      setError("Still loading — please try again in a moment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const created = await signUp.create({ emailAddress: email, password });
      await created.prepareEmailAddressVerification({ strategy: "email_code" });
      saveState(email);
      setStep("verify");
    } catch (err: unknown) {
      const e2 = err as { errors?: { longMessage?: string }[]; message?: string };
      setError(e2.errors?.[0]?.longMessage ?? e2.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!signUp) {
      setError("Still loading — please try again in a moment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp.attemptEmailAddressVerification({ code });
      if (signUp.status === "complete") {
        clearState();
        if (setActive && signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
        }
        setLocation("/onboarding");
      } else {
        setError("Verification incomplete — please try again.");
      }
    } catch (err: unknown) {
      const e2 = err as { errors?: { longMessage?: string }[]; message?: string };
      setError(e2.errors?.[0]?.longMessage ?? e2.message ?? "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!signUp || loading) return;
    setError("");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      saveState(email);
    } catch {
      setError("Could not resend — please try again.");
    }
  }

  async function handleSendMagicLink() {
    if (!signUp || loading) return;
    setLoading(true);
    setError("");
    try {
      const { startEmailLinkFlow } = signUp.createEmailLinkFlow();
      saveState(email);
      setStep("link-sent");
      setLoading(false);
      // startEmailLinkFlow polls until the user clicks the link in their email
      const result = await startEmailLinkFlow({
        redirectUrl: `${window.location.origin}${basePath}/sign-in/sso-callback`,
      });
      if (result.status === "complete" && result.createdSessionId) {
        clearState();
        await setActive({ session: result.createdSessionId });
        setLocation("/onboarding");
      }
    } catch (err: unknown) {
      const e2 = err as { errors?: { longMessage?: string }[]; message?: string };
      setError(e2.errors?.[0]?.longMessage ?? e2.message ?? "Could not send magic link.");
      setLoading(false);
    }
  }

  function handleGoToVerify() {
    const saved = loadState();
    if (saved?.email) setEmail(saved.email);
    setCode("");
    setError("");
    setStep("verify");
  }

  function handleReset() {
    clearState();
    if (signUp) signUp.reset().catch(() => {});
    setStep("form");
    setCode("");
    setError("");
    setHasSavedState(false);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(222, 42%, 7%)",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <style>{`@keyframes su-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <a href={`${basePath}/`}>
            <img
              src={`${basePath}/logo.svg`}
              alt="Homegrown Hoops"
              style={{ height: 48, width: "auto" }}
            />
          </a>
        </div>

        <div
          style={{
            background: "hsl(220, 36%, 10%)",
            borderRadius: 16,
            padding: "32px 28px",
            border: "1px solid hsl(220, 28%, 17%)",
          }}
        >
          {/* ── STEP: form ───────────────────────────────────────────────── */}
          {step === "form" && (
            <>
              <h1 style={headingStyle}>Create Account</h1>
              <p style={subtitleStyle}>Free for the 2026 pilot season</p>

              {/* "Already have a code?" banner */}
              {hasSavedState && (
                <button
                  type="button"
                  onClick={handleGoToVerify}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid hsl(22, 78%, 38%)",
                    background: "hsla(22, 78%, 46%, 0.1)",
                    color: "hsl(22, 78%, 70%)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginBottom: 20,
                    textAlign: "left",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ fontSize: 18 }}>📬</span>
                  <span>
                    Already have a code?{" "}
                    <span style={{ textDecoration: "underline" }}>
                      Enter it here →
                    </span>
                  </span>
                </button>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="email" style={labelStyle}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="password" style={labelStyle}>
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    style={inputStyle}
                  />
                </div>

                {error && <ErrorBox message={error} />}

                {/* Legal consent checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 20,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      flexShrink: 0,
                      accentColor: "hsl(22, 78%, 46%)",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "hsl(215, 16%, 62%)",
                  }}>
                    I confirm that I am 18 or older, OR that I am a parent or guardian consenting on behalf of a minor player. I have read and agree to the{" "}
                    <button
                      type="button"
                      style={{ color: "hsl(22, 78%, 58%)", fontWeight: 600, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalModal({ url: `${basePath}/terms`, title: "Terms of Service" }); }}
                    >
                      Terms of Service
                    </button>
                    ,{" "}
                    <button
                      type="button"
                      style={{ color: "hsl(22, 78%, 58%)", fontWeight: 600, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalModal({ url: `${basePath}/privacy`, title: "Privacy Policy" }); }}
                    >
                      Privacy Policy
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      style={{ color: "hsl(22, 78%, 58%)", fontWeight: 600, textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLegalModal({ url: `${basePath}/terms#video-consent`, title: "Video and Image Consent" }); }}
                    >
                      Video and Image Consent
                    </button>
                    . I understand that player profiles and game footage are visible to registered users of the platform.
                  </span>
                </label>

                <button type="submit" disabled={loading || !consented} style={primaryBtnStyle(loading || !consented)}>
                  {loading && <Spinner />}
                  {loading ? "Creating your account…" : "Continue →"}
                </button>
              </form>

              <p style={footerTextStyle}>
                Already have an account?{" "}
                <a href={`${basePath}/sign-in`} style={linkStyle}>
                  Sign in
                </a>
              </p>

              {/* Static "Already have a code?" fallback for users who know */}
              {!hasSavedState && (
                <p style={{ ...footerTextStyle, marginTop: 8 }}>
                  Already started signing up?{" "}
                  <button
                    type="button"
                    onClick={handleGoToVerify}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "hsl(22, 78%, 52%)",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      textDecoration: "underline",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    Enter your code →
                  </button>
                </p>
              )}
            </>
          )}

          {/* ── STEP: verify ─────────────────────────────────────────────── */}
          {step === "verify" && (
            <>
              <h1 style={headingStyle}>Check Your Email</h1>
              <p style={subtitleStyle}>
                We sent a 6-digit code to{" "}
                <strong style={{ color: "hsl(210, 16%, 88%)" }}>{email}</strong>
              </p>

              <div style={spamNoteStyle}>
                📬 Check your <strong>spam or junk folder</strong> if you don't
                see the email. Codes are valid for 10 minutes.
              </div>

              <form onSubmit={handleVerify} noValidate>
                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="code" style={labelStyle}>
                    6-Digit Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    style={{
                      ...inputStyle,
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: "0.4em",
                      textAlign: "center",
                      padding: "14px",
                    }}
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button type="submit" disabled={loading} style={{ ...primaryBtnStyle(loading), marginBottom: 12 }}>
                  {loading && <Spinner />}
                  {loading ? "Verifying your code…" : "Verify & Continue"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                style={outlineBtnStyle(loading)}
              >
                Resend Code
              </button>

              {/* Magic link alternative */}
              <div
                style={{
                  borderTop: "1px solid hsl(220, 28%, 17%)",
                  margin: "16px 0 12px",
                  paddingTop: 16,
                }}
              >
                <p
                  style={{
                    color: "hsl(215, 16%, 58%)",
                    fontSize: 13,
                    textAlign: "center",
                    margin: "0 0 10px",
                  }}
                >
                  Having trouble with the code?
                </p>
                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  disabled={loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    padding: "13px",
                    borderRadius: 10,
                    border: "1px solid hsl(220, 28%, 24%)",
                    background: "hsl(220, 28%, 13%)",
                    color: "hsl(210, 16%, 82%)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxSizing: "border-box",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  <span>✨</span>
                  Send me a magic link instead
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                style={ghostBtnStyle}
              >
                ← Change email address
              </button>
            </>
          )}

          {/* ── STEP: link-sent ───────────────────────────────────────────── */}
          {step === "link-sent" && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
                <h1 style={{ ...headingStyle, marginBottom: 8 }}>Magic Link Sent!</h1>
                <p style={{ ...subtitleStyle, marginBottom: 0 }}>
                  We emailed a sign-in link to{" "}
                  <strong style={{ color: "hsl(210, 16%, 88%)" }}>{email}</strong>
                </p>
              </div>

              <div
                style={{
                  background: "hsla(22, 78%, 46%, 0.08)",
                  border: "1px solid hsla(22, 78%, 46%, 0.25)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 20,
                  fontSize: 14,
                  color: "hsl(22, 78%, 75%)",
                  lineHeight: 1.55,
                }}
              >
                <strong>How it works:</strong> Open your email app, find the
                message from Homegrown Hoops, and tap the link. It will
                automatically sign you in — no code needed.
              </div>

              <div style={spamNoteStyle}>
                📬 Check your <strong>spam or junk folder</strong> if you don't
                see the email within a minute.
              </div>

              {error && <ErrorBox message={error} />}

              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={loading}
                style={{ ...outlineBtnStyle(loading), marginBottom: 12 }}
              >
                {loading && <Spinner />}
                {loading ? "Sending…" : "Resend Magic Link"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("verify"); setError(""); }}
                style={ghostBtnStyle}
              >
                ← Use a 6-digit code instead
              </button>

              <button
                type="button"
                onClick={handleReset}
                style={{ ...ghostBtnStyle, marginTop: 4 }}
              >
                ← Change email address
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Legal modal overlay ───────────────────────────────────────────── */}
      {legalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
          }}
          onClick={() => setLegalModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              height: "90dvh",
              background: "hsl(222, 42%, 7%)",
              borderRadius: "16px 16px 0 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid hsl(220, 28%, 17%)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase", color: "hsl(22, 78%, 62%)" }}>
                {legalModal.title}
              </span>
              <button
                onClick={() => setLegalModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "hsl(215, 16%, 62%)",
                  cursor: "pointer",
                  fontSize: 22,
                  lineHeight: 1,
                  padding: "4px 8px",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable iframe */}
            <iframe
              src={legalModal.url}
              style={{
                flex: 1,
                border: "none",
                width: "100%",
                background: "hsl(222, 42%, 7%)",
              }}
              title={legalModal.title}
            />

            {/* Done button */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid hsl(220, 28%, 17%)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setLegalModal(null)}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 10,
                  border: "none",
                  background: "hsl(22, 78%, 46%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                Done — Back to Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared style objects ─────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  fontFamily: "'Anton', sans-serif",
  fontSize: 28,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "hsl(210, 16%, 92%)",
  textAlign: "center",
  margin: "0 0 4px",
};

const subtitleStyle: React.CSSProperties = {
  color: "hsl(215, 16%, 62%)",
  fontSize: 14,
  textAlign: "center",
  margin: "0 0 24px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "hsl(210, 16%, 78%)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid hsl(220, 28%, 22%)",
  background: "hsl(220, 28%, 13%)",
  color: "hsl(210, 16%, 92%)",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none",
};

function primaryBtnStyle(loading: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "14px",
    borderRadius: 10,
    border: "none",
    background: loading ? "hsl(22, 60%, 36%)" : "hsl(22, 78%, 46%)",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: loading ? "not-allowed" : "pointer",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    opacity: loading ? 0.85 : 1,
  };
}

function outlineBtnStyle(loading: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    border: "1px solid hsl(22, 78%, 40%)",
    background: "transparent",
    color: "hsl(22, 78%, 58%)",
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    boxSizing: "border-box",
    marginBottom: 12,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    opacity: loading ? 0.7 : 1,
  };
}

const ghostBtnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px",
  border: "none",
  background: "transparent",
  color: "hsl(215, 16%, 52%)",
  fontSize: 13,
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const spamNoteStyle: React.CSSProperties = {
  background: "hsla(45,100%,60%,0.08)",
  border: "1px solid hsla(45,100%,60%,0.25)",
  borderRadius: 8,
  padding: "10px 12px",
  marginBottom: 20,
  fontSize: 13,
  color: "hsl(45, 80%, 78%)",
};

const footerTextStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 13,
  color: "hsl(215, 16%, 62%)",
  marginTop: 20,
  marginBottom: 0,
};

const linkStyle: React.CSSProperties = {
  color: "hsl(22, 78%, 52%)",
  fontWeight: 600,
  textDecoration: "none",
};

function Spinner() {
  return (
    <svg
      style={{ width: 18, height: 18, animation: "su-spin 0.8s linear infinite", flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      style={{
        color: "hsl(10, 85%, 65%)",
        fontSize: 13,
        marginBottom: 16,
        background: "hsla(10,85%,65%,0.1)",
        border: "1px solid hsla(10,85%,65%,0.25)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      {message}
    </p>
  );
}
