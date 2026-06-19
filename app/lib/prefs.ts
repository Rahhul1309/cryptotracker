/**
 * PURE preference normalization for the server side. No React, no I/O.
 *
 * The Settings shape, defaults, and field-level validation already live in
 * `~/lib/settings` (`mergeSettings`). This module is a thin, single-purpose
 * wrapper that names the *server* intent ("sanitize an untrusted value into a
 * safe, forward-compatible Settings") so the file store and the API route share
 * one validation entry point and it can be unit-tested without touching disk.
 *
 * Side-effect-free and testable in isolation.
 */

import { mergeSettings, type Settings } from "~/lib/settings";

/**
 * Normalize an untrusted/partial/stale value into a safe `Settings`.
 *
 * Delegates to `mergeSettings`, which overlays the input onto `DEFAULT_SETTINGS`,
 * validating each field: unknown keys are dropped, invalid enums fall back to
 * their default, and numeric fields are clamped into range. Never throws.
 */
export function normalizePrefs(raw: unknown): Settings {
  return mergeSettings(raw);
}
