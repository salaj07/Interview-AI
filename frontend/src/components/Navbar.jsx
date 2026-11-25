import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, Sparkles, LayoutDashboard, Compass, Layers, ShieldCheck } from "lucide-react";

export function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#090a0f]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">Interview AI</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">
                Studio
              </span>
            </div>
            <p className="text-xs text-zinc-400">Adaptive Voice AI Practice</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              location.pathname === "/"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/setup"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Start Interview</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-[#07080c] py-8 text-center text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-400" />
          <span>Interview AI Studio &bull; Real-time AI Voice Mock Interviewer</span>
        </div>
        <p className="text-zinc-600">Built for technical & system design preparation with adaptive evaluations.</p>
      </div>
    </footer>
  );
}

