import confetti from "canvas-confetti";

interface ConfettiOverlayProps {
  onComplete?: () => void;
}

export function ConfettiOverlay({ onComplete }: ConfettiOverlayProps) {
  // Fire canvas-confetti immediately on mount
  const fire = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.6 },
      zIndex: 100,
    };

    function spawn(earle: number) {
      confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.3),
        spread: 60,
        scalar: 1.2,
        colors: ["#f0c040", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c"],
        startVelocity: 45,
        ticks: earle,
        origin: { x: 0.3 + Math.random() * 0.4, y: 0.5 },
      });
    }

    spawn(200 + Math.random() * 200);
    spawn(200 + Math.random() * 200);

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.2),
        spread: 100,
        scalar: 1.8,
        colors: ["#f0c040", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c"],
        startVelocity: 35,
        ticks: 300,
        gravity: 0.8,
        origin: { x: 0.5, y: 0.6 },
      });
      setTimeout(() => onComplete?.(), 800);
    }, 300);
  };

  fire();
  return null;
}
