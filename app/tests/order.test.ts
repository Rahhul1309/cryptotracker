import { describe, expect, it } from "vitest";
import { applyOrder, reorder } from "~/lib/order-storage";

const items = [
  { symbol: "BTC" },
  { symbol: "ETH" },
  { symbol: "SOL" },
];

describe("reorder", () => {
  it("moves an item forward", () => {
    expect(reorder(items, 0, 2).map((i) => i.symbol)).toEqual([
      "ETH",
      "SOL",
      "BTC",
    ]);
  });

  it("moves an item backward", () => {
    expect(reorder(items, 2, 0).map((i) => i.symbol)).toEqual([
      "SOL",
      "BTC",
      "ETH",
    ]);
  });

  it("returns a copy unchanged for no-op or out-of-range indices", () => {
    expect(reorder(items, 1, 1).map((i) => i.symbol)).toEqual([
      "BTC",
      "ETH",
      "SOL",
    ]);
    expect(reorder(items, -1, 2)).toHaveLength(3);
    expect(reorder(items, 0, 99)).toHaveLength(3);
  });

  it("does not mutate the input", () => {
    const copy = [...items];
    reorder(items, 0, 2);
    expect(items).toEqual(copy);
  });
});

describe("applyOrder", () => {
  it("reorders items to match a symbol sequence", () => {
    expect(applyOrder(items, ["SOL", "BTC", "ETH"]).map((i) => i.symbol)).toEqual(
      ["SOL", "BTC", "ETH"],
    );
  });

  it("appends items missing from the order (newly tracked coins)", () => {
    // ADA was added to config but isn't in the saved order yet.
    const withNew = [...items, { symbol: "ADA" }];
    expect(applyOrder(withNew, ["ETH", "BTC"]).map((i) => i.symbol)).toEqual([
      "ETH",
      "BTC",
      "SOL",
      "ADA",
    ]);
  });

  it("ignores symbols in the order that no longer exist", () => {
    expect(
      applyOrder(items, ["DOGE", "ETH", "BTC", "SOL"]).map((i) => i.symbol),
    ).toEqual(["ETH", "BTC", "SOL"]);
  });

  it("ignores duplicate symbols in the saved order", () => {
    expect(
      applyOrder(items, ["ETH", "ETH", "BTC"]).map((i) => i.symbol),
    ).toEqual(["ETH", "BTC", "SOL"]);
  });
});
