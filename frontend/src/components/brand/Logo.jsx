import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 group cursor-pointer", className)}>
      <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#FF6500] to-orange-500 flex items-center justify-center text-white font-mono font-black text-base shadow-[0_0_15px_rgba(255,101,0,0.4)]">
        &gt;_
      </div>
      {!compact && (
        <div className="flex items-center tracking-tight">
          <span className="font-extrabold text-base tracking-wider text-white">INTER</span>
          <span className="font-extrabold text-base tracking-wider text-[#FF6500]">LEET</span>
          <span className="ml-1.5 text-[9px] font-mono uppercase bg-[#FF6500]/15 text-[#FF6500] border border-[#FF6500]/40 px-1.5 py-0.2 rounded">
            AI STUDIO
          </span>
        </div>
      )}
    </Link>
  );
}

