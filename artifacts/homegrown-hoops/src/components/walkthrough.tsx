import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Star, Layers, Trophy, Droplets, BarChart2, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const SLIDES = [
  {
    icon: Star,
    iconColor: "#F97316",
    headline: "Your Profile Card",
    body: "This is yours. It updates after every game, every season. Share it anywhere.",
  },
  {
    icon: Trophy,
    iconColor: "#F59E0B",
    headline: "Stamps",
    body: "Earn Stamps through real performance. Double Digits. Full Flood. Glass Work. Nobody gives these to you — you earn them.",
  },
  {
    icon: Layers,
    iconColor: "#38BDF8",
    headline: "Archetypes",
    body: "Every player starts Uncharted. Your stats decide who you become. The Vortex. The Current. The Mainstay. Your game writes the story.",
  },
  {
    icon: Droplets,
    iconColor: "#34D399",
    headline: "Tides",
    body: "At the end of every season the best performers earn Tides. The Crest goes to one player. Will it be you?",
  },
  {
    icon: BarChart2,
    iconColor: "#A78BFA",
    headline: "Legacy Score",
    body: "Everything you do adds to your Legacy Score. It never resets. It follows you. It is yours forever.",
  },
  {
    icon: ArrowRight,
    iconColor: "#F97316",
    headline: "Your Game. Your Stats. Your Legacy.",
    body: "Welcome to Homegrown Hoops.",
    isLast: true,
  },
];

interface WalkthroughProps {
  onClose: () => void;
  afterClose?: () => void;
}

export function Walkthrough({ onClose, afterClose }: WalkthroughProps) {
  const [slide, setSlide] = useState(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function close() {
    onClose();
    afterClose?.();
  }

  function handleLetsGo() {
    onClose();
    setLocation("/");
  }

  const current = SLIDES[slide];
  const Icon = current.icon;
  const isLast = (current as typeof SLIDES[number] & { isLast?: boolean }).isLast;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(5,10,20,0.97)", backdropFilter: "blur(8px)" }}
    >
      {/* Skip button */}
      <button
        onClick={close}
        className="absolute top-5 right-5 flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm font-semibold"
      >
        <X className="h-4 w-4" /> Skip
      </button>

      {/* Slide content */}
      <div className="w-full max-w-sm mx-auto px-6 flex flex-col items-center text-center gap-8">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${current.iconColor}20`, boxShadow: `0 0 40px ${current.iconColor}30` }}
        >
          <Icon className="h-10 w-10" style={{ color: current.iconColor }} />
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h2
            className="font-display text-3xl text-white leading-tight"
            style={{ letterSpacing: "0.03em" }}
          >
            {current.headline.toUpperCase()}
          </h2>
          <p className="text-white/60 text-base leading-relaxed font-medium">
            {current.body}
          </p>
        </div>

        {/* CTA for last slide */}
        {isLast && (
          <button
            onClick={handleLetsGo}
            className="btn-primary text-base px-8 py-3 mt-2"
          >
            Let's Go <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Nav row */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={slide === 0}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`rounded-full transition-all ${
                  i === slide
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (slide < SLIDES.length - 1) setSlide((s) => s + 1);
              else close();
            }}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
