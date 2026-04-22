import { useState } from "react";
import { useSignUp } from "@clerk/react";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function CustomSignUpPage() {
  const { signUp, setActive } = useSignUp();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
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
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
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
    } catch {
      setError("Could not resend — please try again.");
    }
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
          {step === "form" ? (
            <>
              <h1
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 28,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "hsl(210, 16%, 92%)",
                  textAlign: "center",
                  margin: "0 0 4px",
                }}
              >
                Create Account
              </h1>
              <p
                style={{
                  color: "hsl(215, 16%, 62%)",
                  fontSize: 14,
                  textAlign: "center",
                  margin: "0 0 24px",
                }}
              >
                Free for the 2026 pilot season
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(210, 16%, 78%)",
                      marginBottom: 6,
                    }}
                  >
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
                    style={{
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
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="password"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(210, 16%, 78%)",
                      marginBottom: 6,
                    }}
                  >
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
                    style={{
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
                    }}
                  />
                </div>

                {error && (
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
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "14px",
                    borderRadius: 10,
                    border: "none",
                    background: loading
                      ? "hsl(22, 60%, 36%)"
                      : "hsl(22, 78%, 46%)",
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxSizing: "border-box",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {loading ? "Creating account…" : "Continue →"}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "hsl(215, 16%, 62%)",
                  marginTop: 20,
                  marginBottom: 0,
                }}
              >
                Already have an account?{" "}
                <a
                  href={`${basePath}/sign-in`}
                  style={{
                    color: "hsl(22, 78%, 52%)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Sign in
                </a>
              </p>
            </>
          ) : (
            <>
              <h1
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 28,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "hsl(210, 16%, 92%)",
                  textAlign: "center",
                  margin: "0 0 8px",
                }}
              >
                Check Your Email
              </h1>
              <p
                style={{
                  color: "hsl(215, 16%, 62%)",
                  fontSize: 14,
                  textAlign: "center",
                  margin: "0 0 16px",
                }}
              >
                We sent a 6-digit code to{" "}
                <strong style={{ color: "hsl(210, 16%, 88%)" }}>{email}</strong>
              </p>

              {/* Spam note */}
              <div
                style={{
                  background: "hsla(45,100%,60%,0.08)",
                  border: "1px solid hsla(45,100%,60%,0.25)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "hsl(45, 80%, 78%)",
                }}
              >
                📬 Check your <strong>spam or junk folder</strong> if you don't see the email.
              </div>

              <form onSubmit={handleVerify} noValidate>
                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="code"
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(210, 16%, 78%)",
                      marginBottom: 6,
                    }}
                  >
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
                      display: "block",
                      width: "100%",
                      padding: "14px",
                      borderRadius: 10,
                      border: "1px solid hsl(220, 28%, 22%)",
                      background: "hsl(220, 28%, 13%)",
                      color: "hsl(210, 16%, 92%)",
                      fontSize: 24,
                      fontWeight: 700,
                      letterSpacing: "0.4em",
                      textAlign: "center",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                {error && (
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
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "14px",
                    borderRadius: 10,
                    border: "none",
                    background: loading
                      ? "hsl(22, 60%, 36%)"
                      : "hsl(22, 78%, 46%)",
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxSizing: "border-box",
                    marginBottom: 12,
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {loading ? "Verifying…" : "Verify & Continue"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                style={{
                  display: "block",
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
                }}
              >
                Resend Code
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setCode("");
                  setError("");
                }}
                style={{
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
                }}
              >
                ← Change email address
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
