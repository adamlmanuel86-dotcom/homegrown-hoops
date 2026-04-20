import { Link } from "wouter";
import { Trophy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-6xl text-secondary mb-3">404</h1>
        <p className="font-bold text-secondary text-xl mb-2">Page Not Found</p>
        <p className="text-muted-foreground text-sm mb-8">This page doesn't exist. Head back to the court.</p>
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
