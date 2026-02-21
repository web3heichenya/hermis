import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { loadState, saveState } from "@/lib/storage";

const DEFAULT_SETTINGS = {
  notificationMode: "onchain" as NotificationMode,
  language: "auto" as LanguagePreference,
};

type NotificationMode = "onchain" | "email" | "both";
type LanguagePreference = "auto" | "en" | "zh";

type ProfileSettings = {
  notificationMode: NotificationMode;
  language: LanguagePreference;
};

export function useProfileSettings() {
  const { address } = useAccount();
  const storageKey = useMemo(
    () => `profile-settings:${(address ?? "guest").toLowerCase()}`,
    [address]
  );

  const [settings, setSettings] = useState<ProfileSettings>(() =>
    loadState(storageKey, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    const stored = loadState(storageKey, DEFAULT_SETTINGS);
    setSettings(stored);
  }, [storageKey]);

  const updateSettings = (partial: Partial<ProfileSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveState(storageKey, next);
      return next;
    });
  };

  return {
    settings,
    setNotificationMode: (value: NotificationMode) => updateSettings({ notificationMode: value }),
    setLanguage: (value: LanguagePreference) => updateSettings({ language: value }),
  };
}

export type { ProfileSettings, NotificationMode, LanguagePreference };
