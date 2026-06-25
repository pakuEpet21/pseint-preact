import { useEffect } from "preact/hooks";
import type { ChangeEvent, TargetedEvent } from "preact/compat";
import {
  Plus,
  X,
  FileCode2,
  Undo2,
  Redo2,
  PanelTopOpen,
  TextInitial,
  ChevronLeft,
  ChevronRight,
  Trophy,
  LogOut,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { stripFileExtension } from "@/shared/lib/file-utils";
import { cn } from "@/lib/utils";
import type { FileTab } from "@/features/editor/hooks/useTabs";
import type { ChallengeStore } from "@/lib/pseint/storage";
import { challenges } from "@/lib/pseint/challenges";

interface FileTabBarProps {
  tabs: FileTab[];
  activeId: string;
  editingTabId: string | null;
  editingTabName: string;
  canUndo: boolean;
  canRedo: boolean;
  isChallengesMode: boolean;
  currentChallengeIndex?: number;
  challengeState?: ChallengeStore;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  onOpenChallenges?: () => void;
  renameInputRef: { current: HTMLInputElement | null };
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: TargetedEvent<HTMLButtonElement>) => void;
  onDoubleClickRename: (id: string) => void;
  onAddTab: () => void;
  onFormat: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowOps: () => void;
  onEditNameChange: (name: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
}

/** Find the highest unlocked challenge index based on challengeState */
function getLastUnlockedIndex(challengeState: ChallengeStore): number {
  let lastUnlocked = 0;
  for (let i = 0; i < challenges.length; i++) {
    if (i < 3) {
      lastUnlocked = i;
      continue;
    }
    const firstThreeCompleted = challenges.slice(0, 3).every(
      (c) => challengeState[c.id]?.completed,
    );
    if (firstThreeCompleted) {
      lastUnlocked = i;
    } else {
      break;
    }
  }
  return lastUnlocked;
}

export const FileTabBar = ({
  tabs,
  activeId,
  editingTabId,
  editingTabName,
  canUndo,
  canRedo,
  isChallengesMode,
  currentChallengeIndex = 0,
  challengeState,
  onPrevious,
  onNext,
  onClose,
  onOpenChallenges,
  renameInputRef,
  onSelectTab,
  onCloseTab,
  onDoubleClickRename,
  onAddTab,
  onFormat,
  onUndo,
  onRedo,
  onShowOps,
  onEditNameChange,
  onSaveRename,
  onCancelRename,
}: FileTabBarProps) => {
  useEffect(() => {
    if (!editingTabId || !renameInputRef.current) return;
    renameInputRef.current.focus();
    renameInputRef.current.select();
  }, [editingTabId, renameInputRef]);

  const store = challengeState ?? {};
  const lastUnlockedIndex = getLastUnlockedIndex(store);

  return (
    <div className="flex items-center border-b border-border bg-background">
      {/* Challenge mode: show navigation controls */}
      {isChallengesMode ? (
        <div className="flex flex-1 items-center gap-2 px-3 py-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
            <Trophy className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-primary">Desafíos</span>
          <div className="mx-2 flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevious}
              disabled={currentChallengeIndex === 0}
              className={cn(
                "rounded p-1 transition-colors",
                currentChallengeIndex === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent",
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={onOpenChallenges}
              className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium tabular-nums text-primary transition-colors hover:bg-primary/20"
            >
              {currentChallengeIndex + 1}/{lastUnlockedIndex + 1}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentChallengeIndex >= lastUnlockedIndex}
              className={cn(
                "rounded p-1 transition-colors",
                currentChallengeIndex >= lastUnlockedIndex
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent",
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-secundary transition-colors hover:bg-primary-foreground hover:brightness-110"
            >
              <LogOut className="size-4" />
              Salir
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center overflow-x-auto">
          {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            onDblClick={() => onDoubleClickRename(t.id)}
            className={`group flex shrink-0 cursor-pointer items-center gap-1 border-r border-border px-2 py-2 text-sm transition-colors ${
              t.id === activeId
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
            title="Doble clic para renombrar"
          >
            <FileCode2 className="size-3.5 text-primary" />
            {editingTabId === t.id ? (
              <input
                ref={renameInputRef as unknown as { current: HTMLInputElement | null }}
                value={editingTabName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onEditNameChange(e.currentTarget.value)
                }
                onClick={(e) => e.stopPropagation()}
                onDblClick={(e) => e.stopPropagation()}
                onBlur={onSaveRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSaveRename();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onCancelRename();
                  }
                }}
                className="min-w-24 rounded-md border border-border bg-background px-1 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <span className="max-w-40 truncate">
                {stripFileExtension(t.name)}
              </span>
            )}
            <button
              onClick={(e) => onCloseTab(t.id, e as TargetedEvent<HTMLButtonElement>)}
              className="cursor-pointer rounded md:opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              aria-label={`Cerrar ${t.name}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        </div>
      )}

      {!isChallengesMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onAddTab}
              className="shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Nueva pestaña"
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Nueva pestaña</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onFormat}
            className="shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-primary transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TextInitial className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Formatear</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Deshacer"
          >
            <Undo2 className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Deshacer</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Rehacer"
          >
            <Redo2 className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Rehacer</TooltipContent>
      </Tooltip>

      <button
        onClick={onShowOps}
        className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border-l border-border bg-sidebar px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        title="Mostrar operaciones"
      >
        <PanelTopOpen className="size-4" />
      </button>
    </div>
  );
};
