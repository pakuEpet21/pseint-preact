import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  saveWorkspace,
  loadChallengeState,
  saveChallengeState,
  saveActiveChallenge,
  clearActiveChallenge,
} from "@/lib/pseint/storage";
import { resetIdCounter, getIdCounter } from "@/shared/lib/file-utils";
import type { FileTab } from "@/features/editor/hooks/useTabs";

export interface UseWorkspaceReturn {
  tabs: FileTab[];
  activeId: string;
  challengeState: Record<string, { completed: boolean; completedAt?: number }>;
  setTabs: React.Dispatch<React.SetStateAction<FileTab[]>>;
  setActiveId: (id: string) => void;
  setChallengeState: React.Dispatch<React.SetStateAction<Record<string, { completed: boolean; completedAt?: number }>>>;
  completeChallenge: (challengeId: string) => void;
  restoreWorkspace: (
    loadedTabs: FileTab[],
    loadedActiveId: string,
  ) => void;
  autoSave: (tabs: FileTab[], activeId: string) => void;
  saveActiveChallengeCode: (challengeId: string, code: string) => void;
  clearActiveChallengeCode: () => void;
  hydrated: React.MutableRefObject<boolean>;
  saveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export const useWorkspace = (
  setSaveState: (s: "idle" | "saving" | "saved") => void,
): UseWorkspaceReturn => {
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeId, setActiveId] = useState("");
  const [challengeState, setChallengeState] = useState<
    Record<string, { completed: boolean; completedAt?: number }>
  >({});
  const hydratedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = loadChallengeState();
    if (Object.keys(saved).length > 0) {
      setChallengeState(saved);
    }
  }, []);

  const completeChallenge = useCallback((challengeId: string) => {
    setChallengeState((prev) => {
      const updated = {
        ...prev,
        [challengeId]: { completed: true, completedAt: Date.now() },
      };
      saveChallengeState(updated);
      return updated;
    });
  }, []);

  const restoreWorkspace = useCallback(
    (loadedTabs: FileTab[], loadedActiveId: string) => {
      loadedTabs.forEach((t) => {
        const n = Number.parseInt(t.id.replace(/\D/g, ""), 10);
        if (!Number.isNaN(n) && n >= getIdCounter()) resetIdCounter(n);
      });
      setTabs(loadedTabs);
      setActiveId(
        loadedTabs.some((t) => t.id === loadedActiveId)
          ? loadedActiveId
          : loadedTabs[0].id,
      );
      hydratedRef.current = true;
    },
    [],
  );

  const autoSave = useCallback(
    (tabsToSave: FileTab[], currentActiveId: string) => {
      if (!hydratedRef.current) return;
      setSaveState("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const workspaceTabs = tabsToSave.filter((t) => !t.isChallenge);
        saveWorkspace({ tabs: workspaceTabs, activeId: currentActiveId });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      }, 600);
    },
    [setSaveState],
  );

  const saveActiveChallengeCode = useCallback((challengeId: string, code: string) => {
    saveActiveChallenge({ challengeId, code });
  }, []);

  const clearActiveChallengeCode = useCallback(() => {
    clearActiveChallenge();
  }, []);

  return {
    tabs,
    activeId,
    challengeState,
    setTabs,
    setActiveId,
    setChallengeState,
    completeChallenge,
    restoreWorkspace,
    autoSave,
    saveActiveChallengeCode,
    clearActiveChallengeCode,
    hydrated: hydratedRef,
    saveTimerRef,
  };
};
