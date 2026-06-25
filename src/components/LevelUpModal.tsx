import { useEffect, useRef } from "preact/hooks";

interface LevelUpModalProps {
  level: number;
  onClose: () => void;
}

const STAR_COLORS = ["#f0c040", "#4ade80", "#60a5fa", "#a78bfa"] as const;

function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: 10 + Math.random() * 12,
    rotation: Math.random() * 360,
    delay: 200 + Math.random() * 600,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
  }));
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const starsRef = useRef(generateStars(12));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onClose();
    }, 2800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      {/* Expanding rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-yellow-400 animate-ringExpand"
            style={{
              width: "80px",
              height: "80px",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>

      {/* Level number */}
      <div className="relative flex flex-col items-center">
        <span
          className="text-yellow-400 animate-lvlPop"
          style={{
            fontSize: "72px",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {level}
        </span>
        <span
          className="animate-fadeSlideUp mt-2 text-white tracking-[3px] text-sm font-medium"
          style={{ animationDelay: "300ms" }}
        >
          LEVEL UP
        </span>
      </div>

      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {starsRef.current.map((star) => (
          <div
            key={star.id}
            className="absolute animate-starSpin"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.x}%`,
              top: `${star.y}%`,
              animationDelay: `${star.delay}ms`,
            }}
          >
            <svg viewBox="0 0 24 24" fill={star.color}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
