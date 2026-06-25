import { useCallback, useState } from "preact/hooks";
import type { TargetedEvent } from "preact/compat";
import { newId, stripFileExtension } from "@/shared/lib/file-utils";
import { STARTER_CODE } from "@/lib/pseint/snippets";
import { loadWorkspace } from "@/lib/pseint/storage";
import type { ChallengeData } from "@/lib/pseint/challenges";

export interface FileTab {
  id: string;
  name: string;
  content: string;
  isChallenge?: boolean;
  challengeId?: string;
}

const DESAFIOS_TAB_ID = "___desafios___";

const getDesafiosTab = (challenge: ChallengeData, initialCode?: string): FileTab => ({
  id: DESAFIOS_TAB_ID,
  name: "Desafíos",
  content: initialCode ?? challenge.starterCode,
  isChallenge: true,
  challengeId: challenge.id,
});

const DEFAULT_TAB: FileTab = {
  id: newId(),
  name: "ejemplo.psc",
  content: STARTER_CODE,
};

function loadInitialState(): { tabs: FileTab[]; activeId: string } {
  try {
    const saved = loadWorkspace();
    if (saved && saved.tabs.length > 0) {
      return {
        tabs: saved.tabs.map((t) => ({ ...t })),
        activeId: saved.activeId,
      };
    }
  } catch {
    // ignore
  }
  return { tabs: [DEFAULT_TAB], activeId: DEFAULT_TAB.id };
}

export interface UseTabsReturn {
  tabs: FileTab[];
  activeTab: FileTab;
  activeId: string;
  setActiveId: (id: string) => void;
  addTab: () => void;
  openTab: (tab: FileTab) => void;
  updateTabContent: (id: string, content: string) => void;
  closeTab: (id: string) => void;
  renameTab: (id: string) => void;
  saveRename: () => void;
  cancelRename: () => void;
  // Rename state
  editingTabId: string | null;
  editingTabName: string;
  setEditingTabName: (name: string) => void;
  // Close confirmation
  tabPendingClose: FileTab | null;
  requestCloseTab: (id: string, e: TargetedEvent<HTMLButtonElement>) => void;
  confirmCloseTab: () => void;
  cancelCloseTab: () => void;
  // Challenge mode
  isChallengesMode: boolean;
  enterChallengesMode: (challenge: ChallengeData, initialCode?: string) => void;
  exitChallengesMode: () => void;
  currentChallengeId: string | null;
  setCurrentChallenge: (challenge: ChallengeData) => void;
}

export const useTabs = (): UseTabsReturn => {
  const initial = loadInitialState();
  const [tabs, setTabs] = useState<FileTab[]>(initial.tabs);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [tabPendingClose, setTabPendingClose] = useState<FileTab | null>(null);
  const [hiddenTabs, setHiddenTabs] = useState<FileTab[]>([]);
  const [hiddenActiveId, setHiddenActiveId] = useState<string | null>(null);
  const [isChallengesMode, setIsChallengesMode] = useState(false);
  const [currentChallengeId, setCurrentChallengeId] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const addTab = useCallback(() => {
    const count = tabs.length + 1;
    const tab: FileTab = {
      id: newId(),
      name: `archivo${count}.psc`,
      content: "Algoritmo SinTitulo\n\t\nFinAlgoritmo",
    };
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, [tabs.length]);

  const openTab = useCallback((tab: FileTab) => {
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, []);

  const updateTabContent = useCallback((id: string, content: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
  }, []);

  const enterChallengesMode = useCallback((challenge: ChallengeData, initialCode?: string) => {
    const desafiosTab = getDesafiosTab(challenge, initialCode);
    setHiddenTabs(tabs);
    setHiddenActiveId(activeId);
    setTabs([desafiosTab]);
    setActiveId(DESAFIOS_TAB_ID);
    setCurrentChallengeId(challenge.id);
    setIsChallengesMode(true);
  }, [tabs, activeId]);

  const exitChallengesMode = useCallback(() => {
    const restoredTabs = hiddenTabs.length > 0 ? hiddenTabs : [{ ...DEFAULT_TAB, id: newId() }];
    setTabs(restoredTabs);
    setActiveId(hiddenActiveId ?? restoredTabs[0].id);
    setHiddenTabs([]);
    setHiddenActiveId(null);
    setCurrentChallengeId(null);
    setIsChallengesMode(false);
  }, [hiddenTabs, hiddenActiveId]);

  const setCurrentChallenge = useCallback((challenge: ChallengeData) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === DESAFIOS_TAB_ID
          ? { ...t, content: challenge.starterCode, challengeId: challenge.id }
          : t,
      ),
    );
    setCurrentChallengeId(challenge.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      if (id === DESAFIOS_TAB_ID) {
        exitChallengesMode();
        return;
      }
      setTabs((prev) => {
        if (prev.length === 1) return prev;
        const next = prev.filter((t) => t.id !== id);
        if (id === activeId) setActiveId(next[next.length - 1].id);
        return next;
      });
    },
    [activeId, exitChallengesMode],
  );

  const renameTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    setEditingTabId(id);
    setEditingTabName(stripFileExtension(tab.name));
  }, [tabs]);

  const saveRename = useCallback(() => {
    if (!editingTabId) return;
    const nextName = editingTabName.trim();
    if (nextName) {
      setTabs((prev) =>
        prev.map((t) => (t.id === editingTabId ? { ...t, name: nextName } : t)),
      );
    }
    setEditingTabId(null);
    setEditingTabName("");
  }, [editingTabId, editingTabName]);

  const cancelRename = useCallback(() => {
    setEditingTabId(null);
    setEditingTabName("");
  }, []);

  const requestCloseTab = useCallback((id: string, e: TargetedEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    setTabPendingClose(tab);
  }, [tabs]);

  const confirmCloseTab = useCallback(() => {
    const id = tabPendingClose?.id;
    if (!id) return;
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
    setTabPendingClose(null);
  }, [tabPendingClose, activeId]);

  const cancelCloseTab = useCallback(() => {
    setTabPendingClose(null);
  }, []);

  return {
    tabs,
    activeTab,
    activeId,
    setActiveId,
    addTab,
    openTab,
    updateTabContent,
    closeTab,
    renameTab,
    saveRename,
    cancelRename,
    editingTabId,
    editingTabName,
    setEditingTabName,
    tabPendingClose,
    requestCloseTab,
    confirmCloseTab,
    cancelCloseTab,
    isChallengesMode,
    enterChallengesMode,
    exitChallengesMode,
    currentChallengeId,
    setCurrentChallenge,
  };
};
