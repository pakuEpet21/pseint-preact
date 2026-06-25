import { useCallback, useState } from "preact/hooks";
import type { TargetedEvent } from "preact/compat";
import { newId, stripFileExtension } from "@/shared/lib/file-utils";
import { STARTER_CODE } from "@/lib/pseint/snippets";
import { loadWorkspace } from "@/lib/pseint/storage";

export interface FileTab {
  id: string;
  name: string;
  content: string;
  isChallenge?: boolean;
  challengeId?: string;
}

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
}

export const useTabs = (): UseTabsReturn => {
  const initial = loadInitialState();
  const [tabs, setTabs] = useState<FileTab[]>(initial.tabs);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [tabPendingClose, setTabPendingClose] = useState<FileTab | null>(null);

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

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length === 1) return prev;
        const next = prev.filter((t) => t.id !== id);
        if (id === activeId) setActiveId(next[next.length - 1].id);
        return next;
      });
    },
    [activeId],
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
  };
};
