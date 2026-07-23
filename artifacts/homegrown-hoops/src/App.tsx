import { useEffect, useRef, Suspense } from "react";
import { ClerkProvider, AuthenticateWithRedirectCallback, SignIn, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import "@/lib/api";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServerStatusBanner } from "@/components/server-status";
import { Layout } from "@/components/layout";
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
import { ArcadePage } from "@/pages/arcade";
import { WhoYaGotPage } from "@/pages/who-ya-got";
import { FastBreakPage } from "@/pages/fast-break";
import { ShotClockPage } from "@/pages/shot-clock";
import { MyAvatarPage } from "@/pages/my-avatar";
import { OnboardingPage } from "@/pages/onboarding";
import { CustomSignUpPage } from "@/pages/sign-up";
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


function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return <CustomSignUpPage />;
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
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/p/:clerkUserId" component={PublicProfilePage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
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
            <Route path="/arcade" component={ArcadePage} />
            <Route path="/arcade/who-ya-got" component={WhoYaGotPage} />
            <Route path="/arcade/fast-break" component={FastBreakPage} />
            <Route path="/arcade/shot-clock" component={ShotClockPage} />
            <Route path="/my-avatar" component={MyAvatarPage} />
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
      proxyUrl={clerkProxyUrl}
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
