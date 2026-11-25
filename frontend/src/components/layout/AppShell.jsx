import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Network,
  Trophy,
  Bell,
  Code2,
  Sparkles,
  Terminal,
  User,
  Mic
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "AI Interviews", icon: Bot },
  { to: "/setup", label: "Custom Setup", icon: Sparkles },
];

export function AppShell({ children }) {
  const path = useLocation().pathname;

  return (
    <div className="flex min-h-screen flex-col bg-[#000000] text-white">
      {/* Interleet Main Top Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#262626] bg-[#0A0A0A] px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Logo />

          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active = path === item.to || (item.to === "/" && path.startsWith("/report"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-[#1A1A1A] text-white font-semibold"
                      : "text-[#A1A1A1] hover:bg-[#1A1A1A]/60 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[#FF6500]" : "text-[#A1A1A1]")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/setup"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#FF6500] hover:bg-[#FF6500]/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(255,101,0,0.3)] transition-all cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Start Live Session</span>
          </Link>

          <div className="h-8 w-8 rounded-full border border-[#262626] bg-[#141414] flex items-center justify-center text-xs font-mono font-bold text-[#FF6500] relative">
            AI
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0A]" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="min-w-0 flex-1">{children}</main>

      {/* Interleet Footer */}
      <footer className="border-t border-[#1F1F1F] bg-[#050505] py-6 px-4 md:px-8 text-xs text-[#A1A1A1]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF6500]" />
            <span className="font-semibold text-white">InterLeet AI</span>
            <span>&bull; Intelligent Voice Engineering Mock Interviewer</span>
          </div>
          <p className="text-[11px] text-zinc-600">Adaptive Decision Tree & Rubric Evaluation Engine</p>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({ title, description, actions, badge }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#262626] px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8 md:py-4 bg-[#050505]/50">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl text-white">{title}</h1>
          {badge && (
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider border-[#262626] text-[#A1A1A1]">
              {badge}
            </Badge>
          )}
        </div>
        {description && <p className="mt-0.5 text-xs text-[#A1A1A1]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

