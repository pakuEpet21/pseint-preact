import {
  Play,
  Square,
  Download,
  FolderOpen,
  Plus,
  Settings,
  Cloud,
  CloudCheck,
  Trophy,
  Share2,
  Bug,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChallengesDialog } from "@/components/challenges/challenges-dialog";
import type { ChallengeStore } from "@/lib/pseint/storage";
import type { ChallengeData } from "@/lib/pseint/challenges";

interface ToolbarProps {
  running: boolean;
  challengesOpen: boolean;
  challengeState: ChallengeStore;
  saveState: "idle" | "saving" | "saved";
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  onOpenFile: () => void;
  onDownload: (format: "psc" | "txt") => void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenChallenges: (open: boolean) => void;
  onSelectChallenge: (challenge: ChallengeData) => void;
  onResetChallenge: (challengeId: string) => void;
}

export const Toolbar = ({
  running,
  challengesOpen,
  challengeState,
  saveState,
  onRun,
  onDebug,
  onStop,
  onOpenFile,
  onDownload,
  onShare,
  onOpenSettings,
  onOpenChallenges,
  onSelectChallenge,
  onResetChallenge,
}: ToolbarProps) => {
  return (
    <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="leading-tight flex items-center gap- text-lg font-bold">
          <span className="bg-gradient-to-r uppercase from-sky-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            Next
          </span>
          PSeint{" "}
        </div>
        <div className="ml-2 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          {saveState === "saving" && <Cloud className="size-3.5" />}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-primary">
              <CloudCheck className="size-3.5" />
            </span>
          )}
          {saveState === "idle" && (
            <span className="flex items-center gap-1">
              <CloudCheck className="size-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden">
                <Plus className="size-4" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Más opciones</TooltipContent>
          </Tooltip>
          <DropdownMenuContent centerScreen side="bottom" align="center" className="w-72">
            <DropdownMenuItem onClick={onOpenFile}>
              <FolderOpen className="mr-2 size-4" />
              Abrir archivo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDownload("psc")}>
              <Download className="mr-2 size-4" />
              Descargar (.psc)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload("txt")}>
              <Download className="mr-2 size-4" />
              Descargar (.txt)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 size-4" />
              Compartir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="mr-2 size-4" />
              Configuración
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger className="hidden cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex">
                <Plus className="size-4" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Más opciones</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="bottom" align="end" className="w-64">
            <DropdownMenuItem onClick={onOpenFile}>
              <FolderOpen className="mr-2 size-4" />
              Abrir archivo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDownload("psc")}>
              <Download className="mr-2 size-4" />
              Descargar (.psc)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload("txt")}>
              <Download className="mr-2 size-4" />
              Descargar (.txt)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 size-4" />
              Compartir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="mr-2 size-4" />
              Configuración
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onOpenChallenges(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Desafíos"
            >
              <Trophy className="size-4" />
              <span className="hidden md:flex font-bold">Desafíos</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Desafíos</TooltipContent>
        </Tooltip>
        <ChallengesDialog
          open={challengesOpen}
          onOpenChange={onOpenChallenges}
          challengeState={challengeState}
          onSelectChallenge={onSelectChallenge}
          onResetChallenge={onResetChallenge}
        />

        <button
          onClick={onDebug}
          title="Depurar paso a paso"
          disabled={running}
          className={`${running ? "bg-muted text-muted-foreground" : " hover:bg-accent hover:brightness-110"} flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors duration-200`}
        >
          <Bug className="size-4" />
          <span className="hidden md:flex font-bold"> Depurar</span>
        </button>

        {running ? (
          <button
            onClick={onStop}
            className="flex cursor-pointer items-center gap-1.5 md:w-28 flex items-center justify-center rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white transition-colors hover:brightness-110 duration-200"
          >
            <Square className="size-4" />
            <span className="hidden md:flex font-bold">Detener</span>
          </button>
        ) : (
          <button
            onClick={onRun}
            title="Ejecutar (Ctrl+Enter)"
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-primary md:w-28 flex items-center justify-center px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110 duration-200"
          >
            <Play className="stroke-2 size-4" />
            <span className="hidden md:flex font-bold">Ejecutar</span>
          </button>
        )}
      </div>
    </header>
  );
};
