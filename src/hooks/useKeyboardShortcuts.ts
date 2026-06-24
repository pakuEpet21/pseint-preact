import { useEffect } from "preact/hooks";

export interface KeyboardShortcutsConfig {
  running: boolean;
  tabPendingClose: unknown | null;
  formatTab: () => void;
  download: () => void;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const { running, tabPendingClose, formatTab, download } = config;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tabPendingClose && e.key === "Escape") {
        e.preventDefault();
        // caller must handle dismissing tabPendingClose
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        formatTab();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        // caller handles running
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        download();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, tabPendingClose, formatTab, download]);
};
