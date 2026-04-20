import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Show, UserButton } from "@clerk/react";
import { Menu, X, Trophy, Users, CalendarDays, Home } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/players", label: "Players", icon: Trophy },
    { href: "/games", label: "Games", icon: CalendarDays },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="bg-secondary text-secondary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-xl tracking-wide text-white">HOMEGROWN HOOPS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  location === link.href
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-4 flex items-center gap-3">
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Sign In
                </Link>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </nav>

          <button
            className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

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
              </Link>
            ))}
            <div className="pt-2 pb-1 px-4">
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  onClick={() => setIsOpen(false)}
                  className="block w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-bold text-center hover:opacity-90"
                >
                  Sign In
                </Link>
              </Show>
              <Show when="signed-in">
                <div className="py-2">
                  <UserButton />
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
        <div className="container mx-auto px-4 text-center text-sm font-medium">
          © {new Date().getFullYear()} Homegrown Hoops
        </div>
      </footer>
    </div>
  );
}
