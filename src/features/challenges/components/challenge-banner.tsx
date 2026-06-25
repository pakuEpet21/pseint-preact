import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChallengeData } from "@/lib/pseint/challenges";
import { challenges } from "@/lib/pseint/challenges";
import type { ChallengeStore } from "@/lib/pseint/storage";

interface ChallengeBannerProps {
  challenge: ChallengeData;
  currentIndex: number;
  totalChallenges: number;
  challengeState?: ChallengeStore;
  onOpenChallenges: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

/** Find the highest unlocked challenge index based on challengeState */
function getLastUnlockedIndex(challengeState: ChallengeStore): number {
  let lastUnlocked = 0;
  for (let i = 0; i < challenges.length; i++) {
    // First 3 are always unlocked for attempting
    if (i < 3) {
      lastUnlocked = i;
      continue;
    }
    // Intermediates unlock only when first 3 are ALL completed
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

export function ChallengeBanner({
  challenge,
  currentIndex,
  totalChallenges,
  challengeState,
  onOpenChallenges,
  onPrevious,
  onNext,
}: ChallengeBannerProps) {
  const lastUnlockedIndex = getLastUnlockedIndex(challengeState ?? {});
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalChallenges - 1;

  return (
    <div className="flex flex-col gap-2 border-b border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          
          <span className="text-md font-medium text-foreground">{challenge.title}</span>
        </div>
        
      </div>
      <p className="text-sm text-foreground">{challenge.instruction}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-primary">Pista:</span> {challenge.hint}
      </p>
    </div>
  );
}
