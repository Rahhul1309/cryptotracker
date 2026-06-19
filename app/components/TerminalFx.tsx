import { useEffect, useRef, useState } from "react";

/**
 * Immersive effects layer for the Terminal (developer) theme ONLY. Rendered by
 * the dashboard when `settings.theme === "terminal"`. Three parts:
 *
 *  1. Matrix "digital rain" on a fixed canvas behind the content (crypto tickers
 *     + katakana glyphs falling in phosphor green).
 *  2. A CRT overlay (scanlines + vignette + flicker) handled in CSS via the
 *     `.terminal-fx` wrapper — see tailwind.css.
 *  3. Easter eggs (see EASTER_EGGS below): the Konami code, typed secret words,
 *     and a hidden devtools console banner. All harmless, all dev-flavored.
 *
 * Everything here is client-only and respects prefers-reduced-motion (the rain
 * falls back to a static dim grid; no flicker).
 */

const GLYPHS = "アカサタナハマヤラワ0123456789₿Ξ◈⟠$BTCETHSOLXRP".split("");

function MatrixRain({ boosted }: { boosted: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boostedRef = useRef(boosted);
  boostedRef.current = boosted;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let columns = 0;
    let drops: number[] = [];
    const fontSize = 16;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor((Math.random() * canvas.height) / fontSize),
      );
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let lastDraw = 0;

    const draw = (t: number) => {
      raf = window.requestAnimationFrame(draw);
      // Throttle (~24fps normal, ~40fps boosted) for a calm, readable rain.
      const interval = boostedRef.current ? 25 : 42;
      if (t - lastDraw < interval) return;
      lastDraw = t;

      // Translucent black fade leaves trailing tails.
      ctx.fillStyle = "rgba(13, 17, 23, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
        const x = i * fontSize;
        const y = drops[i]! * fontSize;
        // Leading glyph brighter than the tail.
        ctx.fillStyle = boostedRef.current ? "#7CFFB0" : "#2ea043";
        ctx.fillText(glyph, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]!++;
      }
    };

    if (reduce) {
      // Static dim grid instead of animation.
      ctx.fillStyle = "rgba(13,17,23,1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      raf = window.requestAnimationFrame(draw);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.12]"
      aria-hidden="true"
    />
  );
}

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/** Typed secret words → a little message. The "magic" of discovery. */
const SECRET_WORDS: Record<string, string> = {
  hodl: "💎🙌 HODL mode engaged — diamond hands detected.",
  moon: "🚀 To the moon. (Not financial advice.)",
  rekt: "📉 Stay humble, stack sats.",
  satoshi: "🕵️  Satoshi was here. Block 0 mined 2009-01-03.",
  lambo: "🏎️  wen lambo? ser, this is a dashboard.",
};

export function TerminalFx() {
  const [boosted, setBoosted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const konamiIdx = useRef(0);
  const typed = useRef("");

  // Devtools console banner — a classic, harmless dev easter egg.
  useEffect(() => {
    const css = "color:#3fb950;font-family:monospace;font-size:12px";
    // eslint-disable-next-line no-console
    console.log(
      "%c┌─[ CryptoTracker // terminal mode ]\n│ you found the console. try the konami code,\n│ or type: hodl · moon · satoshi · lambo\n└─ gm ☕",
      css,
    );
  }, []);

  useEffect(() => {
    const showToast = (msg: string) => {
      setToast(msg);
      window.setTimeout(() => setToast(null), 3200);
    };

    const onKey = (e: KeyboardEvent) => {
      // Ignore while typing in inputs.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Konami code.
      const expected = KONAMI[konamiIdx.current];
      if (e.key === expected || e.key.toLowerCase() === expected) {
        konamiIdx.current++;
        if (konamiIdx.current === KONAMI.length) {
          konamiIdx.current = 0;
          setBoosted((b) => !b);
          showToast("⛏️  Konami unlocked — MATRIX OVERDRIVE toggled.");
        }
      } else {
        konamiIdx.current = e.key === KONAMI[0] ? 1 : 0;
      }

      // Typed secret words (track last several letters).
      if (/^[a-z]$/i.test(e.key)) {
        typed.current = (typed.current + e.key.toLowerCase()).slice(-12);
        for (const word of Object.keys(SECRET_WORDS)) {
          if (typed.current.endsWith(word)) {
            showToast(SECRET_WORDS[word]!);
            typed.current = "";
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="terminal-fx pointer-events-none">
      <MatrixRain boosted={boosted} />
      {/* CRT scanline + vignette overlay (CSS-driven). */}
      <div className="terminal-crt fixed inset-0 z-[1]" aria-hidden="true" />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md border px-4 py-2.5 font-mono-num text-sm shadow-2xl"
          style={{
            background: "var(--bg-1)",
            borderColor: "var(--accent)",
            color: "var(--ink-0)",
            boxShadow: "0 0 24px color-mix(in srgb, var(--accent) 40%, transparent)",
          }}
        >
          <span style={{ color: "var(--accent)" }}>$</span> {toast}
        </div>
      ) : null}
    </div>
  );
}
