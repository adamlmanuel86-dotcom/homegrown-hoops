import { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation, Link } from "wouter";
import { useGetMyProfile, useCreateMyProfile, useUpdateMyProfile, useListTeams, useGetMyArcadeStats, useGetMyArcadeRank, useGetIsoBallProfile, useGetIsoBallRank } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Save, Pencil, CheckCircle, Mail, ShieldCheck, Camera, X, Gamepad2 } from "lucide-react";
import { RecognitionBlock } from "@/components/recognition";
import { apiBase } from "@/lib/api";

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
  const { getToken } = useAuth();
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
  const { data: arcadeStats } = useGetMyArcadeStats({
    query: { enabled: isSignedIn === true },
  });
  const { data: fbRank } = useGetMyArcadeRank(
    { game: "fast-break" },
    { query: { enabled: isSignedIn === true } },
  );
  const { data: wygRank } = useGetMyArcadeRank(
    { game: "who-ya-got" },
    { query: { enabled: isSignedIn === true } },
  );
  const { data: scRank } = useGetMyArcadeRank(
    { game: "shot-clock" },
    { query: { enabled: isSignedIn === true } },
  );
  const { data: isoBallData } = useGetIsoBallProfile(user?.id ?? null, { query: { enabled: isSignedIn === true } });
  const { data: ibRank } = useGetIsoBallRank({ query: { enabled: isSignedIn === true } });

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

  function compressImage(file: File, maxPx = 800, maxBytes = 500 * 1024): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width >= height) {
            height = Math.round((height * maxPx) / width);
            width = maxPx;
          } else {
            width = Math.round((width * maxPx) / height);
            height = maxPx;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const qualities = [0.85, 0.72, 0.58, 0.42];
        let attempt = 0;
        function tryQuality() {
          const q = qualities[attempt] ?? 0.42;
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Image compression failed")); return; }
            if (blob.size <= maxBytes || attempt >= qualities.length - 1) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else {
              attempt++;
              tryQuality();
            }
          }, "image/jpeg", q);
        }
        tryQuality();
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Failed to load image")); };
      img.src = blobUrl;
    });
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    try {
      const compressed = await compressImage(file);
      const token = await getToken();
      const sigRes = await fetch(`${apiBase}/api/cloudinary/profile-signature`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!sigRes.ok) return null;
      const { signature, apiKey, cloudName, timestamp, folder } = await sigRes.json();
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) return null;
      const data = await uploadRes.json();
      return data.secure_url ?? null;
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
    // Invalidate all data that depends on team membership so every page updates
    // immediately without requiring a manual refresh.
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["/api/profiles/me"] }),
      qc.invalidateQueries({ queryKey: ["/api/profiles"] }),
      qc.invalidateQueries({ queryKey: ["/api/players"] }),
    ]);
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
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={startEditing} className="btn-primary">
                <Pencil className="h-4 w-4" /> Edit Profile
              </button>
              <a href="/my-avatar" className="btn-secondary flex items-center gap-1.5">
                <Gamepad2 className="h-4 w-4" /> Customize Avatar
              </a>
            </div>
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

      {/* Arcade Stats — always visible in view mode when profile exists */}
      {!showForm && profile && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <h3 className="label-upper text-xs text-muted-foreground">Arcade</h3>
          </div>

          {/* ── FAST BREAK ─────────────────────────────────────────────── */}
          {(() => {
            const fb = arcadeStats?.fastBreak ?? null;
            const fgPct = fb && fb.totalFga && fb.totalFga > 0
              ? Math.round((fb.totalFgm! / fb.totalFga) * 100) : null;
            const tpPct = fb && fb.totalTpa && fb.totalTpa > 0
              ? Math.round((fb.totalTpm! / fb.totalTpa) * 100) : null;
            return (
              <Link href="/arcade/fast-break">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #0f1a10 0%, #1a2e1a 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: "radial-gradient(ellipse at 0% 50%, rgba(255,140,0,0.18) 0%, transparent 60%)",
                  }} />
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 18 }}>🏀</span>
                      <span className="font-display text-sm tracking-widest text-white/60 uppercase">Fast Break</span>
                    </div>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-orange-500/60"
                      style={{ color: "#ff8c00", background: "rgba(255,140,0,0.1)" }}
                    >
                      Shooting
                    </span>
                  </div>
                  {fb ? (
                    <>
                      <div className="flex items-end gap-6 px-4 pb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">High Score</p>
                          <p className="font-display leading-none" style={{ fontSize: "clamp(52px,12vw,72px)", color: "#ff8c00" }}>
                            {fb.bestScore}
                          </p>
                        </div>
                        <div className="flex-1 space-y-2 pb-1">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">FG%</span>
                              <span className="text-[11px] font-black text-white">
                                {fgPct !== null ? `${fgPct}%` : "—"}
                                <span className="text-white/30 font-normal text-[9px] ml-1">
                                  {fb.totalFgm ?? 0}/{fb.totalFga ?? 0}
                                </span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${fgPct ?? 0}%`, background: "linear-gradient(90deg,#ff8c00,#ffb347)" }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">3PT%</span>
                              <span className="text-[11px] font-black text-white">
                                {tpPct !== null ? `${tpPct}%` : "—"}
                                <span className="text-white/30 font-normal text-[9px] ml-1">
                                  {fb.totalTpm ?? 0}/{fb.totalTpa ?? 0}
                                </span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${tpPct ?? 0}%`, background: "linear-gradient(90deg,#ff4500,#ff8c00)" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center border-t border-white/10" style={{ background: "rgba(0,0,0,0.3)" }}>
                        {[
                          { label: "Dunks", val: fb.totalDunks ?? 0 },
                          { label: "Best Streak", val: fb.bestStreak },
                          { label: "Games", val: fb.gamesPlayed },
                        ].map((s, i) => (
                          <div key={s.label} className={`flex-1 py-2.5 text-center ${i < 2 ? "border-r border-white/10" : ""}`}>
                            <p className="font-black text-base text-white leading-none">{s.val}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                        {fbRank?.rank != null && (
                          <div className="py-2.5 text-center px-3 border-r border-white/10">
                            <p className="font-black text-base text-orange-400 leading-none">#{fbRank.rank}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">of {fbRank.total}</p>
                          </div>
                        )}
                        <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-orange-400 group-hover:text-orange-300 transition-colors border-l border-white/10">
                          Play →
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 pb-4 flex items-center justify-between">
                      <p className="text-sm text-white/30 italic">No games yet</p>
                      <span className="text-[11px] font-black uppercase tracking-widest text-orange-400 group-hover:text-orange-300 transition-colors">
                        Play Now →
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* ── WHO YA GOT ─────────────────────────────────────────────── */}
          {(() => {
            const wyg = arcadeStats?.whoYaGot ?? null;
            const wygPlayed = wyg?.gamesPlayed ?? 0;
            const wygScore  = wyg?.bestScore ?? 0;
            const goatIq = wygPlayed > 0
              ? Math.round((wygScore / Math.max(wygPlayed * 3, 1)) * 100)
              : 0;
            return (
              <Link href="/arcade/who-ya-got">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #0e0a1f 0%, #1a1040 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: "radial-gradient(ellipse at 100% 0%, rgba(168,85,247,0.2) 0%, transparent 55%)",
                  }} />
                  <div
                    className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                    style={{ background: "radial-gradient(circle at 80% 20%, rgba(234,179,8,0.12) 0%, transparent 70%)" }}
                  />
                  <div className="flex items-stretch">
                    <div className="p-4 flex flex-col justify-between" style={{ minWidth: 130 }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 16 }}>🏆</span>
                        <span className="font-display text-xs tracking-widest text-white/50 uppercase">Who Ya Got</span>
                      </div>
                      <div className="mt-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400/70 mb-0.5">High Score</p>
                        <p className="font-display leading-none" style={{ fontSize: "clamp(48px,11vw,68px)", color: "#c084fc" }}>
                          {wyg ? wyg.bestScore : "—"}
                        </p>
                      </div>
                      <span
                        className="mt-3 self-start text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-purple-500/50"
                        style={{ color: "#a855f7", background: "rgba(168,85,247,0.1)" }}
                      >
                        Trivia
                      </span>
                    </div>
                    <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      {wyg ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Best Streak</p>
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-3xl text-yellow-400">{wyg.bestStreak}</span>
                              <span className="text-[10px] text-white/30">in a row</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">GOAT IQ</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(goatIq, 100)}%`, background: "linear-gradient(90deg,#a855f7,#eab308)" }} />
                              </div>
                              <span className="text-[11px] font-black text-white">{Math.min(goatIq, 100)}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Games Played</p>
                            <span className="font-display text-3xl text-white/80">{wyg.gamesPlayed}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center h-full gap-1">
                          <p className="text-sm text-white/30 italic">No games yet</p>
                          <span className="text-[11px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300 transition-colors">
                            Play Now →
                          </span>
                        </div>
                      )}
                      {wyg && (
                        <div className="mt-2 flex items-center justify-between">
                          {wygRank?.rank != null && (
                            <div>
                              <span className="font-display text-xl text-purple-400">#{wygRank.rank}</span>
                              <span className="text-[9px] uppercase tracking-wider text-white/35 ml-1">of {wygRank.total}</span>
                            </div>
                          )}
                          <div className="self-end text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300 transition-colors">
                            Play →
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })()}

          {/* ── SHOT CLOCK ─────────────────────────────────────────────── */}
          {(() => {
            const sc = arcadeStats?.shotClock ?? null;
            return (
              <Link href="/arcade/shot-clock">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #1a0808 0%, #2a1010 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.15) 0%, transparent 60%)",
                  }} />
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 18 }}>⏱</span>
                      <span className="font-display text-sm tracking-widest text-white/60 uppercase">Shot Clock</span>
                    </div>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-red-500/60"
                      style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
                    >
                      Pressure
                    </span>
                  </div>
                  {sc ? (
                    <>
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-0.5">High Score</p>
                          <p className="font-display leading-none" style={{ fontSize: "clamp(52px,12vw,72px)", color: "#ef4444" }}>
                            {sc.bestScore}
                          </p>
                        </div>
                        <div className="flex-1 flex justify-end items-center pr-2">
                          <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-red-800/50" />
                            <div
                              className="absolute inset-1 rounded-full border-2 border-red-600/40"
                              style={{ animation: "ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-display text-xl text-red-500">{sc.bestStreak}</span>
                            </div>
                            <p className="absolute -bottom-4 left-0 right-0 text-center text-[8px] uppercase tracking-wider text-white/30">streak</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex border-t border-white/8" style={{ background: "rgba(0,0,0,0.35)" }}>
                        {[
                          { label: "Best Streak", val: sc.bestStreak, highlight: true },
                          { label: "Games Played", val: sc.gamesPlayed, highlight: false },
                        ].map((s, i) => (
                          <div key={s.label} className={`flex-1 py-3 text-center ${i < 1 ? "border-r border-white/8" : ""}`}>
                            <p className={`font-black text-xl leading-none ${s.highlight ? "text-red-400" : "text-white"}`}>{s.val}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                        {scRank?.rank != null && (
                          <div className="py-3 text-center px-3 border-r border-white/8">
                            <p className="font-black text-xl text-red-400 leading-none">#{scRank.rank}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">of {scRank.total}</p>
                          </div>
                        )}
                        <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-300 transition-colors border-l border-white/8">
                          Play →
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 pb-4 flex items-center justify-between">
                      <p className="text-sm text-white/30 italic">No games yet</p>
                      <span className="text-[11px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-300 transition-colors">
                        Play Now →
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* ── ISO BALL ────────────────────────────────────────────────── */}
          {(() => {
            const ib = isoBallData && isoBallData.sessionCount > 0 ? isoBallData : null;
            return (
              <Link href="/iso-ball">
                <div
                  className="relative overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, #0d0a1a 0%, #1a1030 100%)" }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.18) 0%, transparent 60%)" }} />
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 18 }}>🧠</span>
                      <span className="font-display text-sm tracking-widest text-white/60 uppercase">Iso Ball</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-purple-500/60" style={{ color: "#a855f7", background: "rgba(168,85,247,0.1)" }}>
                      Trivia
                    </span>
                  </div>
                  {ib ? (
                    <>
                      <div className="flex items-end gap-5 px-4 pb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Total Points</p>
                          <p className="font-display leading-none" style={{ fontSize: "clamp(52px,12vw,72px)", color: "#a855f7" }}>{ib.totalPoints}</p>
                        </div>
                        <div className="pb-1 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Level</p>
                          <p className="text-sm font-black text-purple-300">{ib.level}</p>
                          <p className="text-[10px] text-white/30">{ib.sessionCount} sessions</p>
                        </div>
                      </div>
                      <div className="flex items-center border-t border-white/8" style={{ background: "rgba(0,0,0,0.3)" }}>
                        {ibRank?.rank != null && (
                          <div className="py-2.5 text-center px-4 border-r border-white/10">
                            <p className="font-black text-base text-purple-400 leading-none">#{ibRank.rank}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/35 mt-0.5">of {ibRank.total}</p>
                          </div>
                        )}
                        <div className="flex-1 py-2.5 px-4 text-right text-[10px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300 transition-colors">
                          Play →
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 pb-4 flex items-center justify-between">
                      <p className="text-sm text-white/30 italic">No games yet</p>
                      <span className="text-[11px] font-black uppercase tracking-widest text-purple-400 group-hover:text-purple-300 transition-colors">Play Now →</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })()}
        </div>
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
