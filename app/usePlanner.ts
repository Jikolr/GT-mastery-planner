import { useEffect, useState } from "react";
import {
  loadSnapshot,
  newSnapshot,
  STORAGE_KEY,
  type Loaded,
  type Snapshot,
} from "./state";

export function usePlanner() {
  const [loaded] = useState<Loaded>(() => {
    try {
      return loadSnapshot(window.localStorage);
    } catch {
      return {
        data: newSnapshot(),
        blocked: true,
        warning:
          "Browser storage is unavailable. Export a backup to keep your work.",
      };
    }
  });
  const [data, setData] = useState(loaded.data);
  const [blocked, setBlocked] = useState(loaded.blocked);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedData, setSavedData] = useState<Snapshot | null>(null);
  useEffect(() => {
    if (blocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedData(data);
      setSaveError(null);
    } catch {
      setSaveError(
        "Saving failed: browser storage is full or unavailable. Export a backup before closing.",
      );
    }
  }, [data, blocked]);
  return {
    data,
    setData,
    loaded,
    blocked,
    setBlocked,
    saveError,
    saveStatus: blocked
      ? "Saving paused"
      : saveError
        ? "Not saved"
        : savedData === data
          ? "Saved locally"
          : "Saving…",
  };
}
