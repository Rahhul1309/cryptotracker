import { createContext, useContext } from "react";
import { DEFAULT_SETTINGS, type Settings } from "~/lib/settings";

/**
 * Read-only Settings context for leaf components (cards, sparklines) that need
 * display preferences without prop-drilling. The route owns the actual state
 * via `useSettings` and provides it here; mutations stay with the route/panel.
 */
const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

export const SettingsProvider = SettingsContext.Provider;

export function useDisplaySettings(): Settings {
  return useContext(SettingsContext);
}
