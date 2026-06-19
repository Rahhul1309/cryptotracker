import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * Odometer-style number display. Each character lives in a fixed-height window;
 * when a digit changes, the old glyph slides out and the new one slides in
 * (direction depends on whether the overall value rose or fell). Non-digit
 * characters ($ , . ₿ space) render statically so only the moving parts move.
 *
 * Presentational + pure-ish: it takes a preformatted string (so currency/BTC
 * formatting stays in `lib/format.ts`) plus the raw numeric value to decide
 * roll direction. No data logic here.
 */
interface RollingNumberProps {
  /** Preformatted display string, e.g. "$2,500.55". */
  formatted: string;
  /** Raw value, used only to pick roll direction. */
  value: number | null;
  className?: string;
}

const DIGIT_H = "1em";

function Digit({ char, dir }: { char: string; dir: 1 | -1 }) {
  return (
    <span
      className="relative inline-block overflow-hidden align-baseline"
      style={{ height: DIGIT_H, lineHeight: DIGIT_H }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={char}
          className="inline-block"
          initial={{ y: dir > 0 ? "100%" : "-100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: dir > 0 ? "-100%" : "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function RollingNumber({
  formatted,
  value,
  className = "",
}: RollingNumberProps) {
  const [dir, setDir] = useState<1 | -1>(1);
  const [prev, setPrev] = useState<number | null>(value);

  useEffect(() => {
    if (value !== null && prev !== null && value !== prev) {
      setDir(value > prev ? 1 : -1);
    }
    setPrev(value);
  }, [value, prev]);

  return (
    <span
      className={`inline-flex items-baseline ${className}`}
      aria-label={formatted}
    >
      {formatted.split("").map((char, i) =>
        /\d/.test(char) ? (
          <Digit key={`${i}-slot`} char={char} dir={dir} />
        ) : (
          <span key={`${i}-static`} aria-hidden="true">
            {char}
          </span>
        ),
      )}
    </span>
  );
}
