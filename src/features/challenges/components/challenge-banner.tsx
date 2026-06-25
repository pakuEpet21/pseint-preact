import type { ChallengeData } from "@/lib/pseint/challenges";

interface ChallengeBannerProps {
  challenge: ChallengeData;
}

export function ChallengeBanner({ challenge }: ChallengeBannerProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-md font-medium text-foreground">{challenge.title}</span>
      </div>
      <p className="text-sm text-foreground">{challenge.instruction}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-primary">Pista:</span> {challenge.hint}
      </p>
    </div>
  );
}
