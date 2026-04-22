import { useState, useEffect } from "react";
import { useSignUp } from "@clerk/react";
import { useLocation } from "wouter";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function CustomSignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !signUp) return;
    if (
      signUp.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address")
    ) {
      setEmail(signUp.emailAddress ?? "");
      setStep("verify");
    }
  }, [isLoaded, signUp]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[]; message?: string };
      setError(
        clerkErr.errors?.[0]?.longMessage ??
          clerkErr.message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/onboarding");
      } else {
        setError("Verification incomplete — please try again.");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[]; message?: string };
      setError(
        clerkErr.errors?.[0]?.longMessage ??
          clerkErr.message ??
          "Invalid code. Please check and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!isLoaded || !signUp) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[]; message?: string };
      setError(
        clerkErr.errors?.[0]?.longMessage ??
          clerkErr.message ??
          "Could not resend code. Please try again.",
      );
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-5">
        <div className="flex justify-center">
          <a href={`${basePath}/`}>
            <img
              src={`${basePath}/logo.svg`}
              alt="Homegrown Hoops"
              className="h-12 w-auto"
            />
          </a>
        </div>

        <div className="card-base p-8 space-y-6">
          {step === "email" ? (
            <>
              <div className="text-center space-y-1">
                <h1
                  className="text-3xl uppercase tracking-wide text-secondary"
                  style={{ fontFamily: "'Anton', sans-serif" }}
                >
                  Create Account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Free for the 2026 pilot season. No credit card required.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="label-upper block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-upper block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-sm justify-center disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <a
                  href={`${basePath}/sign-in`}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-1">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1
                    className="text-3xl uppercase tracking-wide text-secondary"
                    style={{ fontFamily: "'Anton', sans-serif" }}
                  >
                    Check Your Email
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a 6-digit code to{" "}
                    <span className="text-foreground font-semibold break-all">
                      {signUp?.emailAddress ?? email}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                <span className="text-amber-400 text-base leading-none mt-0.5 flex-shrink-0">
                  📬
                </span>
                <p className="text-xs text-amber-300/90 font-medium leading-relaxed">
                  Check your{" "}
                  <span className="font-bold text-amber-300">spam or junk folder</span> if
                  you don't see the email in your inbox.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="label-upper block mb-1.5">6-Digit Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    required
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    className="w-full px-4 py-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-2xl font-bold tracking-[0.5em] text-center"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {resendSuccess && (
                  <div className="flex items-center gap-2.5 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <p>A new code has been sent. Check your inbox (and spam).</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="btn-primary w-full py-3 text-sm justify-center disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              </form>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary/35 text-primary font-semibold text-sm hover:bg-primary/10 active:bg-primary/15 transition-colors disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${resendLoading ? "animate-spin" : ""}`}
                  />
                  {resendLoading ? "Sending new code…" : "Resend Code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                    setResendSuccess(false);
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-2"
                >
                  ← Change email address
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
