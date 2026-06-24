import { useCallback } from "preact/hooks";
import { compress, decompress } from "@/lib/compression";

export interface UseShareReturn {
  shareCode: (content: string) => void;
  loadSharedCode: () => Promise<string | null>;
}

export const useShare = (setSaveState: (s: "idle" | "saving" | "saved") => void): UseShareReturn => {
  const shareCode = useCallback(async (content: string) => {
    try {
      const encoded = await compress(content);
      const url = `${window.location.origin}${window.location.pathname}?c=${encoded}`;
      await navigator.clipboard.writeText(url);
      setSaveState("saving");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch {
      await navigator.clipboard.writeText(content);
    }
  }, [setSaveState]);

  const loadSharedCode = useCallback(async (): Promise<string | null> => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("c");
    if (!encoded) return null;
    try {
      const code = await decompress(encoded);
      window.history.replaceState({}, "", window.location.pathname);
      return code;
    } catch {
      return null;
    }
  }, []);

  return { shareCode, loadSharedCode };
};
