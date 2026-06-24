import { Trophy } from "lucide-react";
import type { ChallengeData } from "@/lib/pseint/challenges";

interface ChallengeBannerProps {
  challenge: ChallengeData;
  onOpenChallenges: () => void;
}

export function ChallengeBanner({ challenge, onOpenChallenges }: ChallengeBannerProps) {
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
        <button
          type="button"
          onClick={onOpenChallenges}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:brightness-110"
        >
          Ver desafíos
        </button>
      </div>
      <p className="text-sm text-foreground">{challenge.instruction}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-primary">Pista:</span> {challenge.hint}
      </p>
    </div>
  );
}
