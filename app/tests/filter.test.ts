import { describe, expect, it } from "vitest";
import { filterCryptos } from "~/lib/filter";

const data = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
];

describe("filterCryptos", () => {
  it("returns all items for an empty or whitespace query", () => {
    expect(filterCryptos(data, "")).toHaveLength(3);
    expect(filterCryptos(data, "   ")).toHaveLength(3);
  });

  it("matches by symbol, case-insensitively", () => {
    expect(filterCryptos(data, "eth").map((c) => c.symbol)).toEqual(["ETH"]);
    expect(filterCryptos(data, "BTC").map((c) => c.symbol)).toEqual(["BTC"]);
  });

  it("matches by name, case-insensitively", () => {
    expect(filterCryptos(data, "sol").map((c) => c.symbol)).toEqual(["SOL"]);
    expect(filterCryptos(data, "Bitcoin").map((c) => c.symbol)).toEqual(["BTC"]);
  });

  it("matches partial substrings", () => {
    expect(filterCryptos(data, "et").map((c) => c.symbol)).toEqual(["ETH"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCryptos(data, "xyz")).toEqual([]);
  });

  it("does not mutate the input", () => {
    const copy = [...data];
    filterCryptos(data, "eth");
    expect(data).toEqual(copy);
  });
});
