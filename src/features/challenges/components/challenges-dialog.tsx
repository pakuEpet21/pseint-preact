import { useEffect, useRef, useState } from "preact/hooks";
import { X, Trophy, Lock, CheckCircle2, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { challenges, type ChallengeData } from "@/lib/pseint/challenges";
import type { ChallengeStore } from "@/lib/pseint/storage";

interface ChallengesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeState: ChallengeStore;
  onSelectChallenge: (challenge: ChallengeData) => void;
  onResetChallenge: (challengeId: string) => void;
}

interface ChallengeCardProps {
  challenge: ChallengeData;
  state: { completed: boolean } | undefined;
  isUnlocked: boolean;
  onSelect: () => void;
  onReset: () => void;
}

function ChallengeCard({
  challenge,
  state,
  isUnlocked,
  onSelect,
  onReset,
}: ChallengeCardProps) {
  if (!isUnlocked) {
    return (
      <div
        aria-disabled="true"
        className="cursor-not-allowed rounded-xl border border-border bg-muted/30 p-4 opacity-60"
      >
        <div className="mb-2 flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">
            {challenge.title}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{challenge.description}</p>
      </div>
    );
  }

  if (state?.completed) {
    return (
      <div className="group relative rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-green-500" />
          <span className="font-medium text-green-500">{challenge.title}</span>
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
            Completado
          </span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          {challenge.description}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            Reintentar
          </button>
       
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:bg-accent/50"
    >
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="size-4 text-primary" />
        <span className="font-medium group-hover:text-primary">
          {challenge.title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{challenge.description}</p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
        <Lightbulb className="size-3.5" />
        <span>{challenge.hint}</span>
      </div>
    </button>
  );
}

export function ChallengesDialog({
  open,
  onOpenChange,
  challengeState,
  onSelectChallenge,
  onResetChallenge,
}: ChallengesDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const GROUP_SIZE = 3;

  const firstThreeCompleted = challenges.slice(0, 3).every(
    (c) => challengeState[c.id]?.completed,
  );
  const showIntermediate = firstThreeCompleted;
  const totalGroups = showIntermediate ? 2 : 1;

  const startIndex = pageIndex * GROUP_SIZE;
  const visibleChallenges = challenges.slice(startIndex, startIndex + GROUP_SIZE);

  const isCurrentGroupUnlocked = (groupIndex: number): boolean => {
    if (groupIndex === 0) return true;
    return challenges.slice(0, 3).every(c => challengeState[c.id]?.completed);
  };

  const isUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    const prev = challenges[index - 1];
    return !!challengeState[prev.id]?.completed;
  };

  useEffect(() => {
    if (open) setPageIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        open ? "visible opacity-100" : "invisible opacity-0",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-all duration-300",
          open ? "animate-in fade-in" : "",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="flex h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="challenges-title"
          className={cn(
            "relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
            "transition-all duration-300",
            open
              ? "animate-in zoom-in-95 slide-in-from-top-4 fade-in"
              : "animate-out zoom-out-95 slide-out-to-top-4 fade-out",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 id="challenges-title" className="text-lg font-semibold">
                Desafíos
              </h2>
              <p className="text-xs text-muted-foreground">
                Completá desafíos para aprender.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className={cn(
                  "rounded p-1.5 transition-colors",
                  pageIndex === 0
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent"
                )}
                aria-label="Desafíos anteriores"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-medium tabular-nums">
                {pageIndex + 1}/{totalGroups}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex(p => Math.min(totalGroups - 1, p + 1))}
                disabled={pageIndex === totalGroups - 1 || !showIntermediate}
                className={cn(
                  "rounded p-1.5 transition-colors",
                  pageIndex === totalGroups - 1 || !showIntermediate
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent"
                )}
                aria-label="Siguientes desafíos"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ml-4"
              aria-label="Cerrar desafíos"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="space-y-3 p-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {pageIndex === 0
                ? "Básicos — Saludo, Doble y Par/Impar"
                : "Intermedios — Condicionales, Bucles y Funciones"}
            </h3>

            {visibleChallenges.map((challenge, idx) => {
              const globalIndex = startIndex + idx;
              return (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  state={challengeState[challenge.id]}
                  isUnlocked={isCurrentGroupUnlocked(pageIndex) && isUnlocked(globalIndex)}
                  onSelect={() => onSelectChallenge(challenge)}
                  onReset={() => onResetChallenge(challenge.id)}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-end border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
