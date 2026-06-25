import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  saveWorkspace,
  loadChallengeState,
  saveChallengeState,
  loadXpLevel,
  saveXpLevel,
  type ChallengeStore,
} from "@/lib/pseint/storage";
import { resetIdCounter, getIdCounter } from "@/shared/lib/file-utils";
import type { FileTab } from "@/features/editor/hooks/useTabs";

export interface UseWorkspaceReturn {
  tabs: FileTab[];
  activeId: string;
  challengeState: ChallengeStore;
  xp: number;
  level: number;
  showLevelUp: boolean;
  pendingLevelUp: number | null;
  setTabs: React.Dispatch<React.SetStateAction<FileTab[]>>;
  setActiveId: (id: string) => void;
  setChallengeState: React.Dispatch<React.SetStateAction<ChallengeStore>>;
  completeChallenge: (challengeId: string) => void;
  restoreWorkspace: (
    loadedTabs: FileTab[],
    loadedActiveId: string,
  ) => void;
  autoSave: (tabs: FileTab[], activeId: string) => void;
  hydrated: React.MutableRefObject<boolean>;
  saveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  addXp: (amount: number) => { leveledUp: boolean; newLevel: number };
  setShowLevelUp: (show: boolean) => void;
  getXpForChallenge: () => number;
}

export const useWorkspace = (
  setSaveState: (s: "idle" | "saving" | "saved") => void,
): UseWorkspaceReturn => {
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeId, setActiveId] = useState("");
  const [challengeState, setChallengeState] = useState<ChallengeStore>({});
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const hydratedRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = loadChallengeState();
    if (Object.keys(saved).length > 0) {
      setChallengeState(saved);
    }
  }, []);

  useEffect(() => {
    const saved = loadXpLevel();
    setXp(saved.xp);
    setLevel(saved.level);
  }, []);

  const addXp = useCallback((amount: number): { leveledUp: boolean; newLevel: number } => {
    let newXp = xp;
    let newLevel = level;
    let leveledUp = false;

    newXp += amount;
    if (newXp >= 100) {
      newXp -= 100;
      newLevel += 1;
      leveledUp = true;
      setPendingLevelUp(newLevel);
      setShowLevelUp(true);
    }

    setXp(newXp);
    setLevel(newLevel);
    saveXpLevel(newXp, newLevel);

    return { leveledUp, newLevel };
  }, [xp, level]);

  const setShowLevelUpFn = useCallback((show: boolean) => {
    setShowLevelUp(show);
    if (!show) {
      setPendingLevelUp(null);
    }
  }, []);

  const getXpForChallenge = useCallback(() => 40, []);

  const completeChallenge = useCallback((challengeId: string) => {
    setChallengeState((prev) => {
      const updated: ChallengeStore = {
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

  return {
    tabs,
    activeId,
    challengeState,
    xp,
    level,
    showLevelUp,
    pendingLevelUp,
    setTabs,
    setActiveId,
    setChallengeState,
    completeChallenge,
    restoreWorkspace,
    autoSave,
    hydrated: hydratedRef,
    saveTimerRef,
    addXp,
    setShowLevelUp: setShowLevelUpFn,
    getXpForChallenge,
  };
};
