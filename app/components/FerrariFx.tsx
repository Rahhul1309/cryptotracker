import { useEffect, useRef, useState } from "react";

/**
 * Scuderia flourishes for the Ferrari theme ONLY (rendered by the dashboard
 * when `settings.theme === "ferrari"`). Triggered by the live toggle:
 *
 *  1. An F1 car speeding across a checkered finish line (CSS, see tailwind.css).
 *  2. A synthesized ENGINE REV via WebAudio — no audio asset. The rev's PEAK
 *     pitch scales with `momentum` (mean |24h change| across tracked coins), so
 *     a hot, volatile market revs higher than a flat one. Rev UP on enable, a
 *     down-shift blip on disable. Audio only plays from the user's click and is
 *     skipped under prefers-reduced-motion.
 *
 * We fire on CHANGES to `liveEnabled`, not the initial mount.
 */
function playEngineRev(up: boolean, momentum: number) {
  type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
  const Ctx =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const now = ctx.currentTime;

  // Map momentum (≈0–15%+) onto an extra pitch boost. Clamp so it stays musical.
  const boost = Math.min(Math.max(momentum, 0), 15) / 15; // 0..1
  const peak = up ? 360 + boost * 520 : 300; // hotter market → higher rev
  const cutoffPeak = up ? 2800 + boost * 3500 : 2500;

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  filter.type = "lowpass";

  if (up) {
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(peak, now + 0.55);
    osc.frequency.exponentialRampToValueAtTime(peak * 0.72, now + 0.85);
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(cutoffPeak, now + 0.6);
  } else {
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.5);
    filter.frequency.setValueAtTime(2500, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.95);
  osc.onended = () => void ctx.close();
}

/** A small inline F1 car (Ferrari red) — no external asset. */
function F1Car() {
  return (
    <svg
      className="ferrari-car"
      width="180"
      height="64"
      viewBox="0 0 180 64"
      fill="none"
      aria-hidden="true"
    >
      {/* rear wing */}
      <rect x="6" y="14" width="10" height="22" rx="2" fill="#b30000" />
      {/* body */}
      <path
        d="M14 40 L40 40 L60 30 L120 28 L150 34 L168 38 Q172 39 168 43 L150 45 L40 46 Q22 46 14 40 Z"
        fill="#ff2800"
      />
      {/* cockpit + halo */}
      <circle cx="96" cy="28" r="6" fill="#1a1012" />
      <path d="M90 28 q6 -10 12 0" stroke="#ffd000" strokeWidth="2" fill="none" />
      {/* front wing */}
      <rect x="158" y="40" width="18" height="5" rx="2" fill="#b30000" />
      {/* wheels */}
      <circle cx="52" cy="48" r="10" fill="#0c0a0a" stroke="#3a3a3a" strokeWidth="2" />
      <circle cx="132" cy="48" r="10" fill="#0c0a0a" stroke="#3a3a3a" strokeWidth="2" />
      {/* speed lines */}
      <g stroke="#ffd000" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="0" y1="22" x2="20" y2="22" />
        <line x1="2" y1="52" x2="26" y2="52" />
      </g>
    </svg>
  );
}

export function FerrariFx({
  liveEnabled,
  momentum,
}: {
  liveEnabled: boolean;
  /** Mean absolute 24h change (%) across tracked coins — scales the rev. */
  momentum: number;
}) {
  const [racing, setRacing] = useState(false);
  const prev = useRef<boolean | null>(null);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = liveEnabled;
      return;
    }
    if (prev.current === liveEnabled) return;
    const turnedOn = liveEnabled;
    prev.current = liveEnabled;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;

    if (turnedOn) {
      setRacing(true);
      window.setTimeout(() => setRacing(false), 1600);
    }
    try {
      playEngineRev(turnedOn, momentum);
    } catch {
      /* audio not permitted / unsupported — ignore */
    }
  }, [liveEnabled, momentum]);

  if (!racing) return null;
  return (
    <div
      className="ferrari-race pointer-events-none fixed inset-0 z-[55] overflow-hidden"
      aria-hidden="true"
    >
      {/* the checkered finish line the car blasts through */}
      <div className="ferrari-finish" />
      <div className="ferrari-car-track">
        <F1Car />
      </div>
    </div>
  );
}
