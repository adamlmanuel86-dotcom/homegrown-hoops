import { useState, useEffect, useRef, Suspense } from "react";
import { ClerkProvider, AuthenticateWithRedirectCallback, Show, useClerk, useSignIn } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import "@/lib/api";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServerStatusBanner } from "@/components/server-status";
import { Layout } from "@/components/layout";
import { HomegrownHoopsLogo } from "@/components/logo";
import { Home } from "@/pages/home";
import { TeamsPage } from "@/pages/teams";
import { TeamDetailPage } from "@/pages/team-detail";
import { PlayersPage } from "@/pages/players";
import { PlayerDetailPage } from "@/pages/player-detail";
import { GamesPage } from "@/pages/games";
import { GameDetailPage } from "@/pages/game-detail";
import { MyProfilePage } from "@/pages/my-profile";
import { ProfilePage } from "@/pages/profile";
import { PublicProfilePage } from "@/pages/public-profile";
import { AdminPage } from "@/pages/admin";
import { OurStoryPage } from "@/pages/our-story";
import { ArchetypesPage } from "@/pages/archetypes";
import { IsoBallPage } from "@/pages/iso-ball";
import { OnboardingPage } from "@/pages/onboarding";
import { TermsPage } from "@/pages/terms";
import { PrivacyPage } from "@/pages/privacy";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

// Normalise BASE_URL: Vite emits "./" when base is "" (Vercel build without BASE_PATH).
// Treat both "./" and "/" as root so basePath is always an empty string at root.
const rawBase = import.meta.env.BASE_URL ?? "";
const basePath = rawBase === "./" || rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// ─── Clerk appearance — dark navy + burnt orange theme ───────────────────────
const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary:          "hsl(22, 78%, 46%)",
    colorBackground:       "hsl(220, 36%, 10%)",
    colorText:             "hsl(210, 16%, 88%)",
    colorTextSecondary:    "hsl(215, 16%, 62%)",
    colorInputBackground:  "hsl(220, 28%, 15%)",
    colorInputText:        "hsl(210, 16%, 88%)",
    colorNeutral:          "hsl(215, 50%, 16%)",
    colorShimmer:          "hsl(220, 28%, 18%)",
    borderRadius:  "0.75rem",
    fontFamily:    "'Inter', sans-serif",
  },
  elements: {
    rootBox:  "w-full",
    cardBox:  "w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5",
    card:     "!shadow-none !border-0 !rounded-xl",
    footer:   "!shadow-none !border-0",
    headerTitle: {
      color:          "hsl(210, 16%, 92%)",
      fontFamily:     "'Anton', sans-serif",
      textTransform:  "uppercase" as const,
      fontSize:       "1.75rem",
      letterSpacing:  "0.03em",
    },
    headerSubtitle:   { color: "hsl(215, 16%, 62%)" },
    formFieldLabel: {
      color:          "hsl(210, 16%, 78%)",
      fontWeight:     "600",
      fontSize:       "0.7rem",
      textTransform:  "uppercase" as const,
      letterSpacing:  "0.1em",
    },
    formFieldInput: {
      backgroundColor: "hsl(220, 28%, 13%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 92%)",
      boxShadow:       "none",
    },
    formFieldInputShowPasswordButton: { color: "hsl(215, 16%, 62%)" },
    formFieldHintText:  { color: "hsl(215, 16%, 62%)" },
    formFieldErrorText: { color: "hsl(10, 85%, 65%)" },
    formButtonPrimary: {
      backgroundColor: "hsl(22, 78%, 46%)",
      color:           "#ffffff",
      fontWeight:      "700",
      textTransform:   "uppercase" as const,
      letterSpacing:   "0.06em",
      fontSize:        "0.85rem",
      borderRadius:    "0.6rem",
      boxShadow:       "none",
      border:          "none",
    },
    formButtonReset: { color: "hsl(22, 78%, 46%)" },
    socialButtonsBlockButton: {
      backgroundColor: "hsl(220, 28%, 14%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 88%)",
    },
    socialButtonsBlockButtonText:  { color: "hsl(210, 16%, 88%)" },
    socialButtonsBlockButtonArrow: { color: "hsl(215, 16%, 62%)" },
    dividerLine: { backgroundColor: "hsl(220, 28%, 19%)" },
    dividerText: { color: "hsl(215, 16%, 52%)" },
    footerActionText: { color: "hsl(215, 16%, 62%)" },
    footerActionLink: { color: "hsl(22, 78%, 52%)", fontWeight: "600" },
    footerPages:      { backgroundColor: "hsl(220, 36%, 10%)" },
    identityPreviewText:       { color: "hsl(210, 16%, 88%)" },
    identityPreviewEditButton: { color: "hsl(22, 78%, 52%)" },
    otpCodeFieldInput: {
      backgroundColor: "hsl(220, 28%, 13%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 92%)",
    },
    alternativeMethodsBlockButton: {
      backgroundColor: "hsl(220, 28%, 14%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 88%)",
    },
    verificationLinkStatusIcon: { color: "hsl(22, 78%, 46%)" },
  },
};


function GoogleAuthPage() {
  const { signIn, isLoaded } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    // Guard inside handler — don't block the button render while Clerk initialises
    if (loading) return;
    if (!isLoaded || !signIn) {
      setError("Still loading — please try again in a moment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sign-in/sso-callback`,
        redirectUrlComplete: "/",
      });
    } catch {
      setError("Could not sign in with Google. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "hsl(222, 42%, 7%)",
      padding: "24px 16px",
      boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <HomegrownHoopsLogo size="lg" />
          </div>
          <p style={{ color: "hsl(215, 16%, 52%)", fontSize: 13, margin: 0 }}>
            Atlantic Canada's Youth Basketball Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "hsl(220, 36%, 10%)",
          borderRadius: 16,
          padding: "32px 28px",
          border: "1px solid hsl(220, 28%, 17%)",
        }}>
          <h1 style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: 28,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "hsl(210, 16%, 92%)",
            margin: "0 0 24px",
            textAlign: "center",
          }}>
            Sign In
          </h1>

          {/* Google button — inline styles so it always renders correctly */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: "100%",
              padding: "14px 20px",
              borderRadius: 10,
              border: "1px solid hsl(220, 28%, 22%)",
              background: "hsl(220, 28%, 14%)",
              color: "hsl(210, 16%, 88%)",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "background 0.15s",
              boxSizing: "border-box",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Google G logo */}
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Redirecting to Google…" : "Continue with Google"}
          </button>

          {error && (
            <p style={{
              color: "hsl(10, 85%, 65%)",
              fontSize: 13,
              textAlign: "center",
              margin: "16px 0 0",
            }}>
              {error}
            </p>
          )}

          <p style={{
            color: "hsl(215, 16%, 45%)",
            fontSize: 12,
            textAlign: "center",
            margin: "20px 0 0",
            lineHeight: 1.6,
          }}>
            New users will be prompted to create a profile after signing in.
          </p>
        </div>
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in/sso-callback">
        <AuthenticateWithRedirectCallback />
      </Route>
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/sign-up/*?" component={GoogleAuthPage} />
      <Route path="/p/:clerkUserId" component={PublicProfilePage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={GoogleAuthPage} />
            <Route path="/teams" component={TeamsPage} />
            <Route path="/teams/:id" component={TeamDetailPage} />
            <Route path="/players" component={PlayersPage} />
            <Route path="/players/:id" component={PlayerDetailPage} />
            <Route path="/games" component={GamesPage} />
            <Route path="/games/:id" component={GameDetailPage} />
            <Route path="/my-profile" component={MyProfilePage} />
            <Route path="/profiles/:clerkUserId" component={ProfilePage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/our-story" component={OurStoryPage} />
            <Route path="/archetypes" component={ArchetypesPage} />
            <Route path="/iso-ball" component={IsoBallPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl || undefined}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Suspense fallback={
          <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-4">
            <span className="font-display text-2xl uppercase tracking-widest text-primary">Homegrown Hoops</span>
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        }>
          <Router />
        </Suspense>
        <ServerStatusBanner />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base="/">
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
