import React, { useEffect, useState } from "react";

export function Waveform({ active = false, mode = "speaking" }) {
  const [bars, setBars] = useState([20, 35, 60, 45, 80, 50, 70, 30, 65, 40, 25, 55]);

  useEffect(() => {
    if (!active) {
      setBars([15, 20, 25, 20, 15, 20, 25, 20, 15, 20, 25, 20]);
      return;
    }

    const interval = setInterval(() => {
      setBars(
        Array.from({ length: 16 }, () => {
          if (mode === "speaking") {
            return Math.floor(Math.random() * 65) + 25;
          } else if (mode === "listening") {
            return Math.floor(Math.random() * 75) + 20;
          }
          return Math.floor(Math.random() * 30) + 10;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [active, mode]);

  const colorClass =
    mode === "speaking"
      ? "bg-indigo-400"
      : mode === "listening"
      ? "bg-emerald-400"
      : "bg-amber-400";

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 px-4">
      {bars.map((height, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full transition-all duration-100 ${colorClass}`}
          style={{
            height: `${height}%`,
            opacity: active ? 0.9 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

