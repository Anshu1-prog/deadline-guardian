import React from "react";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Sparkles, 
  TrendingUp, 
  BarChart2, 
  Settings as SettingsIcon,
  Shield,
  Rocket,
  Brain
} from "lucide-react";
import { TabType, UserProfile } from "../types";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  profile: UserProfile;
  focusScore: number;
}

export default function Sidebar({ activeTab, setActiveTab, profile, focusScore }: SidebarProps) {
  const menuItems = [
    { type: "Dashboard" as TabType, label: "Dashboard", icon: LayoutDashboard },
    { type: "My Tasks" as TabType, label: "My Tasks", icon: CheckSquare },
    { type: "Calendar" as TabType, label: "Calendar", icon: CalendarIcon },
    { type: "AI Planner" as TabType, label: "AI Planner", icon: Sparkles },
    { type: "AI Insights" as TabType, label: "AI Insights", icon: Brain },
    { type: "Progress" as TabType, label: "Progress", icon: TrendingUp },
    { type: "Analytics" as TabType, label: "Analytics", icon: BarChart2 },
    { type: "Settings" as TabType, label: "Settings", icon: SettingsIcon },
  ];

  return (
    <aside id="sidebar-panel" className="w-64 bg-[#090b1e]/90 border-r border-[#1e244b] p-4 xl:p-5 flex flex-col justify-between h-screen sticky top-0 shrink-0 z-10 font-sans overflow-y-auto">
      {/* Upper Logo / Header Section */}
      <div>
        <div 
          onClick={() => setActiveTab("Dashboard")}
          className="flex items-center gap-3 mb-5 xl:mb-8 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)] group-hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] transition-all">
            <Shield className="w-6 h-6 text-white stroke-[2]" />
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-lg leading-tight tracking-tight">
              Deadline
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-semibold text-sm">
                Guardian AI
              </span>
            </h1>
          </div>
        </div>

        {/* Menu Navigation Items */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.type;
            return (
              <button
                key={item.type}
                id={`nav-${item.type.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setActiveTab(item.type)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all relative ${
                  isActive 
                    ? "text-white bg-gradient-to-r from-indigo-700/80 to-purple-700/80 shadow-[0_4px_12px_rgba(79,70,229,0.25)] border-l-4 border-cyan-400" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-cyan-400" : "text-gray-400 group-hover:text-white"}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Display Banners - Rocket Progress and Focus Score */}
      <div className="space-y-3 xl:space-y-4 pt-3 xl:pt-4 border-t border-[#1e244b]/50">
        {/* Rocket Panel (Exact replica graphic from screenshort) */}
        <div className="bg-gradient-to-b from-[#12163b] to-[#151a4a]/60 border border-blue-500/20 rounded-2xl p-4 relative overflow-hidden group shadow-lg">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
          <h4 className="text-white font-sans font-semibold text-xs leading-tight mb-1">
            Stay <span className="text-blue-400">consistent</span>,<br />Stay <span className="text-purple-400 font-bold">unstoppable</span>.
          </h4>
          <p className="text-gray-400 text-[10px] pb-3 font-light leading-snug">
            One plan. One deadline.<br />Zero regrets.
          </p>
          
          {/* Custom Rocket Graphics layout */}
          <div className="relative pt-2">
            <div className="flex items-center justify-between text-[9px] text-[#8692d0] mb-1">
              <span>Goal</span>
              <span>100%</span>
            </div>
            <div className="relative h-1.5 bg-[#090b1e] rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(10, focusScore))}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            
            {/* Rocket animation overlaying the progress */}
            <motion.div 
              style={{ left: `${Math.min(90, Math.max(5, focusScore - 5))}%` }}
              className="absolute -top-3 cursor-pointer"
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Rocket className="w-4.5 h-4.5 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.6)] transform rotate-45" />
            </motion.div>
          </div>
          
          {/* Flame ambient glow */}
          <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-orange-500/40 animate-ping blur-[1px]" />
        </div>

        {/* Focus Score Panel */}
        <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-2.5xl p-4 flex flex-col shadow-inner relative">
          <span className="text-[#8692d0] text-[10px] font-semibold tracking-wider uppercase mb-1">
            Focus Score
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-display text-white">
              {focusScore}%
            </span>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
              <span className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              </span>
              <span>+12%</span>
            </div>
          </div>
          <span className="text-[#8692d0] text-[10px] font-light mt-0.5">
            from yesterday
          </span>
          
          {/* Aesthetic Rising Line Chart Indicator */}
          <div className="w-full h-8 mt-2 opacity-80 flex items-end">
            <svg viewBox="0 0 100 30" className="w-full h-full text-emerald-400 filter drop-shadow-[0_2px_4px_rgba(52,211,153,0.3)]">
              <path
                d="M 0,25 Q 15,22 30,18 T 60,11 T 90,4 L 100,2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 0,25 Q 15,22 30,18 T 60,11 T 90,4 L 100,2 L 100,30 L 0,30 Z"
                fill="url(#focus-gradient)"
                opacity="0.12"
              />
              <defs>
                <linearGradient id="focus-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(52, 211, 153)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
