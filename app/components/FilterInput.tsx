interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

/** Search box that filters cards by name or symbol. */
export function FilterInput({ value, onChange, resultCount }: FilterInputProps) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <label htmlFor="crypto-filter" className="sr-only">
        Filter cryptocurrencies by name or symbol
      </label>
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 3.4 9.82l3.64 3.64a1 1 0 0 0 1.42-1.42l-3.64-3.64A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
          clipRule="evenodd"
        />
      </svg>
      <input
        id="crypto-filter"
        type="search"
        inputMode="search"
        placeholder="Search assets…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="filter-result-count"
        className="w-full rounded-xl border border-line bg-bg-1/70 py-2.5 pl-10 pr-3 text-sm text-ink-0 shadow-sm outline-none backdrop-blur transition placeholder:text-ink-2 focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
      />
      <span id="filter-result-count" className="sr-only" aria-live="polite">
        {resultCount} cryptocurrencies shown
      </span>
    </div>
  );
}
