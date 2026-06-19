import { useMemo } from "react";
import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";

import { fetchDashboard } from "~/lib/coinbase";
import { TRACKED_CURRENCIES } from "~/lib/crypto-config";
import { computePortfolio, type Holding } from "~/lib/portfolio";
import {
  addHolding,
  getHoldings,
  HoldingValidationError,
  removeHolding,
} from "~/lib/portfolio-store.server";
import { requireUser } from "~/lib/auth/session.server";
import { useLivePrices } from "~/hooks/useLivePrices";

import { PortfolioSummary } from "~/components/PortfolioSummary";
import { PortfolioTable } from "~/components/PortfolioTable";
import { LiveBadge } from "~/components/LiveBadge";
import { Logo } from "~/components/Logo";

export const meta: MetaFunction = () => [
  { title: "Portfolio Simulator · CryptoTracker" },
  {
    name: "description",
    content:
      "Record simulated cryptocurrency buys and track profit/loss against live prices.",
  },
  { name: "theme-color", content: "#0a0b0f" },
];

/**
 * Loader: require an authenticated user, load their simulated holdings, fetch
 * current prices via the shared Coinbase client. We return the raw holdings plus
 * the price/name maps (not just the computed totals) so the client can RECOMPUTE
 * P&L as live WebSocket ticks arrive — the loader provides the initial,
 * server-rendered snapshot; live just updates the numbers on top of it.
 * Throwing a fetch error drives the route ErrorBoundary, like the dashboard.
 */
export async function loader({ request }: LoaderFunctionArgs): Promise<
  ReturnType<
    typeof json<{
      holdings: Holding[];
      priceBySymbol: Record<string, number | null>;
      nameBySymbol: Record<string, string>;
      email: string;
    }>
  >
> {
  const user = await requireUser(request);
  const [holdings, data] = await Promise.all([
    getHoldings(user.id),
    fetchDashboard(TRACKED_CURRENCIES),
  ]);

  const priceBySymbol: Record<string, number | null> = {};
  const nameBySymbol: Record<string, string> = {};
  for (const rate of data.rates) {
    priceBySymbol[rate.symbol] = rate.usd;
    nameBySymbol[rate.symbol] = rate.name;
  }

  return json({ holdings, priceBySymbol, nameBySymbol, email: user.email });
}

interface ActionData {
  error?: string;
}

/**
 * Action: add a simulated buy (`_action=add`) or remove one (`_action=remove`).
 * The buy price entered by the user is per-unit; we store the total cost basis
 * (quantity × price) to match the portfolio math convention. Invalid input
 * re-renders with an error message rather than throwing.
 */
export async function action({
  request,
}: ActionFunctionArgs): Promise<ReturnType<typeof json<ActionData>>> {
  const user = await requireUser(request);
  const form = await request.formData();
  const intent = form.get("_action");

  if (intent === "remove") {
    const index = Number(form.get("index"));
    await removeHolding(user.id, index);
    return json({});
  }

  if (intent === "add") {
    const symbol = String(form.get("symbol") ?? "");
    const quantity = Number(form.get("quantity"));
    const buyPrice = Number(form.get("buyPrice"));

    if (!symbol) return json<ActionData>({ error: "Pick a coin." }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return json<ActionData>(
        { error: "Quantity must be a positive number." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(buyPrice) || buyPrice < 0) {
      return json<ActionData>(
        { error: "Buy price must be zero or positive." },
        { status: 400 },
      );
    }

    try {
      await addHolding(user.id, {
        symbol,
        quantity,
        costBasis: quantity * buyPrice,
      });
    } catch (err) {
      const message =
        err instanceof HoldingValidationError
          ? err.message
          : "Could not add holding.";
      return json<ActionData>({ error: message }, { status: 400 });
    }
    return json({});
  }

  return json<ActionData>({ error: "Unknown action." }, { status: 400 });
}

export default function PortfolioRoute(): JSX.Element {
  const { holdings, priceBySymbol, nameBySymbol } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Live tracking: subscribe to the WebSocket feed for exactly the symbols the
  // user holds (deduped). When there are no holdings we pass [], which tells the
  // hook to stay offline and open no socket. This is the page's only live path
  // and reuses the same hook + status semantics as the dashboard.
  const heldSymbols = useMemo(
    () => Array.from(new Set(holdings.map((h) => h.symbol))),
    [holdings],
  );
  const { prices: livePrices, status } = useLivePrices(heldSymbols);

  // Overlay live USD prices onto the loader's server-rendered prices, then
  // recompute P&L client-side. Live AUGMENTS, never depends: if a symbol has no
  // live tick yet (socket warming, feed gap, or E2E/offline where the hook
  // reports "offline" and never ticks), we fall back to the loader price. This
  // keeps the page fully functional in tests/mock and while the socket connects.
  const liveTotals = useMemo(() => {
    const merged: Record<string, number | null> = { ...priceBySymbol };
    for (const symbol of Object.keys(livePrices)) {
      const tick = livePrices[symbol];
      if (tick) merged[symbol] = tick.usd;
    }
    return computePortfolio(holdings, merged, nameBySymbol);
  }, [holdings, priceBySymbol, nameBySymbol, livePrices]);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <header className="mb-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <span className="font-display text-lg font-semibold text-ink-0">
              Portfolio Simulator
            </span>
            <LiveBadge status={status} />
          </div>
          <Link
            to="/"
            className="rounded-xl border border-line bg-bg-1 px-3 py-1.5 text-sm font-medium text-ink-1 transition hover:text-ink-0"
          >
            ← Dashboard
          </Link>
        </div>

        <PortfolioSummary totals={liveTotals} />
      </header>

      <section className="panel mb-8 rounded-2xl p-5">
        <h2 className="font-display mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-ink-2">
          Add a simulated buy
        </h2>
        <Form
          method="post"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="_action" value="add" />
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-ink-2">Coin</span>
            <select
              name="symbol"
              defaultValue={TRACKED_CURRENCIES[0]?.symbol}
              className="rounded-xl border border-line bg-bg-1 px-3 py-2 text-sm text-ink-0"
            >
              {TRACKED_CURRENCIES.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.symbol} — {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-ink-2">Quantity</span>
            <input
              type="number"
              name="quantity"
              step="any"
              min="0"
              placeholder="0.5"
              required
              className="font-mono-num rounded-xl border border-line bg-bg-1 px-3 py-2 text-sm text-ink-0"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-ink-2">Buy price (USD / unit)</span>
            <input
              type="number"
              name="buyPrice"
              step="any"
              min="0"
              placeholder="65000"
              required
              className="font-mono-num rounded-xl border border-line bg-bg-1 px-3 py-2 text-sm text-ink-0"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg-0)" }}
          >
            Add buy
          </button>
        </Form>
        {actionData?.error ? (
          <p className="mt-3 text-sm" style={{ color: "var(--down)" }}>
            {actionData.error}
          </p>
        ) : null}
      </section>

      <PortfolioTable rows={liveTotals.rows} />

      <footer className="mt-12 border-t border-line pt-6 text-center text-xs text-ink-2">
        Simulated positions only · prices from the public Coinbase API · not
        financial advice.
      </footer>
    </main>
  );
}
