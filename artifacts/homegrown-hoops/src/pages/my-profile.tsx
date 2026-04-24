import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useGetMyProfile, useCreateMyProfile, useUpdateMyProfile, useListTeams } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Save, Pencil, CheckCircle, Mail, ShieldCheck, Camera, X } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const GRAD_YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2);

type FormData = {
  firstName: string;
  lastName: string;
  school: string;
  position: string;
  graduationYear: string;
  bio: string;
  teamId: string;
  number: string;
};

const empty: FormData = {
  firstName: "",
  lastName: "",
  school: "",
  position: "",
  graduationYear: "",
  bio: "",
  teamId: "",
  number: "",
};

export function MyProfilePage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: profile, isLoading, error } = useGetMyProfile({
    query: { enabled: isSignedIn === true, retry: false },
  });
  const { data: teams } = useListTeams();

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<FormData>(empty);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [clearAvatar, setClearAvatar] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        teamId: profile.teamId?.toString() ?? "",
        number: profile.number ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation("/sign-in");
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    if (isNew) {
      if (user?.firstName) setForm((f) => ({ ...f, firstName: user.firstName ?? "" }));
      if (user?.lastName) setForm((f) => ({ ...f, lastName: user.lastName ?? "" }));
    }
  }, [isNew, user]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setClearAvatar(false);
    setPhotoError(null);
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) return null;
      const { uploadURL, objectPath } = await urlRes.json();
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) return null;
      return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
    } catch {
      return null;
    }
  }

  function startEditing() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setClearAvatar(false);
    setPhotoError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setClearAvatar(false);
    setPhotoError(null);
    setEditing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhotoError(null);

    const payload: Record<string, unknown> = {
      firstName: form.firstName,
      lastName: form.lastName,
      school: form.school || null,
      position: form.position || null,
      graduationYear: form.graduationYear ? parseInt(form.graduationYear) : null,
      bio: form.bio || null,
      teamId: form.teamId ? parseInt(form.teamId) : null,
      number: form.number || null,
    };

    let photoFailed = false;

    if (clearAvatar) {
      payload.avatarUrl = null;
    } else if (avatarFile) {
      setIsUploadingPhoto(true);
      const url = await uploadPhoto(avatarFile);
      setIsUploadingPhoto(false);
      if (url) {
        payload.avatarUrl = url;
      } else {
        photoFailed = true;
        setPhotoError("Photo upload failed — your other changes were saved, but the photo was not updated.");
      }
    }

    if (isNew) {
      await create.mutateAsync({ data: payload as Parameters<typeof create.mutateAsync>[0]["data"] });
    } else {
      await update.mutateAsync({ data: payload as Parameters<typeof update.mutateAsync>[0]["data"] });
    }

    setAvatarFile(null);
    setAvatarPreview(null);
    setClearAvatar(false);
    await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    // If photo upload failed keep the form open so the user can see the error
    if (!photoFailed) setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const showForm = editing || isNew;
  const currentTeam = teams?.find((t) => t.id === profile?.teamId);

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="label-upper mb-1">Account</p>
        <h1 className="font-display text-4xl text-secondary">MY PROFILE</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isNew
            ? "Create your player profile to appear in the league directory."
            : "Manage your public player profile."}
        </p>
      </div>

      {/* Saved banner */}
      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-semibold">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Profile saved successfully!
        </div>
      )}

      {/* Profile card / form */}
      {!showForm && profile ? (
        <div className="card-base overflow-hidden">
          <div className="bg-secondary px-6 py-8 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
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
                {currentTeam && (
                  <span
                    className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: currentTeam.primaryColor ?? "#F97316" }}
                  >
                    {currentTeam.name}
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
            <button onClick={startEditing} className="btn-primary mt-2">
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-base p-6 space-y-5">

          {/* ── Photo upload ── */}
          <div>
            <label className="label-upper block mb-2">Profile Photo</label>
            <div className="flex items-center gap-4">
              {/* Preview / current avatar */}
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                {clearAvatar ? (
                  <User className="h-9 w-9 text-muted-foreground" />
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Current photo" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-9 w-9 text-muted-foreground" />
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-0">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <Camera className="h-4 w-4 text-primary" />
                  {avatarPreview || (profile?.avatarUrl && !clearAvatar) ? "Change Photo" : "Add Photo"}
                </button>
                {(avatarPreview || (profile?.avatarUrl && !clearAvatar)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      setClearAvatar(true);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Remove photo
                  </button>
                )}
                {isUploadingPhoto && (
                  <p className="text-xs text-muted-foreground">Uploading photo…</p>
                )}
              </div>
            </div>
            {photoError && (
              <p className="text-amber-500 text-xs font-medium mt-2">{photoError}</p>
            )}
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-upper block mb-1.5">Position</label>
              <select
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
              >
                <option value="">Select position</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
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
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-upper block mb-1.5">Jersey #</label>
              <input
                name="number"
                value={form.number}
                onChange={handleChange}
                placeholder="e.g. 23"
                maxLength={3}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Team selection */}
          <div>
            <label className="label-upper block mb-1.5">Team</label>
            <select
              name="teamId"
              value={form.teamId}
              onChange={handleChange}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
            >
              <option value="">No team / select later</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.city}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">
              Not sure? An admin can assign or correct your team at any time.
            </p>
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
              {create.isPending || update.isPending
                ? "Saving..."
                : isNew
                ? "Create Profile"
                : "Save Changes"}
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={cancelEditing}
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

      {/* Recognition — visible in view mode when profile exists */}
      {!showForm && profile && (
        <RecognitionBlock
          stamps={profile.stamps ?? []}
          tides={profile.tides ?? []}
          archetype={profile.archetype}
          showArchetypeLink
        />
      )}

      {/* Account Info */}
      <div className="card-base p-6 space-y-4">
        <h3 className="label-upper text-xs text-muted-foreground">Account Info</h3>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
              Email Address
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
              Role
            </p>
            {profile?.role ? (
              <RoleBadge role={profile.role} />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-primary/15 text-primary border border-primary/30",
    coach: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    player: "bg-white/8 text-foreground/70 border border-white/10",
  };
  const labels: Record<string, string> = {
    admin: "Admin",
    coach: "Coach",
    player: "Player",
  };
  const cls = styles[role] ?? styles.player;
  const label = labels[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
