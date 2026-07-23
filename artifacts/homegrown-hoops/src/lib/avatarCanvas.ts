export type AvatarConfig = {
  skin: number;
  build: "standard" | "stocky" | "lanky";
  hairStyle: "fade" | "curls" | "bald" | "long" | "afro" | "mohawk" | "flattop";
  hairColor: number;
  jersey: number;
  jerseyStyle: "solid" | "pinstripe";
  secondaryColor: number;
  shorts: number;
  accessories: { headband: boolean; wristbands: boolean; kneepads: boolean };
  accessoryColor: number;
  eyebrows: "none" | "angry" | "raised";
  mouth: "neutral" | "smile" | "smirk" | "frown";
};

export const BUILDS = {
  lanky: { w: 0.85, h: 1.12 },
  standard: { w: 1, h: 1 },
  stocky: { w: 1.18, h: 0.92 },
} as const;

export const SKIN_TONES = [0xf0c9a0, 0xd8a878, 0xc98a5b, 0x8a5a34, 0x6b4226];
export const JERSEY_PRESETS = [0x14213d, 0xff7a1a, 0xe63946, 0x2f6fed, 0x2ecc71, 0x9b59b6, 0xffd23f, 0x1a1a1a];
export const SHORTS_PRESETS = [0x0a0f1e, 0x1a1a1a, 0x2a1f05, 0x1a1230, 0x102a1c, 0x6b1f2a, 0x14213d, 0xffffff];
export const HAIR_ACCESSORY_COLORS = [0x0a0a0a, 0x3a2418, 0x6b4226, 0xd4a843, 0xb33d1f, 0x9a9a9a, 0xffffff, 0xff7a1a, 0xe63946, 0x2f6fed, 0xffd23f, 0x2ecc71, 0x9b59b6];
export const HAIR_STYLES: AvatarConfig["hairStyle"][] = ["fade", "curls", "bald", "long", "afro", "mohawk", "flattop"];
export const BUILD_KEYS: AvatarConfig["build"][] = ["standard", "stocky", "lanky"];
export const ACCESSORY_KEYS: (keyof AvatarConfig["accessories"])[] = ["headband", "wristbands", "kneepads"];
export const EYEBROW_STYLES: AvatarConfig["eyebrows"][] = ["none", "angry", "raised"];
export const MOUTH_STYLES: AvatarConfig["mouth"][] = ["neutral", "smile", "smirk", "frown"];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: SKIN_TONES[0],
  build: "standard",
  hairStyle: "fade",
  hairColor: HAIR_ACCESSORY_COLORS[0],
  jersey: 0x14213d,
  jerseyStyle: "solid",
  secondaryColor: HAIR_ACCESSORY_COLORS[6],
  shorts: 0x0a0f1e,
  accessories: { headband: false, wristbands: false, kneepads: false },
  accessoryColor: HAIR_ACCESSORY_COLORS[0],
  eyebrows: "none",
  mouth: "neutral",
};

function hexIntToRgba(color: number, alpha: number): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

type G = ReturnType<typeof makeG>;

function makeG(ctx: CanvasRenderingContext2D, scale = 1) {
  const s = scale;
  return {
    fillStyle(color: number, alpha = 1) {
      ctx.fillStyle = hexIntToRgba(color, alpha);
    },
    fillRect(x: number, y: number, w: number, h: number) {
      ctx.fillRect(x * s, y * s, w * s, h * s);
    },
    fillRoundedRect(x: number, y: number, w: number, h: number, r: number) {
      const sx = x * s, sy = y * s, sw = w * s, sh = h * s, sr = Math.min(r * s, sw / 2, sh / 2);
      if (sr <= 0) { ctx.fillRect(sx, sy, sw, sh); return; }
      ctx.beginPath();
      ctx.moveTo(sx + sr, sy);
      ctx.lineTo(sx + sw - sr, sy);
      ctx.arcTo(sx + sw, sy, sx + sw, sy + sr, sr);
      ctx.lineTo(sx + sw, sy + sh - sr);
      ctx.arcTo(sx + sw, sy + sh, sx + sw - sr, sy + sh, sr);
      ctx.lineTo(sx + sr, sy + sh);
      ctx.arcTo(sx, sy + sh, sx, sy + sh - sr, sr);
      ctx.lineTo(sx, sy + sr);
      ctx.arcTo(sx, sy, sx + sr, sy, sr);
      ctx.closePath();
      ctx.fill();
    },
    fillCircle(x: number, y: number, r: number) {
      if (r <= 0) return;
      ctx.beginPath();
      ctx.arc(x * s, y * s, r * s, 0, 2 * Math.PI);
      ctx.fill();
    },
    fillEllipse(x: number, y: number, w: number, h: number) {
      if (w <= 0 || h <= 0) return;
      ctx.beginPath();
      ctx.ellipse(x * s, y * s, (w / 2) * s, (h / 2) * s, 0, 0, 2 * Math.PI);
      ctx.fill();
    },
    fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) {
      ctx.beginPath();
      ctx.moveTo(x0 * s, y0 * s);
      ctx.lineTo(x1 * s, y1 * s);
      ctx.lineTo(x2 * s, y2 * s);
      ctx.closePath();
      ctx.fill();
    },
  };
}

export type DrawPalette = {
  skin: number;
  jersey: number;
  jerseyStyle: "solid" | "pinstripe";
  secondaryColor: number;
  shorts: number;
  hair: { style: AvatarConfig["hairStyle"]; color: number };
  build: AvatarConfig["build"];
  accessories: AvatarConfig["accessories"];
  accessoryColor: number;
  expression: { eyebrows: AvatarConfig["eyebrows"]; mouth: AvatarConfig["mouth"] };
};

export function avatarConfigToPalette(cfg: AvatarConfig): DrawPalette {
  return {
    skin: cfg.skin,
    jersey: cfg.jersey,
    jerseyStyle: cfg.jerseyStyle,
    secondaryColor: cfg.secondaryColor,
    shorts: cfg.shorts,
    hair: { style: cfg.hairStyle, color: cfg.hairColor },
    build: cfg.build,
    accessories: cfg.accessories,
    accessoryColor: cfg.accessoryColor,
    expression: { eyebrows: cfg.eyebrows, mouth: cfg.mouth },
  };
}

function drawBaller(
  g: G,
  palette: DrawPalette,
  runFrame?: number,
  armPose?: "both" | "one" | "lean",
  poseColor?: number,
  showFace?: boolean,
) {
  const { skin, jersey, shorts, hair, build } = palette;
  const b = BUILDS[build];
  const cx = 22 * b.w, legW = 7 * b.w, torsoW = 20 * b.w, torsoH = 22 * b.h;
  const headR = 8.8 * b.w;
  const headY = 12 * b.h;
  const torsoY = headY + headR + 2;
  const legY = torsoY + torsoH;
  const stride = runFrame === undefined ? 0 : 3;
  const leftLift = runFrame === 1 ? stride : 0;
  const rightLift = runFrame === 0 ? stride : 0;
  const leftLegH = 14 * b.h - leftLift;
  const rightLegH = 14 * b.h - rightLift;
  const leanSpread = armPose === "lean" ? 4 : 0;
  const pc = poseColor ?? 0xff7a1a;

  g.fillStyle(skin, 1);
  g.fillRoundedRect(cx - legW - 2 - leftLift * 0.4 - leanSpread, legY + leftLift, legW, leftLegH, 2);
  g.fillRoundedRect(cx + 2 + rightLift * 0.4 + leanSpread, legY + rightLift, legW, rightLegH, 2);
  g.fillStyle(0x1c1c1c, 1);
  g.fillRoundedRect(cx - legW - 3 - leftLift * 0.4 - leanSpread, legY + leftLift + leftLegH - 1, legW + 2, 5, 2);
  g.fillRoundedRect(cx + 1 + rightLift * 0.4 + leanSpread, legY + rightLift + rightLegH - 1, legW + 2, 5, 2);
  g.fillStyle(shorts, 1);
  g.fillRoundedRect(cx - torsoW / 2, torsoY + torsoH - 8, torsoW / 2 - 1, 17, 2);
  g.fillRoundedRect(cx + 1, torsoY + torsoH - 8, torsoW / 2 - 1, 17, 2);

  let lWrist: { x: number; y: number; ang: number } | undefined;
  let rWrist: { x: number; y: number; ang: number } | undefined;

  if (armPose === "both") {
    g.fillStyle(skin, 1);
    g.fillRoundedRect(cx - torsoW / 2 - 15, torsoY + 3, 13, 5, 2);
    g.fillRoundedRect(cx + torsoW / 2 + 2, torsoY + 3, 13, 5, 2);
    g.fillStyle(pc, 1);
    g.fillCircle(cx - torsoW / 2 - 15, torsoY + 5.5, 4);
    g.fillCircle(cx + torsoW / 2 + 15, torsoY + 5.5, 4);
    lWrist = { x: cx - torsoW / 2 - 9, y: torsoY + 5, ang: 0 };
    rWrist = { x: cx + torsoW / 2 + 9, y: torsoY + 5, ang: 0 };
  } else if (armPose === "one") {
    g.fillStyle(skin, 1);
    g.fillRoundedRect(cx - torsoW / 2 - 15, torsoY + 1, 13, 5, 2);
    g.fillStyle(pc, 1);
    g.fillCircle(cx - torsoW / 2 - 15, torsoY + 3.5, 4);
    g.fillStyle(skin, 1);
    g.fillRoundedRect(cx + torsoW / 2, torsoY + 2, 5, 16 * b.h, 2);
    lWrist = { x: cx - torsoW / 2 - 9, y: torsoY + 3, ang: 0 };
    rWrist = { x: cx + torsoW / 2 + 2.5, y: torsoY + 2 + 16 * b.h * 0.68, ang: 1 };
  } else {
    g.fillStyle(skin, 1);
    g.fillRoundedRect(cx - torsoW / 2 - 5, torsoY + 2 + rightLift * 0.3, 5, 16 * b.h, 2);
    g.fillRoundedRect(cx + torsoW / 2, torsoY + 2 + leftLift * 0.3, 5, 16 * b.h, 2);
    lWrist = { x: cx - torsoW / 2 - 2.5, y: torsoY + 2 + rightLift * 0.3 + 16 * b.h * 0.66, ang: 1 };
    rWrist = { x: cx + torsoW / 2 + 2.5, y: torsoY + 2 + leftLift * 0.3 + 16 * b.h * 0.66, ang: 1 };
  }

  g.fillStyle(jersey, 1);
  g.fillRoundedRect(cx - torsoW / 2, torsoY, torsoW, torsoH, 5);

  if (palette.jerseyStyle === "pinstripe") {
    const stripeColor = palette.secondaryColor || 0xffffff;
    const stripeCount = 4;
    for (let i = 0; i < stripeCount; i++) {
      const sx = cx - torsoW / 2 + (torsoW / (stripeCount + 1)) * (i + 1);
      g.fillStyle(stripeColor, 0.55);
      g.fillRect(sx - 0.6, torsoY + 2, 1.2, torsoH - 4);
    }
  }

  g.fillStyle(0xffffff, 0.85);
  g.fillRect(cx - torsoW / 2 + 3, torsoY + 3, torsoW - 6, 3);

  const capCenterY = headY - headR * 0.65;
  const capHalfW = headR * 0.85;

  g.fillStyle(hair.color, 1);
  if (hair.style === "afro") {
    g.fillEllipse(cx, headY - headR * 0.24, headR * 2.7, headR * 2.05);
  } else if (hair.style === "long") {
    g.fillRoundedRect(cx - headR * 0.88, headY - headR * 1.25, headR * 1.76, headR * 1.75, headR * 0.5);
    g.fillRoundedRect(cx - headR * 1.25, headY - headR * 0.05, headR * 2.5, headR * 1.35, headR * 0.6);
  }

  g.fillStyle(skin, 1);
  g.fillCircle(cx, headY, headR);

  g.fillStyle(hair.color, 1);
  if (hair.style === "fade") {
    g.fillEllipse(cx, capCenterY, capHalfW * 2, headR * 0.95);
    const hairlineY = headY - headR * 0.25;
    g.fillRect(cx - capHalfW, capCenterY, capHalfW * 2, hairlineY - capCenterY);
  } else if (hair.style === "curls") {
    g.fillEllipse(cx, capCenterY, capHalfW * 1.85, headR * 0.9);
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const ang = Math.PI + t * Math.PI;
      const bx = cx + Math.cos(ang) * capHalfW * 0.95;
      const by = capCenterY + Math.sin(ang) * headR * 0.32;
      g.fillCircle(bx, by, headR * 0.19);
    }
  } else if (hair.style === "mohawk") {
    g.fillTriangle(cx - headR * 0.36, headY - headR * 0.75, cx + headR * 0.36, headY - headR * 0.75, cx, headY - headR * 1.25);
  } else if (hair.style === "flattop") {
    g.fillRect(cx - headR * 0.95, headY - headR * 1.05, headR * 1.9, headR * 0.75);
  }

  if (showFace === false && (hair.style === "long" || hair.style === "afro")) {
    g.fillStyle(hair.color, 1);
    g.fillCircle(cx, headY, headR);
  }

  const expr = palette.expression;
  if (showFace !== false) {
    if (expr.eyebrows === "angry") {
      g.fillStyle(hair.color, 0.95);
      g.fillTriangle(cx - headR * 0.58, headY - headR * 0.2, cx - headR * 0.15, headY - headR * 0.03, cx - headR * 0.58, headY - headR * 0.05);
      g.fillTriangle(cx + headR * 0.58, headY - headR * 0.2, cx + headR * 0.15, headY - headR * 0.03, cx + headR * 0.58, headY - headR * 0.05);
    } else if (expr.eyebrows === "raised") {
      g.fillStyle(hair.color, 0.9);
      g.fillRoundedRect(cx - headR * 0.52, headY - headR * 0.24, headR * 0.34, headR * 0.09, headR * 0.04);
      g.fillRoundedRect(cx + headR * 0.18, headY - headR * 0.24, headR * 0.34, headR * 0.09, headR * 0.04);
    }

    g.fillStyle(0xffffff, 1);
    g.fillEllipse(cx - headR * 0.37, headY + headR * 0.04, headR * 0.42, headR * 0.36);
    g.fillEllipse(cx + headR * 0.37, headY + headR * 0.04, headR * 0.42, headR * 0.36);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(cx - headR * 0.33, headY + headR * 0.07, headR * 0.19);
    g.fillCircle(cx + headR * 0.41, headY + headR * 0.07, headR * 0.19);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(cx - headR * 0.27, headY + headR * 0.01, headR * 0.07);
    g.fillCircle(cx + headR * 0.47, headY + headR * 0.01, headR * 0.07);

    g.fillStyle(0xe8836b, 0.28);
    g.fillCircle(cx - headR * 0.5, headY + headR * 0.22, headR * 0.14);
    g.fillCircle(cx + headR * 0.5, headY + headR * 0.22, headR * 0.14);
    g.fillStyle(0x000000, 0.18);
    g.fillCircle(cx - headR * 0.03, headY + headR * 0.22, headR * 0.05);
    g.fillCircle(cx + headR * 0.1, headY + headR * 0.22, headR * 0.05);

    const my = headY + headR * 0.42;
    g.fillStyle(0x8a4a3a, 0.85);
    if (expr.mouth === "smile") {
      g.fillRoundedRect(cx - headR * 0.26, my - headR * 0.02, headR * 0.52, headR * 0.14, headR * 0.07);
      g.fillCircle(cx - headR * 0.29, my + headR * 0.03, headR * 0.06);
      g.fillCircle(cx + headR * 0.29, my + headR * 0.03, headR * 0.06);
    } else if (expr.mouth === "smirk") {
      g.fillRoundedRect(cx - headR * 0.2, my, headR * 0.4, headR * 0.11, headR * 0.05);
      g.fillCircle(cx + headR * 0.24, my - headR * 0.03, headR * 0.06);
    } else if (expr.mouth === "frown") {
      g.fillRoundedRect(cx - headR * 0.22, my + headR * 0.06, headR * 0.44, headR * 0.12, headR * 0.06);
      g.fillCircle(cx - headR * 0.25, my + headR * 0.14, headR * 0.055);
      g.fillCircle(cx + headR * 0.25, my + headR * 0.14, headR * 0.055);
    } else {
      g.fillRoundedRect(cx - headR * 0.24, my, headR * 0.48, headR * 0.13, headR * 0.06);
    }
  }

  if (palette.accessories) {
    const ac = palette.accessoryColor || 0xffffff;
    g.fillStyle(ac, 1);
    if (palette.accessories.headband) {
      g.fillRect(cx - headR, headY - headR * 0.42, headR * 2, headR * 0.3);
    }
    if (palette.accessories.wristbands && lWrist && rWrist) {
      for (const w of [lWrist, rWrist]) {
        if (w.ang === 1) {
          g.fillRoundedRect(w.x - 4.5, w.y - 2.5, 9, 5, 2);
        } else {
          g.fillRoundedRect(w.x - 2.5, w.y - 4, 5, 8, 2);
        }
      }
    }
    if (palette.accessories.kneepads) {
      g.fillRoundedRect(cx - legW - 4 - leanSpread, legY + 4, legW + 4, 6, 2);
      g.fillRoundedRect(cx + leanSpread, legY + 4, legW + 4, 6, 2);
    }
  }
}

export function renderAvatarToCanvas(
  canvas: HTMLCanvasElement,
  config: AvatarConfig,
  options: { scale?: number; runFrame?: number; armPose?: "both" | "one" | "lean" } = {},
) {
  const { scale = 2, runFrame, armPose } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = makeG(ctx, scale);
  drawBaller(g, avatarConfigToPalette(config), runFrame, armPose);
}

export function randomAvatarConfig(): AvatarConfig {
  const rand = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    skin: rand(SKIN_TONES),
    build: rand(BUILD_KEYS),
    hairStyle: rand(HAIR_STYLES),
    hairColor: rand(HAIR_ACCESSORY_COLORS),
    jersey: rand(JERSEY_PRESETS),
    jerseyStyle: Math.random() < 0.4 ? "pinstripe" : "solid",
    secondaryColor: rand(HAIR_ACCESSORY_COLORS),
    shorts: rand(SHORTS_PRESETS),
    accessories: {
      headband: Math.random() < 0.3,
      wristbands: Math.random() < 0.3,
      kneepads: Math.random() < 0.3,
    },
    accessoryColor: rand(HAIR_ACCESSORY_COLORS),
    eyebrows: rand(EYEBROW_STYLES),
    mouth: rand(MOUTH_STYLES),
  };
}
