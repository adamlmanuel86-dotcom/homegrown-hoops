import { useId } from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BALL_PX = { sm: 28, md: 36, lg: 60 } as const;
const NAME_CLS = { sm: "text-[12px]", md: "text-[15px]", lg: "text-[24px]" } as const;
const TAG_CLS  = { sm: "text-[9px]",  md: "text-[11px]", lg: "text-[17px]" } as const;

export function HomegrownHoopsLogo({ size = "md", className }: LogoProps) {
  const uid = useId().replace(/:/g, "u");

  return (
    <div className={`flex items-center gap-2.5 select-none ${className ?? ""}`}>
      <BasketballSVG size={BALL_PX[size]} uid={uid} />
      <div className="flex flex-col leading-none gap-[2px]">
        <span className={`font-display tracking-wide text-white ${NAME_CLS[size]}`}>
          HOMEGROWN
        </span>
        <span className={`font-display tracking-[0.18em] text-primary ${TAG_CLS[size]}`}>
          HOOPS
        </span>
      </div>
    </div>
  );
}

function BasketballSVG({ size, uid }: { size: number; uid: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Radial gradient — bright highlight top-left, deep shadow bottom-right */}
        <radialGradient
          id={`ball-${uid}`}
          cx="38%"
          cy="28%"
          r="68%"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%"   stopColor="#F78A36" />
          <stop offset="45%"  stopColor="#E16013" />
          <stop offset="100%" stopColor="#922E06" />
        </radialGradient>

        {/* Inner shadow ring at bottom edge */}
        <radialGradient
          id={`shadow-${uid}`}
          cx="50%"
          cy="85%"
          r="55%"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%"   stopColor="#5A1800" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#5A1800" stopOpacity="0" />
        </radialGradient>

        <clipPath id={`clip-${uid}`}>
          <circle cx="20" cy="20" r="19" />
        </clipPath>
      </defs>

      {/* ── Ball body ── */}
      <circle cx="20" cy="20" r="19" fill={`url(#ball-${uid})`} />
      {/* Depth shadow overlay */}
      <circle cx="20" cy="20" r="19" fill={`url(#shadow-${uid})`} />

      {/* ── Seams (clipped to ball) ── */}

      {/* Horizontal ocean-wave seam — two gentle crests across the equator */}
      <path
        d="M1,20
           C 3.5,17.2  7.5,17.2  10,20
           C 12.5,22.8 16.5,22.8 19,20
           C 21.5,17.2 25.5,17.2 28,20
           C 30.5,22.8 34.5,22.8 37,20
           C 38.5,19  40,19.5  39,20"
        stroke="#6A1F00"
        strokeWidth="1.6"
        strokeLinecap="round"
        clipPath={`url(#clip-${uid})`}
      />

      {/* Second faint wave below — suggests rolling surf */}
      <path
        d="M3,24.5
           C 5.5,22.2  9,22.2  11.5,24.5
           C 14,26.8  17.5,26.8 20,24.5
           C 22.5,22.2 26,22.2  28.5,24.5
           C 31,26.8  35,26.8  37.5,24.5"
        stroke="#6A1F00"
        strokeWidth="0.9"
        strokeLinecap="round"
        clipPath={`url(#clip-${uid})`}
        opacity="0.55"
      />

      {/* Vertical S-curve seam (classic basketball meridian) */}
      <path
        d="M20,1 C28,5 28,18 20,20 C12,22 12,36 20,39"
        stroke="#6A1F00"
        strokeWidth="1.6"
        strokeLinecap="round"
        clipPath={`url(#clip-${uid})`}
      />

      {/* Left panel arc */}
      <path
        d="M5.5,3.5 C -3,13 -3,27 5.5,36.5"
        stroke="#6A1F00"
        strokeWidth="1.4"
        strokeLinecap="round"
        clipPath={`url(#clip-${uid})`}
        opacity="0.65"
      />

      {/* Right panel arc */}
      <path
        d="M34.5,3.5 C43,13 43,27 34.5,36.5"
        stroke="#6A1F00"
        strokeWidth="1.4"
        strokeLinecap="round"
        clipPath={`url(#clip-${uid})`}
        opacity="0.65"
      />

      {/* ── Specular highlight ── */}
      <ellipse
        cx="13.5"
        cy="11"
        rx="5"
        ry="3.2"
        fill="white"
        opacity="0.18"
        transform="rotate(-20 13.5 11)"
      />

      {/* ── Ball outline ── */}
      <circle
        cx="20"
        cy="20"
        r="19"
        stroke="#5A1800"
        strokeWidth="0.6"
        opacity="0.35"
      />
    </svg>
  );
}
