import { useUser } from "@clerk/react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { AvatarCreator } from "@/components/AvatarCreator";
import type { AvatarConfig } from "@/lib/avatarCanvas";

export function MyAvatarPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-white/50">Sign in to customize your avatar.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-white/50 mb-4">Create your player profile first.</p>
        <button
          onClick={() => setLocation("/my-profile")}
          className="bg-primary text-white font-black px-6 py-2.5 rounded-lg text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Set Up Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <p className="label-upper mb-1">Account</p>
        <h1 className="font-display text-4xl text-secondary">MY BALLER</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Design your court persona. Your avatar appears in the Arcade.
        </p>
      </div>

      <AvatarCreator
        initialConfig={profile.avatarConfig as AvatarConfig | null | undefined}
        onSaved={() => {}}
      />
    </div>
  );
}
