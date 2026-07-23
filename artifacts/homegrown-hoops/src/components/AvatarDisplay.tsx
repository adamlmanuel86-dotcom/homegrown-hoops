import { useEffect, useRef } from "react";
import { renderAvatarToCanvas, DEFAULT_AVATAR_CONFIG, type AvatarConfig } from "@/lib/avatarCanvas";

interface AvatarDisplayProps {
  config?: AvatarConfig | null;
  size?: number;
  scale?: number;
  className?: string;
  animate?: boolean;
}

export function AvatarDisplay({ config, size = 88, scale = 2.5, className }: AvatarDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfg = config ?? DEFAULT_AVATAR_CONFIG;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderAvatarToCanvas(canvas, cfg, { scale });
  }, [cfg, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={44 * scale}
      height={64 * scale}
      style={{ width: size, height: Math.round(size * (64 / 44)) }}
      className={className}
    />
  );
}
