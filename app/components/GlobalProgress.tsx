import { useNavigation } from "@remix-run/react";

/**
 * Thin top progress bar shown during route navigation and form submission.
 * Driven by Remix's navigation state — pure UI, no timers/state of its own.
 */
export function GlobalProgress() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";
  return (
    <div
      aria-hidden={!active}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: active ? "100%" : "0%",
          opacity: active ? 1 : 0,
          background:
            "linear-gradient(90deg, transparent, var(--accent), var(--accent-soft))",
          boxShadow: active ? "0 0 12px var(--accent)" : "none",
        }}
      />
    </div>
  );
}
