import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { AdminPage } from "@/pages/admin";
import { OurStoryPage } from "@/pages/our-story";
import { ArchetypesPage } from "@/pages/archetypes";
import { OnboardingPage } from "@/pages/onboarding";
import { CustomSignUpPage } from "@/pages/sign-up";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

// ─── Clerk appearance — dark navy + burnt orange theme ───────────────────────
// Mirrors the CSS design tokens:
//   background  hsl(222 42%  7%)   card  hsl(220 36% 10%)
//   foreground  hsl(210 16% 88%)   muted hsl(215 16% 62%)
//   primary     hsl( 22 78% 46%)   input hsl(220 28% 15%)
//   border      hsl(220 28% 17%)
// ─────────────────────────────────────────────────────────────────────────────
const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    // Colour palette
    colorPrimary:          "hsl(22, 78%, 46%)",
    colorBackground:       "hsl(220, 36%, 10%)",
    colorText:             "hsl(210, 16%, 88%)",
    colorTextSecondary:    "hsl(215, 16%, 62%)",
    colorInputBackground:  "hsl(220, 28%, 15%)",
    colorInputText:        "hsl(210, 16%, 88%)",
    colorNeutral:          "hsl(215, 50%, 16%)",
    colorShimmer:          "hsl(220, 28%, 18%)",
    // Shape & type
    borderRadius:  "0.75rem",
    fontFamily:    "'Inter', sans-serif",
  },
  elements: {
    // ── Structural shells ──────────────────────────────────────────────────
    rootBox:  "w-full",
    cardBox:  "w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5",
    card:     "!shadow-none !border-0 !rounded-xl",
    footer:   "!shadow-none !border-0",

    // ── Header ─────────────────────────────────────────────────────────────
    headerTitle: {
      color:          "hsl(210, 16%, 92%)",
      fontFamily:     "'Anton', sans-serif",
      textTransform:  "uppercase" as const,
      fontSize:       "1.75rem",
      letterSpacing:  "0.03em",
    },
    headerSubtitle: {
      color: "hsl(215, 16%, 62%)",
    },

    // ── Form fields ─────────────────────────────────────────────────────────
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
    formFieldInputShowPasswordButton: {
      color: "hsl(215, 16%, 62%)",
    },
    formFieldHintText: {
      color: "hsl(215, 16%, 62%)",
    },
    formFieldErrorText: {
      color: "hsl(10, 85%, 65%)",
    },

    // ── Primary button ──────────────────────────────────────────────────────
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

    // ── Secondary / ghost buttons ───────────────────────────────────────────
    formButtonReset: {
      color: "hsl(22, 78%, 46%)",
    },

    // ── Social / OAuth buttons ──────────────────────────────────────────────
    socialButtonsBlockButton: {
      backgroundColor: "hsl(220, 28%, 14%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 88%)",
    },
    socialButtonsBlockButtonText: {
      color: "hsl(210, 16%, 88%)",
    },
    socialButtonsBlockButtonArrow: {
      color: "hsl(215, 16%, 62%)",
    },

    // ── "Or continue with" divider ──────────────────────────────────────────
    dividerLine: {
      backgroundColor: "hsl(220, 28%, 19%)",
    },
    dividerText: {
      color: "hsl(215, 16%, 52%)",
    },

    // ── Footer links ────────────────────────────────────────────────────────
    footerActionText: {
      color: "hsl(215, 16%, 62%)",
    },
    footerActionLink: {
      color:      "hsl(22, 78%, 52%)",
      fontWeight: "600",
    },
    footerPages: {
      backgroundColor: "hsl(220, 36%, 10%)",
    },

    // ── Identity preview (step 2 header) ────────────────────────────────────
    identityPreviewText: {
      color: "hsl(210, 16%, 88%)",
    },
    identityPreviewEditButton: {
      color: "hsl(22, 78%, 52%)",
    },

    // ── OTP / code input ────────────────────────────────────────────────────
    otpCodeFieldInput: {
      backgroundColor: "hsl(220, 28%, 13%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 92%)",
    },

    // ── Alternative methods list ─────────────────────────────────────────────
    alternativeMethodsBlockButton: {
      backgroundColor: "hsl(220, 28%, 14%)",
      borderColor:     "hsl(220, 28%, 22%)",
      color:           "hsl(210, 16%, 88%)",
    },

    // ── Verification / check icons ───────────────────────────────────────────
    verificationLinkStatusIcon: {
      color: "hsl(22, 78%, 46%)",
    },
  },
};

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth pane in the workspace toolbar.
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
      {/* Full-screen routes — no nav layout */}
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Standard routes — inside nav layout */}
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
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
