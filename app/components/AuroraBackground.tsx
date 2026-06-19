/**
 * Optional ambient background — off by default (see DEFAULT_SETTINGS). Refined
 * to two slow, low-opacity accent washes rather than three loud colored blobs,
 * so when enabled it reads as quiet atmosphere, not the generic AI gradient mesh.
 */
export function AuroraBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute -left-[8%] top-[-18%] h-[42rem] w-[42rem] rounded-full blur-[140px] opacity-60"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)",
          animation: "drift-a 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-22%] right-[8%] h-[38rem] w-[38rem] rounded-full blur-[140px] opacity-50"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)",
          animation: "drift-c 32s ease-in-out infinite",
        }}
      />
    </div>
  );
}
