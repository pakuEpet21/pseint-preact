import { useEffect } from "preact/hooks";
import type { ChangeEvent, TargetedEvent } from "preact/compat";
import {
  Plus,
  X,
  FileCode2,
  Sparkles,
  Undo2,
  Redo2,
  PanelTopOpen,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { stripFileExtension } from "@/shared/lib/file-utils";
import type { FileTab } from "@/features/editor/hooks/useTabs";

interface FileTabBarProps {
  tabs: FileTab[];
  activeId: string;
  editingTabId: string | null;
  editingTabName: string;
  canUndo: boolean;
  canRedo: boolean;
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

export const FileTabBar = ({
  tabs,
  activeId,
  editingTabId,
  editingTabName,
  canUndo,
  canRedo,
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

  return (
    <div className="flex items-center border-b border-border bg-background">
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

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onFormat}
            className="shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-primary transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="size-4" />
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
