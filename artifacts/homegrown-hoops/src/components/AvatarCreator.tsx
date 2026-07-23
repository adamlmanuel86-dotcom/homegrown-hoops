import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type AvatarConfig,
  renderAvatarToCanvas,
  randomAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  SKIN_TONES,
  JERSEY_PRESETS,
  SHORTS_PRESETS,
  HAIR_ACCESSORY_COLORS,
  HAIR_STYLES,
  BUILD_KEYS,
  ACCESSORY_KEYS,
  EYEBROW_STYLES,
  MOUTH_STYLES,
} from "@/lib/avatarCanvas";
import { apiBase } from "@/lib/api";

interface AvatarCreatorProps {
  initialConfig?: AvatarConfig | null;
  onSaved?: (config: AvatarConfig) => void;
}

function hexInt(n: number) {
  return "#" + n.toString(16).padStart(6, "0");
}

function SwatchRow({ values, selected, onSelect }: { values: number[]; selected: number; onSelect: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onSelect(v)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${selected === v ? "border-primary scale-110 shadow-[0_0_0_2px_rgba(255,122,26,0.4)]" : "border-white/20"}`}
          style={{ background: hexInt(v) }}
          title={hexInt(v)}
        />
      ))}
    </div>
  );
}

function OptRow<T extends string>({ values, selected, onSelect, label }: { values: T[]; selected: T; onSelect: (v: T) => void; label?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onSelect(v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selected === v ? "bg-primary border-primary text-white" : "bg-background border-white/15 text-white/60 hover:border-white/40 hover:text-white"}`}
        >
          {label ? label(v) : v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary border border-white/10 rounded-xl p-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
        <span className="w-1 h-3 bg-primary rounded-full inline-block" />
        {title}
      </h3>
      {children}
    </div>
  );
}

const PREVIEW_SCALE = 3;
const CANVAS_W = 44 * PREVIEW_SCALE;
const CANVAS_H = 64 * PREVIEW_SCALE;

export function AvatarCreator({ initialConfig, onSaved }: AvatarCreatorProps) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  const [config, setConfig] = useState<AvatarConfig>(initialConfig ?? DEFAULT_AVATAR_CONFIG);
  const [animating, setAnimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"saved" | "error" | null>(null);

  const redraw = useCallback((cfg: AvatarConfig, runFrame?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderAvatarToCanvas(canvas, cfg, { scale: PREVIEW_SCALE, runFrame });
  }, []);

  useEffect(() => {
    redraw(config, animating ? frameRef.current : undefined);
  }, [config, redraw, animating]);

  useEffect(() => {
    if (!animating) {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      return;
    }
    let last = 0;
    function loop(ts: number) {
      if (ts - last > 260) {
        frameRef.current = frameRef.current === 0 ? 1 : 0;
        redraw(config, frameRef.current);
        last = ts;
      }
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); };
  }, [animating, config, redraw]);

  function update(patch: Partial<AvatarConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  function updateAccessory(key: keyof AvatarConfig["accessories"]) {
    setConfig((prev) => ({ ...prev, accessories: { ...prev.accessories, [key]: !prev.accessories[key] } }));
  }

  function randomize() {
    const r = randomAvatarConfig();
    setConfig(r);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = await getToken();
      const res = await fetch(`${apiBase}/profiles/me/avatar-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarConfig: config }),
      });
      if (!res.ok) throw new Error("save failed");
      await qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setSaveMsg("saved");
      onSaved?.(config);
    } catch {
      setSaveMsg("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview card */}
      <div className="bg-secondary border-2 border-primary/40 rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="text-xs font-black uppercase tracking-widest text-white/40">Preview</div>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: CANVAS_W / PREVIEW_SCALE * 3.5, height: CANVAS_H / PREVIEW_SCALE * 3.5, imageRendering: "auto" }}
          className="rounded-lg"
        />
        <button
          onClick={() => setAnimating((a) => !a)}
          className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-colors ${animating ? "bg-primary border-primary text-white" : "border-white/20 text-white/50 hover:text-white hover:border-white/40"}`}
        >
          {animating ? "⏸ Stop" : "▶ Preview run"}
        </button>
      </div>

      {/* Pickers */}
      <Section title="Skin Tone">
        <SwatchRow values={SKIN_TONES} selected={config.skin} onSelect={(v) => update({ skin: v })} />
      </Section>

      <Section title="Build">
        <OptRow values={BUILD_KEYS} selected={config.build} onSelect={(v) => update({ build: v })} />
      </Section>

      <Section title="Hair Style">
        <OptRow values={HAIR_STYLES} selected={config.hairStyle} onSelect={(v) => update({ hairStyle: v })} />
      </Section>

      <Section title="Hair Color">
        <SwatchRow values={HAIR_ACCESSORY_COLORS} selected={config.hairColor} onSelect={(v) => update({ hairColor: v })} />
      </Section>

      <Section title="Jersey Color">
        <SwatchRow values={JERSEY_PRESETS} selected={config.jersey} onSelect={(v) => update({ jersey: v })} />
        <div className="mt-3">
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Custom color</label>
          <div className="mt-1">
            <input
              type="color"
              value={hexInt(config.jersey)}
              onChange={(e) => update({ jersey: parseInt(e.target.value.slice(1), 16) })}
              className="w-10 h-8 rounded cursor-pointer border border-white/20 bg-transparent p-0"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Jersey Style</label>
          <div className="mt-1">
            <OptRow values={["solid", "pinstripe"] as AvatarConfig["jerseyStyle"][]} selected={config.jerseyStyle} onSelect={(v) => update({ jerseyStyle: v })} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Secondary Color (pinstripes & number)</label>
          <div className="mt-1">
            <SwatchRow values={HAIR_ACCESSORY_COLORS} selected={config.secondaryColor} onSelect={(v) => update({ secondaryColor: v })} />
          </div>
        </div>
      </Section>

      <Section title="Shorts Color">
        <SwatchRow values={SHORTS_PRESETS} selected={config.shorts} onSelect={(v) => update({ shorts: v })} />
        <div className="mt-2">
          <input
            type="color"
            value={hexInt(config.shorts)}
            onChange={(e) => update({ shorts: parseInt(e.target.value.slice(1), 16) })}
            className="w-10 h-8 rounded cursor-pointer border border-white/20 bg-transparent p-0"
          />
        </div>
      </Section>

      <Section title="Accessories">
        <div className="flex flex-wrap gap-2 mb-3">
          {ACCESSORY_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => updateAccessory(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${config.accessories[k] ? "bg-primary border-primary text-white" : "bg-background border-white/15 text-white/60 hover:border-white/40"}`}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Accessory Color</label>
        <div className="mt-1">
          <SwatchRow values={HAIR_ACCESSORY_COLORS} selected={config.accessoryColor} onSelect={(v) => update({ accessoryColor: v })} />
        </div>
      </Section>

      <Section title="Expression">
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Eyebrows</label>
        <div className="mt-1 mb-3">
          <OptRow values={EYEBROW_STYLES} selected={config.eyebrows} onSelect={(v) => update({ eyebrows: v })} />
        </div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Mouth</label>
        <div className="mt-1">
          <OptRow values={MOUTH_STYLES} selected={config.mouth} onSelect={(v) => update({ mouth: v })} />
        </div>
      </Section>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={randomize}
          className="flex-1 py-3 rounded-xl bg-secondary border border-white/20 text-white font-black text-sm hover:bg-white/10 transition-colors"
        >
          🎲 Randomize
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Avatar"}
        </button>
      </div>

      {saveMsg === "saved" && (
        <p className="text-green-400 text-xs text-center font-bold">✓ Avatar saved!</p>
      )}
      {saveMsg === "error" && (
        <p className="text-red-400 text-xs text-center font-bold">Save failed — try again</p>
      )}
    </div>
  );
}
