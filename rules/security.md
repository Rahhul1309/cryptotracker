# Security

This is a read-only public-data dashboard with no auth and no user-supplied
persistence beyond local preferences — so the surface is small. These rules keep
it that way as the app grows.

## Trust boundaries

- **Treat all external responses as untrusted.** The Coinbase response is parsed
  through a type guard (`isRatesResponse`) and every numeric value goes through
  `parseRate`, which rejects non-finite/non-positive input. Never `as`-cast a
  network payload into a typed shape without validating it first.
- **Candle data is best-effort and untrusted too.** `fetchSeries` filters rows
  defensively and returns `null` on anything unexpected. Keep that posture —
  malformed upstream data must never crash a render.
- **`localStorage` is attacker-influenceable.** `loadOrder` validates that the
  stored value is an array of strings and ignores anything else; `useTheme`
  tolerates garbage. Never `JSON.parse` storage straight into trusted state.
- **WebSocket frames are untrusted.** Every incoming frame goes through
  `parseTicker`, which validates the message type and coerces numeric fields,
  returning `null` for anything malformed. Never trust a frame's shape directly,
  and use `wss://` only — never unencrypted `ws://`.

## Secrets & server/client split

- The current Coinbase endpoints are **public and unauthenticated** — no key is
  needed. If a provider that needs a key is ever added:
  - Put the key in `process.env`, read it **only** in the server `loader`/`lib`
    code, and never import it into a component or pass it to the client.
  - Add it to `.gitignore`d `.env`; never commit a key.
- Don't `console.log` full upstream responses or any future credentials.

## Output & injection

- React escapes text by default — keep it that way. There is exactly one
  `dangerouslySetInnerHTML` in the app: the static theme-bootstrap script in
  `root.tsx`, whose content is a fixed constant with no interpolation. **Never**
  feed dynamic or user/network data into `dangerouslySetInnerHTML`.
- All displayed values are numbers run through formatters — don't introduce
  raw HTML rendering of API strings.

## Network & dependencies

- Use `https://` for every external call (rates, candles, fonts). Never downgrade
  to `http`.
- The project pins installs to the public npm registry via a local `.npmrc`.
  Keep `package-lock.json` committed for reproducible, audited installs.
- Vet new dependencies: prefer none (see `framework-integrity.md`). A new dep is
  new supply-chain surface.
- Note: `strict-ssl=false` may exist in a *global* npmrc on some dev machines —
  do **not** replicate that in this repo's `.npmrc`.

## Client-side data handling

- This app stores only non-sensitive UI preferences (card order, theme) in
  `localStorage`. Don't start persisting anything sensitive there; it's readable
  by any script on the origin.
- If user authentication is added later, use Remix sessions with
  `httpOnly`, `secure`, `sameSite` cookies — never store tokens in
  `localStorage`.
