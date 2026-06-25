import { Trophy, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChallengeData } from "@/lib/pseint/challenges";

interface ChallengeBannerProps {
  challenge: ChallengeData;
  currentIndex: number;
  totalChallenges: number;
  onOpenChallenges: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function ChallengeBanner({
  challenge,
  currentIndex,
  totalChallenges,
  onOpenChallenges,
  onPrevious,
  onNext,
  onClose,
}: ChallengeBannerProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
            <Trophy className="size-3.5 text-primary" />
          </div>
          <span className="text-sm font-bold text-primary">Desafío</span>
          <span className="text-sm font-medium text-foreground">{challenge.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className={cn(
                "rounded p-1 transition-colors",
                currentIndex === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent",
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-medium">
              {currentIndex + 1}/{totalChallenges}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex === totalChallenges - 1}
              className={cn(
                "rounded p-1 transition-colors",
                currentIndex === totalChallenges - 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent",
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenChallenges}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:brightness-110"
          >
            Ver desafíos
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:brightness-110"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-foreground">{challenge.instruction}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-primary">Pista:</span> {challenge.hint}
      </p>
    </div>
  );
}
