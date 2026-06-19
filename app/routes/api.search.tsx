import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { searchCatalog, topByVolume, type CatalogCoin } from "~/lib/catalog";
import { fetchCatalog } from "~/lib/catalog-coinbase.server";
import { requireUser } from "~/lib/auth/session.server";

/**
 * Resource route: universal coin search. Auth-gated (reuses `requireUser`).
 *
 *   GET /api/search?q=eth        → ranked search results
 *   GET /api/search?top=10       → the 10 highest-volume coins
 *
 * `top` takes precedence over `q` when present. Errors degrade gracefully:
 * instead of throwing (which would surface as a failed fetch in the client
 * search box), we return `{ results: [], error }` with a 200 so the UI can
 * show "search unavailable" and keep working. Note: a thrown redirect from
 * `requireUser` (unauthenticated) propagates as normal Remix auth behavior.
 */

interface SearchResponse {
  results: CatalogCoin[];
  error?: string;
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<ReturnType<typeof json<SearchResponse>>> {
  await requireUser(request);

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const topParam = url.searchParams.get("top");

  try {
    const catalog = await fetchCatalog(request.signal);

    if (topParam !== null) {
      const n = Number.parseInt(topParam, 10);
      const results = topByVolume(catalog, Number.isFinite(n) ? n : 0);
      return json<SearchResponse>({ results });
    }

    const results = searchCatalog(catalog, q);
    return json<SearchResponse>({ results });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Search is unavailable";
    return json<SearchResponse>({ results: [], error }, { status: 200 });
  }
}
