import type { Config } from "tailwindcss";

/**
 * Colors are driven by CSS variables defined in app/tailwind.css so a single
 * `.dark` / light token set re-themes the whole app. Tailwind utilities here
 * just reference those variables.
 */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
        },
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: {
          0: "var(--ink-0)",
          1: "var(--ink-1)",
          2: "var(--ink-2)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
        },
        up: "var(--up)",
        down: "var(--down)",
      },
      fontFamily: {
        display: ['"Clash Display"', "Satoshi", "sans-serif"],
        sans: ["Satoshi", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
