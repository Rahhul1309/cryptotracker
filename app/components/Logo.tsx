/**
 * CryptoTracker brand lockup. The mark is a clean "pulse/heartbeat line inside a
 * ring" — reads as live market tracking, scales crisply, and themes via the
 * accent vars. The wordmark uses the brand display font (var(--font-head)).
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      role="img"
      aria-label="CryptoTracker logo"
    >
      <defs>
        <linearGradient id="ct-ring" x1="4" y1="4" x2="40" y2="40">
          <stop offset="0%" stopColor="var(--accent-soft)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {/* ring */}
      <circle
        cx="22"
        cy="22"
        r="19"
        stroke="url(#ct-ring)"
        strokeWidth="2.5"
        fill="color-mix(in srgb, var(--accent) 10%, transparent)"
      />
      {/* live pulse line through the middle */}
      <path
        d="M8 23 L16 23 L19 15 L24 30 L27 21 L30 23 L36 23"
        stroke="url(#ct-ring)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* leading dot — the "live" tick */}
      <circle cx="36" cy="23" r="2.4" fill="var(--accent-soft)" />
    </svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-none">
        <div className="font-head text-[1.45rem] font-bold tracking-tight">
          Crypto<span style={{ color: "var(--accent)" }}>Tracker</span>
          {/* Blinking shell caret — only shown in the Terminal (dev) theme. */}
          <span className="ct-caret" aria-hidden="true">
            ▋
          </span>
        </div>
        <span className="ct-tagline text-[10px] font-medium uppercase tracking-[0.3em] text-ink-2">
          live markets
        </span>
      </div>
    </div>
  );
}
