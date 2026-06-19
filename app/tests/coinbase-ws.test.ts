import { describe, expect, it } from "vitest";
import {
  buildSubscribeMessage,
  fromProductId,
  parseTicker,
  toProductId,
} from "~/lib/coinbase-ws";

describe("product id mapping", () => {
  it("maps symbol → product id", () => {
    expect(toProductId("eth")).toBe("ETH-USD");
    expect(toProductId("BTC")).toBe("BTC-USD");
  });

  it("maps product id → symbol, rejecting non-USD products", () => {
    expect(fromProductId("ETH-USD")).toBe("ETH");
    expect(fromProductId("eth-usd")).toBe("ETH");
    expect(fromProductId("ETH-EUR")).toBeNull();
    expect(fromProductId("garbage")).toBeNull();
  });
});

describe("buildSubscribeMessage", () => {
  it("subscribes to the ticker channel for all symbols", () => {
    const msg = JSON.parse(buildSubscribeMessage(["BTC", "ETH"]));
    expect(msg).toEqual({
      type: "subscribe",
      product_ids: ["BTC-USD", "ETH-USD"],
      channels: ["ticker"],
    });
  });
});

describe("parseTicker", () => {
  const validFrame = {
    type: "ticker",
    product_id: "ETH-USD",
    price: "2500.55",
    open_24h: "2400.00",
  };

  it("parses a well-formed ticker frame", () => {
    expect(parseTicker(validFrame)).toEqual({
      symbol: "ETH",
      usd: 2500.55,
      open24h: 2400,
    });
  });

  it("ignores non-ticker frames (heartbeat, ack, error)", () => {
    expect(parseTicker({ type: "heartbeat", product_id: "ETH-USD" })).toBeNull();
    expect(parseTicker({ type: "subscriptions" })).toBeNull();
    expect(parseTicker({ type: "error", message: "bad" })).toBeNull();
  });

  it("rejects frames with missing or non-positive numbers", () => {
    expect(parseTicker({ ...validFrame, price: "0" })).toBeNull();
    expect(parseTicker({ ...validFrame, price: "abc" })).toBeNull();
    expect(parseTicker({ ...validFrame, open_24h: undefined })).toBeNull();
  });

  it("rejects non-USD products and non-objects", () => {
    expect(parseTicker({ ...validFrame, product_id: "ETH-EUR" })).toBeNull();
    expect(parseTicker(null)).toBeNull();
    expect(parseTicker("ticker")).toBeNull();
  });
});
