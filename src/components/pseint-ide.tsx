import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ChangeEvent } from "preact/compat";

import { PanelLeftOpen } from "lucide-react";
import { Toolbar } from "@/app/components/toolbar";
import { FileTabBar } from "@/features/editor/components/file-tab-bar";
import { EditorPane } from "@/features/editor/components/editor-pane";
import { RightPanel } from "@/features/console/components/right-panel";
import { SnippetPanel } from "@/components/snippet-panel";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { CloseConfirmDialog } from "@/features/editor/components/close-confirm-dialog";

import { ConfettiOverlay } from "@/components/ConfettiOverlay";
import type { CodeEditorHandle } from "@/components/code-editor";
import { useTabs } from "@/features/editor/hooks/useTabs";
import { useHistory } from "@/features/editor/hooks/useHistory";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useDebugger } from "@/features/debug/hooks/useDebugger";
import { useShare } from "@/features/share/hooks/useShare";
import { useWorkspace } from "@/features/workspace/hooks/useWorkspace";
import { formatPseint } from "@/lib/pseint/format";
import { downloadFile, readFileAsText, newId } from "@/shared/lib/file-utils";
import { challenges, getChallengeById, type ChallengeData } from "@/lib/pseint/challenges";
import type { ConsoleLine } from "@/lib/pseint/interpreter";

export function PseintIDE() {
  const [showOps, setShowOps] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [challengesOpen, setChallengesOpen] = useState(false);
  const [hoveredVariable, setHoveredVariable] = useState<{ name: string; line?: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);
  const renameInputRef = useRef<HTMLInputElement>(null!);

  const {
    tabs,
    activeTab,
    activeId,
    setActiveId,
    addTab,
    openTab,
    updateTabContent,
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
  } = useTabs();

  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    strictMode,
    setStrictMode,
    strongTyping,
    setStrongTyping,
    consoleSimple,
    setConsoleSimple,
    consoleFont,
    editorFont,
    consoleFontSize,
    setConsoleFontSize,
    saveState,
    setSaveState,
  } = useSettings();

  const {
    running,
    waitingForInput,
    debugActive,
    debugPaused,
    debugLine,
    debugVars,
    lines,
    vars,
    errorLines,
    _setLines,
    _inputResolverRef,
    _abortRef,
    run,
    stop,
    step,
    clearConsole,
  } = useDebugger();

  // History
  const historyResult = useHistory(activeId);
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    snapshotOnChange,
  } = historyResult;

  // Inject editor methods into history after mount
  useEffect(() => {
    const h = historyResult as typeof historyResult & {
      _setCursorRef: (fn: () => number) => void;
      _setSetCursorRef: (fn: (pos: number) => void) => void;
      _setUpdateContentRef: (fn: (content: string) => void) => void;
    };
    h._setCursorRef(() => editorRef.current?.getCursorPosition() ?? 0);
    h._setSetCursorRef((pos) => editorRef.current?.setCursorPosition(pos));
    h._setUpdateContentRef((content) => updateTabContent(activeId, content));
  });

  const { shareCode, loadSharedCode } = useShare(setSaveState);

  const {
    challengeState,
    autoSave,
    completeChallenge,
  } = useWorkspace(setSaveState);

  // Auto-save on tab changes
  useEffect(() => {
    autoSave(tabs, activeId);
  }, [tabs, activeId, autoSave]);

  // Load shared code on mount
  useEffect(() => {
    void loadSharedCode().then((code) => {
      if (code) {
        openTab({ id: newId(), name: "compartido.psc", content: code });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tabPendingClose && e.key === "Escape") {
        e.preventDefault();
        cancelCloseTab();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleFormat();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!running) void handleRun(false);
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        downloadFile(activeTab.content, activeTab.name, "psc");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, activeTab, tabPendingClose, cancelCloseTab]);

  const appendLine = useCallback((line: ConsoleLine) => {
    if (line.type === "info" && line.text === "\u0001CLEAR\u0001") {
      _setLines([]);
      return;
    }
    _setLines((prev) => [...prev, line]);
  }, [_setLines]);

  const submitInput = useCallback((value: string) => {
    _inputResolverRef.current?.(value);
    _inputResolverRef.current = null;
  }, [_inputResolverRef]);

  const handleRun = useCallback(async (debug: boolean) => {
    const isChallengeTab = activeTab.isChallenge && activeTab.challengeId;
    const challenge = isChallengeTab ? getChallengeById(activeTab.challengeId!) : undefined;

    // Track if this is a first-time completion before running
    const isFirstCompletion = isChallengeTab
      ? !challengeState[activeTab.challengeId!]?.completed
      : false;

    const requestInput = (): Promise<string> => {
      return new Promise<string>((resolve) => {
        _inputResolverRef.current = (v) => {
          _inputResolverRef.current = null;
          resolve(v);
        };
      });
    };

    const handleChallengeComplete = (challengeId: string, passed: boolean) => {
      if (passed && isFirstCompletion) {
        setShowConfetti(true);
        completeChallenge(challengeId);
    
      }
    };

    await run(activeTab.content, {
      challenge,
      strictMode,
      strongTyping,
      debug,
      onChallengeComplete: handleChallengeComplete,
    }, {
      appendLine,
      requestInput,
      signal: _abortRef.current,
    });
  }, [activeTab, run, strictMode, strongTyping, appendLine, _inputResolverRef, _abortRef, challengeState]);

  const handleFormat = useCallback(() => {
    const formatted = formatPseint(activeTab.content);
    updateActiveContent(formatted);
  }, [activeTab.content]);

  const updateActiveContent = useCallback(
    (content: string) => {
      if (debugActive) stop();
      updateTabContent(activeId, content);
      snapshotOnChange(content);
    },
    [activeId, debugActive, stop, updateTabContent, snapshotOnChange],
  );

  const handleOpenFile = () => fileInputRef.current?.click();

  const handleFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const { name, content } = await readFileAsText(file);
    openTab({ id: newId(), name, content });
    e.currentTarget.value = "";
  };

  const handleDownload = (format: "psc" | "txt") => {
    downloadFile(activeTab.content, activeTab.name, format);
  };

  const handleSelectChallenge = (challenge: ChallengeData) => {
    const existing = tabs.find((t) => t.challengeId === challenge.id);
    if (existing) {
      setActiveId(existing.id);
    } else {
      openTab({
        id: newId(),
        name: `${challenge.title}.psc`,
        content: challenge.starterCode,
        isChallenge: true,
        challengeId: challenge.id,
      });
    }
    setCurrentChallengeIndex(challenges.findIndex((c) => c.id === challenge.id));
    setChallengesOpen(false);
  };

  const getCurrentChallenge = (): ChallengeData | undefined => {
    if (!activeTab.isChallenge || !activeTab.challengeId) return undefined;
    return getChallengeById(activeTab.challengeId);
  };

  const handlePreviousChallenge = () => {
    const current = getCurrentChallenge();
    if (!current) return;
    const idx = challenges.findIndex((c) => c.id === current.id);
    if (idx > 0) {
      const prev = challenges[idx - 1];
      handleSelectChallenge(prev);
    }
  };

  const handleNextChallenge = () => {
    const current = getCurrentChallenge();
    if (!current) return;
    const idx = challenges.findIndex((c) => c.id === current.id);
    if (idx < challenges.length - 1) {
      const next = challenges[idx + 1];
      handleSelectChallenge(next);
    }
  };

  const handleResetChallenge = (challengeId: string) => {
    const challenge = getChallengeById(challengeId);
    if (!challenge) return;
    openTab({
      id: newId(),
      name: `${challenge.title}.psc`,
      content: challenge.starterCode,
      isChallenge: true,
      challengeId: challenge.id,
    });
  };

  const handleInsertSnippet = useCallback(
    (code: string) => {
      if (editorRef.current) {
        const sep = activeTab.content.length && !activeTab.content.endsWith("\n") ? "\n" : "";
        editorRef.current.insertAtCursor(sep + code + "\n");
      }
    },
    [activeTab.content],
  );

  const handleClearConsole = useCallback(() => {
    clearConsole();
  }, [clearConsole]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar
        running={running}
        challengesOpen={challengesOpen}
        challengeState={challengeState}
        saveState={saveState}
        onRun={() => void handleRun(false)}
        onDebug={() => void handleRun(true)}
        onStop={stop}
        onOpenFile={handleOpenFile}
        onDownload={handleDownload}
        onShare={() => shareCode(activeTab.content)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenChallenges={setChallengesOpen}
        onSelectChallenge={handleSelectChallenge}
        onResetChallenge={handleResetChallenge}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Operations panel */}
        {showOps ? (
          <div className="flex shrink-0 flex-col border-b border-border animate-in slide-in-from-left-2 fade-in duration-300 lg:w-64 lg:border-b-0 lg:border-r">
            <div className="min-h-0 flex-1">
              <SnippetPanel
                onInsert={handleInsertSnippet}
                onHide={() => setShowOps(false)}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowOps(true)}
            className="hidden lg:flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b border-border bg-sidebar py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:w-9 lg:flex-col lg:border-b-0 lg:border-r lg:py-3"
            title="Mostrar operaciones"
          >
            <PanelLeftOpen className="size-4" />
            <span className="lg:[writing-mode:vertical-rl]">Operaciones</span>
          </button>
        )}

        {/* Left: editor + tabs */}
        <section className="flex min-h-0 flex-1 flex-col border-b border-border lg:border-b-0">
          {/* File tab bar */}
          <FileTabBar
            tabs={tabs}
            activeId={activeId}
            editingTabId={editingTabId}
            editingTabName={editingTabName}
            canUndo={canUndo}
            canRedo={canRedo}
            renameInputRef={renameInputRef as unknown as { current: HTMLInputElement | null }}
            onSelectTab={setActiveId}
            onCloseTab={requestCloseTab}
            onDoubleClickRename={renameTab}
            onAddTab={addTab}
            onFormat={handleFormat}
            onUndo={undo}
            onRedo={redo}
            onShowOps={() => setShowOps(true)}
            onEditNameChange={setEditingTabName}
            onSaveRename={saveRename}
            onCancelRename={cancelRename}
          />

          {/* Code editor */}
          <EditorPane
            activeTab={activeTab}
            editorRef={editorRef}
            errorLines={errorLines}
            highlightVariable={hoveredVariable}
            debugActive={debugActive}
            debugLine={debugLine}
            fontSize={fontSize}
            editorFont={editorFont}
            onChange={updateActiveContent}
            onUndo={undo}
            onRedo={redo}
            onOpenChallenges={setChallengesOpen}
            currentChallengeIndex={currentChallengeIndex}
            totalChallenges={challenges.length}
            onPrevious={handlePreviousChallenge}
            onNext={handleNextChallenge}
          />
        </section>

        {/* Right panel */}
        <RightPanel
          lines={lines}
          vars={vars}
          debugActive={debugActive}
          debugPaused={debugPaused}
          waitingForInput={waitingForInput}
          consoleSimple={consoleSimple}
          consoleFont={consoleFont}
          consoleFontSize={consoleFontSize}
          debugVars={debugVars}
          code={activeTab.content}
          onSubmitInput={submitInput}
          onHoverVariable={setHoveredVariable}
          onClearConsole={handleClearConsole}
          onStep={step}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        setTheme={setTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        strictMode={strictMode}
        setStrictMode={setStrictMode}
        strongTyping={strongTyping}
        setStrongTyping={setStrongTyping}
        consoleSimple={consoleSimple}
        setConsoleSimple={setConsoleSimple}
        consoleFontSize={consoleFontSize}
        setConsoleFontSize={setConsoleFontSize}
      />

      <CloseConfirmDialog
        tab={tabPendingClose}
        onConfirm={confirmCloseTab}
        onCancel={cancelCloseTab}
      />

      {showConfetti && (
        <ConfettiOverlay onComplete={() => setShowConfetti(false)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".psc,.txt,.pseint,text/plain"
        onChange={handleFileChosen}
        className="hidden"
      />
    </div>
  );
}
