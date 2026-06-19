import { AnimatePresence, motion } from "motion/react";
import {
  ACCENTS,
  PRECISION_MAX,
  PRECISION_MIN,
  REFRESH_OPTIONS,
  THEMES,
  type AccentKey,
  type Settings,
  type ThemeKey,
} from "~/lib/settings";
import { TRACKED_CURRENCIES } from "~/lib/crypto-config";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  toggleIn: (
    key: "hidden" | "pinned" | "watchlist" | "tracked",
    symbol: string,
  ) => void;
  reset: () => void;
}

/** A labelled section block. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line py-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A row with a label and a control on the right. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-ink-1">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 rounded-full transition-colors"
      style={{ background: checked ? "var(--accent)" : "var(--line-strong)" }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-bg-0 transition-all"
        style={{ left: checked ? "1.125rem" : "0.125rem" }}
      />
    </button>
  );
}

/** A small segmented control. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-bg-2/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="rounded-md px-2.5 py-1 text-xs font-medium transition"
          style={
            value === o.value
              ? { background: "var(--accent)", color: "var(--bg-0)" }
              : { color: "var(--ink-1)" }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  update,
  toggleIn,
  reset,
}: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.aside
            className="relative z-10 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-line bg-bg-1 px-6 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-line bg-bg-1 px-6 py-4">
              <h2 className="font-display text-lg font-semibold">
                Personalize
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="rounded-lg p-1.5 text-ink-2 transition hover:bg-bg-2 hover:text-ink-0"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Theme */}
            <Section title="Theme">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                  const t = THEMES[key];
                  const active = settings.theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update({ theme: key })}
                      aria-pressed={active}
                      aria-label={`${t.label} theme`}
                      title={t.egg ?? t.blurb}
                      className="flex flex-col items-start rounded-xl border px-3 py-2 text-left transition"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--line)",
                        background: active
                          ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                          : "var(--bg-2)",
                      }}
                    >
                      <span className="flex items-center gap-1 text-sm font-semibold text-ink-0">
                        {t.label}
                        {t.egg ? (
                          <span title={t.egg} aria-hidden="true">
                            ✨
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] text-ink-2">{t.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Accent */}
            <Section title="Accent">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
                  const a = ACCENTS[key];
                  const active = settings.accent === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update({ accent: key })}
                      aria-label={a.label}
                      aria-pressed={active}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition"
                      style={{
                        borderColor: active ? a.value : "transparent",
                      }}
                    >
                      <span
                        className="h-6 w-6 rounded-full"
                        style={{ background: a.value }}
                      />
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Layout & density */}
            <Section title="Layout">
              <Row label="View">
                <Segmented
                  value={settings.layout}
                  onChange={(v) => update({ layout: v })}
                  options={[
                    { value: "grid", label: "Grid" },
                    { value: "list", label: "List" },
                  ]}
                />
              </Row>
              <Row label="Density">
                <Segmented
                  value={settings.density}
                  onChange={(v) => update({ density: v })}
                  options={[
                    { value: "comfortable", label: "Comfy" },
                    { value: "compact", label: "Compact" },
                  ]}
                />
              </Row>
              <Row label="Ticker tape">
                <Toggle
                  label="Ticker tape"
                  checked={settings.showTicker}
                  onChange={(v) => update({ showTicker: v })}
                />
              </Row>
              <Row label="Sparklines">
                <Toggle
                  label="Sparklines"
                  checked={settings.showSparklines}
                  onChange={(v) => update({ showSparklines: v })}
                />
              </Row>
              <Row label="Ambient background">
                <Toggle
                  label="Ambient background"
                  checked={settings.showAurora}
                  onChange={(v) => update({ showAurora: v })}
                />
              </Row>
            </Section>

            {/* Data & format */}
            <Section title="Data & format">
              <Row label="Live feed">
                <Toggle
                  label="Live feed"
                  checked={settings.liveEnabled}
                  onChange={(v) => update({ liveEnabled: v })}
                />
              </Row>
              <Row label="Show BTC column">
                <Toggle
                  label="Show BTC column"
                  checked={settings.showBtcColumn}
                  onChange={(v) => update({ showBtcColumn: v })}
                />
              </Row>
              <Row label={`Decimals (${settings.precision})`}>
                <input
                  type="range"
                  min={PRECISION_MIN}
                  max={PRECISION_MAX}
                  value={settings.precision}
                  onChange={(e) =>
                    update({ precision: Number(e.target.value) })
                  }
                  className="w-32 accent-[var(--accent)]"
                  aria-label="USD decimal places"
                />
              </Row>
              <Row label="Fallback refresh">
                <Segmented
                  value={String(settings.refreshSeconds)}
                  onChange={(v) => update({ refreshSeconds: Number(v) })}
                  options={REFRESH_OPTIONS.map((s) => ({
                    value: String(s),
                    label: `${s}s`,
                  }))}
                />
              </Row>
            </Section>

            {/* Coins */}
            <Section title="Coins · pin & hide">
              <ul className="flex flex-col gap-1">
                {TRACKED_CURRENCIES.map((c) => {
                  const hidden = settings.hidden.includes(c.symbol);
                  const pinned = settings.pinned.includes(c.symbol);
                  return (
                    <li
                      key={c.symbol}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-bg-2/60"
                    >
                      <span
                        className={`text-sm ${hidden ? "text-ink-2 line-through" : "text-ink-0"}`}
                      >
                        {c.name}{" "}
                        <span className="text-ink-2">{c.symbol}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleIn("pinned", c.symbol)}
                          aria-label={`${pinned ? "Unpin" : "Pin"} ${c.name}`}
                          aria-pressed={pinned}
                          className="rounded-md p-1 transition hover:bg-bg-2"
                          style={{ color: pinned ? "var(--accent)" : "var(--ink-2)" }}
                          title="Pin to top"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 2l2 5 5 .5-3.8 3.3L14.5 16 10 13.3 5.5 16l1.3-5.2L3 7.5 8 7z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleIn("hidden", c.symbol)}
                          aria-label={`${hidden ? "Show" : "Hide"} ${c.name}`}
                          aria-pressed={hidden}
                          className="rounded-md p-1 text-ink-2 transition hover:bg-bg-2 hover:text-ink-0"
                          title={hidden ? "Show" : "Hide"}
                        >
                          {hidden ? (
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 4c4 0 7 4 7 6s-3 6-7 6-7-4-7-6 3-6 7-6zm0 2.5A3.5 3.5 0 1013.5 10 3.5 3.5 0 0010 6.5z" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M3 3l14 14M10 4c4 0 7 4 7 6a7 7 0 01-1.3 2.4M6.5 6.6A6.7 6.7 0 003 10c0 2 3 6 7 6a6.6 6.6 0 003.4-1" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Section>

            <div className="py-5">
              <button
                type="button"
                onClick={reset}
                className="w-full rounded-xl border border-line py-2.5 text-sm font-medium text-ink-1 transition hover:border-down/50 hover:text-down"
              >
                Reset to defaults
              </button>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
