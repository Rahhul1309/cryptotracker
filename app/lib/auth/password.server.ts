import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt — no external dependency.
 * Format stored: `scrypt$<saltHex>$<hashHex>`. Verification is constant-time.
 *
 * scrypt is a memory-hard KDF suitable for password storage; we use a random
 * 16-byte salt per password and a 64-byte derived key.
 */

const KEYLEN = 64;
const SALT_BYTES = 16;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  const actual = await scryptAsync(password, salt);
  // Lengths must match for timingSafeEqual; guard to avoid throwing.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
