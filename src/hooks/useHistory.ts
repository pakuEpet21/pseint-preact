import { useCallback, useRef, useState } from "preact/hooks";

interface Snapshot {
  content: string;
  cursor: number;
}

interface HistoryEntry {
  past: Snapshot[];
  future: Snapshot[];
}

export interface UseHistoryReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  getCursorPosition: () => number;
  updateContent: (content: string) => void;
  setCursorPosition: (pos: number) => void;
  snapshotOnChange: (content: string) => void;
  isUndoingRef: React.MutableRefObject<boolean>;
}

export const useHistory = (
  activeId: string,
): UseHistoryReturn => {
  const historiesRef = useRef<Record<string, HistoryEntry>>({});
  const [, setHistoryVersion] = useState(0);
  const prevStateRef = useRef<Record<string, Snapshot>>({});
  const prevActiveIdRef = useRef(activeId);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoingRef = useRef(false);
  // External refs set by the editor
  const cursorRef = useRef<(() => number) | null>(null);
  const setCursorRef = useRef<((pos: number) => void) | null>(null);
  const updateContentRef = useRef<((content: string) => void) | null>(null);

  const bumpHistory = () => setHistoryVersion((v) => v + 1);

  const getHistory = useCallback((id: string): HistoryEntry => {
    return historiesRef.current[id] ?? { past: [], future: [] };
  }, []);

  const pushToPast = useCallback((id: string, content: string, cursor: number) => {
    const entry = getHistory(id);
    const past = [...entry.past, { content, cursor }];
    if (past.length > 100) past.shift();
    historiesRef.current[id] = { past, future: [] };
    bumpHistory();
  }, [getHistory]);

  const getCursorPosition = useCallback(() => cursorRef.current?.() ?? 0, []);
  const setCursorPosition = useCallback((pos: number) => setCursorRef.current?.(pos), []);
  const updateContent = useCallback((content: string) => updateContentRef.current?.(content), []);

  const undo = useCallback(() => {
    const entry = getHistory(activeId);
    if (entry.past.length === 0) return;
    const currentCursor = getCursorPosition();
    const currentSnapshot = {
      content: prevStateRef.current[activeId]?.content ?? "",
      cursor: currentCursor,
    };
    const previous = entry.past[entry.past.length - 1];
    const newPast = entry.past.slice(0, -1);
    historiesRef.current[activeId] = {
      past: newPast,
      future: [currentSnapshot, ...entry.future],
    };
    bumpHistory();
    isUndoingRef.current = true;
    updateContent(previous.content);
    setCursorPosition(previous.cursor);
    prevStateRef.current[activeId] = {
      content: previous.content,
      cursor: previous.cursor,
    };
  }, [activeId, getCursorPosition, updateContent, setCursorPosition, getHistory]);

  const redo = useCallback(() => {
    const entry = getHistory(activeId);
    if (entry.future.length === 0) return;
    const currentCursor = getCursorPosition();
    const currentSnapshot = {
      content: prevStateRef.current[activeId]?.content ?? "",
      cursor: currentCursor,
    };
    const next = entry.future[0];
    const newFuture = entry.future.slice(1);
    historiesRef.current[activeId] = {
      past: [...entry.past, currentSnapshot],
      future: newFuture,
    };
    bumpHistory();
    isUndoingRef.current = true;
    updateContent(next.content);
    setCursorPosition(next.cursor);
    prevStateRef.current[activeId] = {
      content: next.content,
      cursor: next.cursor,
    };
  }, [activeId, getCursorPosition, updateContent, setCursorPosition, getHistory]);

  const canUndo = getHistory(activeId).past.length > 0;
  const canRedo = getHistory(activeId).future.length > 0;

  const snapshotOnChange = useCallback(
    (content: string) => {
      if (isUndoingRef.current) {
        isUndoingRef.current = false;
        prevActiveIdRef.current = activeId;
        return;
      }

      if (prevActiveIdRef.current !== activeId) {
        if (!(activeId in prevStateRef.current)) {
          prevStateRef.current[activeId] = { content, cursor: 0 };
        }
        prevActiveIdRef.current = activeId;
        return;
      }

      const prev = prevStateRef.current[activeId];
      if (!prev) {
        prevStateRef.current[activeId] = { content, cursor: 0 };
        return;
      }
      if (prev.content === content) return;

      if (!snapshotTimerRef.current) {
        pushToPast(activeId, prev.content, prev.cursor);
      }

      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = setTimeout(() => {
        snapshotTimerRef.current = null;
      }, 400);

      prevStateRef.current[activeId] = {
        content,
        cursor: getCursorPosition(),
      };
    },
    [activeId, getCursorPosition, pushToPast],
  );

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    getCursorPosition,
    updateContent,
    setCursorPosition,
    snapshotOnChange,
    isUndoingRef,
    // Setters to inject editor methods
    _setCursorRef: (fn: () => number) => { cursorRef.current = fn; },
    _setSetCursorRef: (fn: (pos: number) => void) => { setCursorRef.current = fn; },
    _setUpdateContentRef: (fn: (content: string) => void) => { updateContentRef.current = fn; },
  } as UseHistoryReturn & {
    _setCursorRef: (fn: () => number) => void;
    _setSetCursorRef: (fn: (pos: number) => void) => void;
    _setUpdateContentRef: (fn: (content: string) => void) => void;
  };
};
