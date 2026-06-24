import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export interface UseResizableSplitReturn {
  consolePct: number;
  setConsolePct: (pct: number) => void;
  startDrag: () => void;
  splitRef: React.RefObject<HTMLDivElement | null>;
}

export const useResizableSplit = (
  initialPct = 38,
): UseResizableSplitReturn => {
  const [consolePct, setConsolePct] = useState(initialPct);
  const draggingRef = useRef(false);
  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const fromRight = ((rect.right - e.clientX) / rect.width) * 100;
      setConsolePct(Math.min(70, Math.max(20, fromRight)));
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = useCallback(() => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  return { consolePct, setConsolePct, startDrag, splitRef };
};
