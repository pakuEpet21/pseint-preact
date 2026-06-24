import { useEffect, useRef } from "preact/hooks";
import { X, Trophy, Lock, CheckCircle2, Lightbulb } from "lucide-react";
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
          <button
            type="button"
            onClick={onSelect}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:brightness-110"
          >
            <Trophy className="size-3.5" />
            Ver solución
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const isUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    const prev = challenges[index - 1];
    return !!challengeState[prev.id]?.completed;
  };

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
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Trophy className="size-5 text-primary" />
              </div>
              <div>
                <h2 id="challenges-title" className="text-lg font-semibold">
                  Desafíos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Completá desafíos para practicar PSeInt
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Cerrar desafíos"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="space-y-3 p-6">
            {challenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                state={challengeState[challenge.id]}
                isUnlocked={isUnlocked(index)}
                onSelect={() => onSelectChallenge(challenge)}
                onReset={() => onResetChallenge(challenge.id)}
              />
            ))}
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
