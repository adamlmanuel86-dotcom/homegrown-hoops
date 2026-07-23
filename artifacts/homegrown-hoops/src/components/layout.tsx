import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { Menu, X, CalendarDays, Home, Trophy, Users, User, Shield, BookOpen, LogOut, LogIn, Layers, HelpCircle, ChevronDown, Mail, Gamepad2 } from "lucide-react";
import { HomegrownHoopsLogo } from "@/components/logo";
import { Walkthrough } from "@/components/walkthrough";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [location] = useLocation();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();

  const { data: myProfile } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });

  const isAdmin = myProfile?.role === "admin";
  const isManager = myProfile?.role === "manager" || isAdmin;

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/players", label: "Players", icon: Trophy },
    { href: "/games", label: "Games", icon: CalendarDays },
    { href: "/archetypes", label: "Archetypes", icon: Layers },
    { href: "/arcade", label: "Arcade", icon: Gamepad2 },
    { href: "/our-story", label: "Our Story", icon: BookOpen },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {showWalkthrough && (
        <Walkthrough onClose={() => setShowWalkthrough(false)} />
      )}

      <header className="bg-secondary text-secondary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <HomegrownHoopsLogo size="md" />
          </Link>

          {/* ── Desktop nav ──────────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  location === link.href
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
                {link.href === "/arcade" && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black px-1 py-px rounded-sm leading-none tracking-wider uppercase">
                    NEW
                  </span>
                )}
              </Link>
            ))}

            <button
              onClick={() => setShowWalkthrough(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="h-3.5 w-3.5" /> How It Works
            </button>

            <div className="ml-4 flex items-center gap-2">
              {/* ── Signed-out: Login button ── */}
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </Show>

              {/* ── Signed-in: account dropdown ── */}
              <Show when="signed-in">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none">
                      <User className="h-4 w-4" />
                      {user?.firstName ?? "Account"}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-secondary border-white/10 text-white">
                    {isManager && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            href="/track-game"
                            className="flex items-center gap-2 cursor-pointer text-orange-400 font-bold focus:bg-primary/10 focus:text-primary"
                          >
                            📋 Track Game
                          </Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem asChild>
                            <Link
                              href="/admin"
                              className="flex items-center gap-2 cursor-pointer text-primary font-bold focus:bg-primary/10 focus:text-primary"
                            >
                              <Shield className="h-4 w-4" />
                              Admin Panel
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-white/10" />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link
                        href={user?.id ? `/profiles/${user.id}` : "/sign-in"}
                        className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:bg-white/10 focus:text-white"
                      >
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <a
                        href="mailto:adamlmanuel86@gmail.com?subject=Homegrown%20Hoops%20Inquiry"
                        className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:bg-white/10 focus:text-white"
                      >
                        <Mail className="h-4 w-4" />
                        Contact Admin
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => signOut({ redirectUrl: "/" })}
                      className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Show>
            </div>
          </nav>

          {/* ── Mobile hamburger ─────────────────────────────────────────── */}
          <button
            className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="md:hidden bg-secondary text-white absolute top-16 left-0 right-0 z-40 shadow-xl border-t border-white/10">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                  location === link.href ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {link.href === "/arcade" && (
                  <span className="ml-auto bg-primary text-white text-[9px] font-black px-1.5 py-px rounded-sm leading-none tracking-wider uppercase">
                    NEW
                  </span>
                )}
              </Link>
            ))}

            <button
              onClick={() => { setIsOpen(false); setShowWalkthrough(true); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-white/50 hover:text-white transition-colors"
            >
              <HelpCircle className="h-4 w-4" /> How It Works
            </button>

            <div className="mt-2 pt-3 border-t border-white/10 flex flex-col gap-2 pb-2">
              {/* ── Signed-out ── */}
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </Show>

              {/* ── Signed-in ── */}
              <Show when="signed-in">
                {isManager && (
                  <Link
                    href="/track-game"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 hover:bg-orange-400/20 transition-colors"
                  >
                    📋 Track Game
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}
                <Link
                  href={user?.id ? `/profiles/${user.id}` : "/sign-in"}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-white/70 hover:text-white transition-colors"
                >
                  <User className="h-4 w-4" />
                  {user?.firstName ?? "My Profile"}
                </Link>

                <a
                  href="mailto:adamlmanuel86@gmail.com?subject=Homegrown%20Hoops%20Inquiry"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-white/70 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Contact Admin
                </a>

                <div className="px-1">
                  <button
                    onClick={() => { setIsOpen(false); signOut({ redirectUrl: "/" }); }}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-bold bg-white/8 text-white/80 border border-white/15 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-secondary text-white/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm font-medium space-y-2">
          <div className="flex items-center justify-center gap-4">
            <a
              href="mailto:adamlmanuel86@gmail.com?subject=Homegrown%20Hoops%20Inquiry"
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-xs font-semibold"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact
            </a>
          </div>
          <div>© {new Date().getFullYear()} Homegrown Hoops</div>
        </div>
      </footer>
    </div>
  );
}
