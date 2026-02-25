import { useEffect, useState } from "react";
import { Heart, MessageCircle, X, Eye } from "lucide-react";

const FAKE_COMMENTS = [
  { user: "Lucas", text: "🔥🔥🔥" },
  { user: "Ana", text: "Muito top!" },
  { user: "Pedro", text: "Quero esse!" },
  { user: "Maria", text: "Incrível demais 😍" },
  { user: "João", text: "Melhor efeito!" },
  { user: "Bia", text: "Amei ❤️" },
];

const COLORS = [
  "bg-pink-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-400",
];

interface FloatingHeart {
  id: number;
  x: number;
  delay: number;
}

const LiveOverlay = () => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [visibleComments, setVisibleComments] = useState(FAKE_COMMENTS.slice(0, 3));

  // Floating hearts animation
  useEffect(() => {
    let id = 0;
    const interval = setInterval(() => {
      id++;
      setHearts((prev) => [
        ...prev.slice(-6),
        { id, x: Math.random() * 30, delay: Math.random() * 0.5 },
      ]);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Rotate comments
  useEffect(() => {
    let idx = 3;
    const interval = setInterval(() => {
      setVisibleComments((prev) => {
        const next = [...prev.slice(1), FAKE_COMMENTS[idx % FAKE_COMMENTS.length]];
        idx++;
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none flex flex-col justify-between p-3">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">FX</span>
        </div>
        <span className="text-[10px] font-bold text-white drop-shadow-lg">LiveFX</span>
        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500 text-white tracking-wider">
          Live
        </span>
        <div className="flex items-center gap-0.5 ml-auto">
          <Eye className="w-3 h-3 text-white/80" />
          <span className="text-[9px] text-white/80 font-semibold">
            {Math.floor(Math.random() * 500 + 1200).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex items-end gap-2">
        {/* Comments */}
        <div className="flex-1 flex flex-col gap-1.5 max-w-[75%]">
          {visibleComments.map((c, i) => (
            <div
              key={`${c.user}-${i}`}
              className="flex items-center gap-1 animate-fade-in"
              style={{ opacity: 0.6 + i * 0.2 }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-[5px] font-bold text-white">
                  {c.user[0]}
                </span>
              </div>
              <div className="bg-black/40 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                <span className="text-[7px] font-bold text-white/90">
                  {c.user}
                </span>
                <span className="text-[7px] text-white/70 ml-1">{c.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Floating hearts */}
        <div className="relative w-8 h-24 flex-shrink-0">
          {hearts.map((h) => (
            <Heart
              key={h.id}
              className="absolute bottom-0 text-pink-400 fill-pink-400 animate-float-heart"
              style={{
                left: `${h.x}px`,
                animationDelay: `${h.delay}s`,
                width: "14px",
                height: "14px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveOverlay;
