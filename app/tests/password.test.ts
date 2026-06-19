import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "~/lib/auth/password.server";

describe("password hashing (scrypt)", () => {
  it("produces a salted scrypt hash that verifies", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("super secret one");
    expect(await verifyPassword("super secret two", hash)).toBe(false);
  });

  it("uses a unique salt per hash (same password → different hashes)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("returns false for malformed stored hashes", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(await verifyPassword("x", "scrypt$onlytwo")).toBe(false);
  });
});
