import { describe, expect, it } from "vitest";
import {
  hasErrors,
  normalizeEmail,
  validateCredentials,
  validateEmail,
  validatePassword,
} from "~/lib/auth/validate";

describe("validateEmail", () => {
  it("requires a value", () => {
    expect(validateEmail("")).toMatch(/required/i);
    expect(validateEmail("   ")).toMatch(/required/i);
  });
  it("rejects malformed addresses", () => {
    expect(validateEmail("nope")).toMatch(/valid/i);
    expect(validateEmail("a@b")).toMatch(/valid/i);
    expect(validateEmail("a@b@c.com")).toMatch(/valid/i);
  });
  it("accepts a well-formed address", () => {
    expect(validateEmail("user@example.com")).toBeUndefined();
  });
});

describe("validatePassword", () => {
  it("requires a value and a minimum length", () => {
    expect(validatePassword("")).toMatch(/required/i);
    expect(validatePassword("short")).toMatch(/at least 8/i);
  });
  it("rejects absurdly long passwords", () => {
    expect(validatePassword("x".repeat(201))).toMatch(/too long/i);
  });
  it("accepts a valid password", () => {
    expect(validatePassword("hunter2hunter2")).toBeUndefined();
  });
});

describe("validateCredentials / hasErrors", () => {
  it("collects field errors", () => {
    const errors = validateCredentials("bad", "x");
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });
  it("returns no errors for valid input", () => {
    const errors = validateCredentials("user@example.com", "longenough");
    expect(hasErrors(errors)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});
