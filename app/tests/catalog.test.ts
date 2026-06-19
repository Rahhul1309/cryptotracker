import { describe, expect, it } from "vitest";
import { searchCatalog, topByVolume, type CatalogCoin } from "~/lib/catalog";

const data: CatalogCoin[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ETC", name: "Ethereum Classic" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "WETH", name: "Wrapped Ether" },
];

describe("searchCatalog", () => {
  it("ranks exact symbol > symbol prefix > name prefix > substring", () => {
    // "eth" matches: ETH (exact symbol), ETC (symbol prefix), Ethereum/Ethereum
    // Classic (name prefix via ETH/ETC already counted), WETH (substring).
    const result = searchCatalog(data, "eth").map((c) => c.symbol);
    expect(result[0]).toBe("ETH"); // exact symbol
    expect(result[1]).toBe("ETC"); // symbol prefix "et"
    // WETH only matches as a substring, so it must come after the prefix hits.
    expect(result.indexOf("WETH")).toBeGreaterThan(result.indexOf("ETC"));
  });

  it("ranks a name-prefix match above a pure substring match", () => {
    const coins: CatalogCoin[] = [
      { symbol: "XYZ", name: "Has sol inside" }, // substring of name
      { symbol: "ABC", name: "Solana Token" }, // name prefix
    ];
    expect(searchCatalog(coins, "sol").map((c) => c.symbol)).toEqual([
      "ABC",
      "XYZ",
    ]);
  });

  it("is case-insensitive on both query and data", () => {
    expect(searchCatalog(data, "BtC").map((c) => c.symbol)).toEqual(["BTC"]);
    expect(searchCatalog(data, "solana").map((c) => c.symbol)).toEqual(["SOL"]);
  });

  it("matches by name as well as symbol", () => {
    expect(searchCatalog(data, "dogecoin").map((c) => c.symbol)).toEqual([
      "DOGE",
    ]);
  });

  it("honors the limit, defaulting to 25", () => {
    const many: CatalogCoin[] = Array.from({ length: 40 }, (_, i) => ({
      symbol: `C${i}`,
      name: `Coin ${i}`,
    }));
    expect(searchCatalog(many, "coin")).toHaveLength(25);
    expect(searchCatalog(many, "coin", 5)).toHaveLength(5);
  });

  it("returns the first `limit` coins for an empty/whitespace query", () => {
    expect(searchCatalog(data, "").map((c) => c.symbol)).toEqual(
      data.map((c) => c.symbol),
    );
    expect(searchCatalog(data, "   ", 2).map((c) => c.symbol)).toEqual([
      "BTC",
      "ETH",
    ]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchCatalog(data, "zzz")).toEqual([]);
  });

  it("is stable for equally-ranked matches (keeps input order)", () => {
    const coins: CatalogCoin[] = [
      { symbol: "AAA", name: "Coin one" },
      { symbol: "BBB", name: "Coin two" },
      { symbol: "CCC", name: "Coin three" },
    ];
    // All match "coin" as a name prefix → same rank → original order preserved.
    expect(searchCatalog(coins, "coin").map((c) => c.symbol)).toEqual([
      "AAA",
      "BBB",
      "CCC",
    ]);
  });

  it("does not mutate the input", () => {
    const copy = data.map((c) => ({ ...c }));
    searchCatalog(data, "eth");
    expect(data).toEqual(copy);
  });
});

describe("topByVolume", () => {
  const vols: CatalogCoin[] = [
    { symbol: "BTC", name: "Bitcoin", volume24h: 100 },
    { symbol: "ETH", name: "Ethereum", volume24h: 300 },
    { symbol: "SOL", name: "Solana", volume24h: 200 },
  ];

  it("returns the n highest-volume coins, descending", () => {
    expect(topByVolume(vols, 2).map((c) => c.symbol)).toEqual(["ETH", "SOL"]);
  });

  it("sorts coins lacking volume last", () => {
    const mixed: CatalogCoin[] = [
      { symbol: "NOV", name: "No Volume" },
      { symbol: "HI", name: "High", volume24h: 500 },
      { symbol: "LO", name: "Low", volume24h: 1 },
    ];
    expect(topByVolume(mixed, 3).map((c) => c.symbol)).toEqual([
      "HI",
      "LO",
      "NOV",
    ]);
  });

  it("preserves input order among volume-less coins", () => {
    const noneHaveVolume: CatalogCoin[] = [
      { symbol: "A", name: "A" },
      { symbol: "B", name: "B" },
      { symbol: "C", name: "C" },
    ];
    expect(topByVolume(noneHaveVolume, 3).map((c) => c.symbol)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("returns the whole sorted list when n exceeds the length", () => {
    expect(topByVolume(vols, 99).map((c) => c.symbol)).toEqual([
      "ETH",
      "SOL",
      "BTC",
    ]);
  });

  it("returns an empty array for n <= 0", () => {
    expect(topByVolume(vols, 0)).toEqual([]);
    expect(topByVolume(vols, -3)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const copy = vols.map((c) => ({ ...c }));
    topByVolume(vols, 2);
    expect(vols).toEqual(copy);
  });
});
