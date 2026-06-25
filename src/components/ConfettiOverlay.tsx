import { useEffect, useRef } from "preact/hooks";

interface ConfettiOverlayProps {
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  "#f0c040", // yellow
  "#4ade80", // green
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#f472b6", // pink
  "#fb923c", // orange
  "#34d399", // emerald
];

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  type: "square" | "circle";
}

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    delay: Math.random() * 800,
    duration: 2000 + Math.random() * 1500,
    type: Math.random() > 0.5 ? "square" : "circle",
  }));
}

export function ConfettiOverlay({ onComplete }: ConfettiOverlayProps) {
  const piecesRef = useRef<ConfettiPiece[]>(generateConfetti(60));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onComplete?.();
    }, 3500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {piecesRef.current.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0"
          style={{
            left: `${piece.x}%`,
            animation: `confettiFall ${piece.duration}ms ease-out ${piece.delay}ms forwards`,
          }}
        >
          <div
            className={piece.type === "circle" ? "rounded-full" : "rounded-sm"}
            style={{
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              transform: `rotate(${piece.rotation}deg)`,
              animation: `confettiSpin 800ms linear ${piece.delay}ms forwards`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes confettiFall {
          0% {
            top: -20px;
            opacity: 1;
          }
          100% {
            top: 110vh;
            opacity: 0;
          }
        }
        @keyframes confettiSpin {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.2);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
