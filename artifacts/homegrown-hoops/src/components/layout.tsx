import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, UserButton, Show } from "@clerk/react";
import { Menu, X, Trophy, Users, CalendarDays, Home } from "lucide-react";
import { useState } from "react";

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
      <header className="border-b-4 border-black bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl uppercase tracking-wider flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Homegrown Hoops
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 font-display uppercase tracking-wide">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`hover:text-black transition-colors ${location === link.href ? "text-black" : ""}`}
              >
                {link.label}
              </Link>
            ))}
            <Show when="signed-out">
              <Link href="/sign-in" className="bg-black text-white px-4 py-2 border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-all">
                Sign In
              </Link>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden border-b-4 border-black bg-white text-black font-display uppercase tracking-wide text-xl absolute top-16 left-0 right-0 z-40 shadow-[0_8px_0_0_rgba(0,0,0,1)]">
          <div className="flex flex-col p-4 gap-4">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 p-2 border-b-2 border-gray-100 ${location === link.href ? "text-primary" : ""}`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            ))}
            <Show when="signed-out">
              <Link href="/sign-in" onClick={() => setIsOpen(false)} className="bg-primary text-white p-3 text-center border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] mt-2">
                Sign In
              </Link>
            </Show>
            <Show when="signed-in">
              <div className="p-2">
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t-4 border-black bg-white py-8 mt-auto">
        <div className="container mx-auto px-4 text-center font-display uppercase tracking-wider text-muted-foreground">
          <p>© {new Date().getFullYear()} Homegrown Hoops. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}