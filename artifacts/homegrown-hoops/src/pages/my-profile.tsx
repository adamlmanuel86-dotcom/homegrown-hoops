import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useGetMyProfile, useCreateMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Save, Pencil, CheckCircle } from "lucide-react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const GRAD_YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2);

type FormData = {
  firstName: string;
  lastName: string;
  school: string;
  position: string;
  graduationYear: string;
  bio: string;
};

const empty: FormData = {
  firstName: "",
  lastName: "",
  school: "",
  position: "",
  graduationYear: "",
  bio: "",
};

export function MyProfilePage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: profile, isLoading, error } = useGetMyProfile({ query: { enabled: isSignedIn === true, retry: false } });

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<FormData>(empty);

  const create = useCreateMyProfile();
  const update = useUpdateMyProfile();

  const isNew = !isLoading && !profile && (error as { status?: number } | null)?.status === 404;

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        school: profile.school ?? "",
        position: profile.position ?? "",
        graduationYear: profile.graduationYear?.toString() ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    if (isNew) {
      if (user?.firstName) setForm((f) => ({ ...f, firstName: user.firstName ?? "" }));
      if (user?.lastName) setForm((f) => ({ ...f, lastName: user.lastName ?? "" }));
    }
  }, [isNew, user]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      school: form.school || null,
      position: form.position || null,
      graduationYear: form.graduationYear ? parseInt(form.graduationYear) : null,
      bio: form.bio || null,
    };

    if (isNew) {
      await create.mutateAsync({ data: payload });
    } else {
      await update.mutateAsync({ data: payload });
    }

    await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  const showForm = editing || isNew;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="label-upper mb-1">Account</p>
        <h1 className="font-display text-4xl text-secondary">MY PROFILE</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isNew ? "Create your player profile to appear in the league directory." : "Manage your public player profile."}
        </p>
      </div>

      {/* Saved banner */}
      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-semibold">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Profile saved successfully!
        </div>
      )}

      {/* Profile card */}
      {!showForm && profile ? (
        <div className="card-base overflow-hidden">
          <div className="bg-secondary px-6 py-8 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-3xl text-white leading-tight">
                {profile.firstName.toUpperCase()} {profile.lastName.toUpperCase()}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.position && (
                  <span className="bg-white/10 text-white/80 text-xs font-bold uppercase px-2 py-0.5 rounded-full">
                    {profile.position}
                  </span>
                )}
                {profile.graduationYear && (
                  <span className="bg-white/10 text-white/80 text-xs font-bold px-2 py-0.5 rounded-full">
                    Class of {profile.graduationYear}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {profile.school && (
              <div>
                <p className="label-upper mb-1">School</p>
                <p className="font-semibold text-secondary">{profile.school}</p>
              </div>
            )}
            {profile.bio && (
              <div>
                <p className="label-upper mb-1">Bio</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
            <button
              onClick={() => setEditing(true)}
              className="btn-primary mt-2"
            >
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-base p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-upper block mb-1.5">First Name *</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                placeholder="Marcus"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="label-upper block mb-1.5">Last Name *</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                placeholder="Johnson"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="label-upper block mb-1.5">School</label>
            <input
              name="school"
              value={form.school}
              onChange={handleChange}
              placeholder="Lincoln High School"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-upper block mb-1.5">Position</label>
              <select
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
              >
                <option value="">Select position</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label-upper block mb-1.5">Graduation Year</label>
              <select
                name="graduationYear"
                value={form.graduationYear}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
              >
                <option value="">Select year</option>
                {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label-upper block mb-1.5">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={3}
              placeholder="Tell the league about yourself..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="btn-primary"
            >
              <Save className="h-4 w-4" />
              {create.isPending || update.isPending ? "Saving..." : isNew ? "Create Profile" : "Save Changes"}
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {(create.isError || update.isError) && (
            <p className="text-red-600 text-sm font-medium">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
