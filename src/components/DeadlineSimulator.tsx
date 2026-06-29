import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  ShieldAlert,
  Sliders,
  Calendar,
  Compass
} from "lucide-react";
import { motion } from "motion/react";

interface DeadlineSimulatorProps {
  defaultGoal?: string;
  defaultDeadline?: string;
}

export default function DeadlineSimulator({ defaultGoal = "", defaultDeadline = "" }: DeadlineSimulatorProps) {
  const [goal, setGoal] = useState(defaultGoal || "Learn Data Structures & Algorithms");
  const [deadline, setDeadline] = useState(defaultDeadline || "2026-06-30");
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Expert">("Hard");

  // Dynamic outputs
  const [chance, setChance] = useState(85); // percentage
  const [finishDate, setFinishDate] = useState("");
  const [risk, setRisk] = useState<"Low" | "Medium" | "High" | "Critical">("Low");
  const [verdict, setVerdict] = useState("Safe");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [totalEstimatedHours, setTotalEstimatedHours] = useState(15);

  // Auto detect difficulty and total hours based on goal text
  useEffect(() => {
    const text = goal.toLowerCase();
    let estHours = 12;
    let diff: "Easy" | "Medium" | "Hard" | "Expert" = "Medium";

    if (text.includes("data structure") || text.includes("algorithm") || text.includes("leetcode") || text.includes("compiler")) {
      estHours = 28;
      diff = "Hard";
    } else if (text.includes("react") || text.includes("full stack") || text.includes("ecommerce") || text.includes("web") || text.includes("app")) {
      estHours = 20;
      diff = "Medium";
    } else if (text.includes("exam") || text.includes("test") || text.includes("quiz") || text.includes("finals")) {
      estHours = 15;
      diff = "Hard";
    } else if (text.includes("machine learning") || text.includes("ai") || text.includes("neural") || text.includes("deep learning")) {
      estHours = 35;
      diff = "Expert";
    } else if (text.includes("simple") || text.includes("basic") || text.includes("read") || text.includes("intro")) {
      estHours = 6;
      diff = "Easy";
    }

    setDifficulty(diff);
    setTotalEstimatedHours(estHours);
  }, [goal]);

  // Recalculate simulation parameters in real-time
  useEffect(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(deadline);
    targetDate.setHours(0,0,0,0);

    let daysAvailable = 7;
    if (!isNaN(targetDate.getTime())) {
      const diffTime = targetDate.getTime() - today.getTime();
      daysAvailable = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Days required = Total hours / hours per day
    const daysRequired = Math.ceil(totalEstimatedHours / hoursPerDay);
    const bufferDays = daysAvailable - daysRequired;

    // Calculation logic for estimated finish date
    const finish = new Date(today);
    finish.setDate(today.getDate() + daysRequired);
    setFinishDate(finish.toISOString().split("T")[0]);

    // Completion Probability and Verdict Mapping
    let prob = 50;
    let finalVerdict = "Very Tight";
    let riskLevel: "Low" | "Medium" | "High" | "Critical" = "Medium";
    let tips: string[] = [];

    if (hoursPerDay <= 1) {
      prob = Math.max(10, Math.min(30, Math.round((daysAvailable / daysRequired) * 40)));
      finalVerdict = "Won't Finish";
      riskLevel = "Critical";
      tips = [
        "⚠️ Extreme Danger: 1 hour per day is highly insufficient for a goal of this magnitude.",
        "💡 Action: Increase daily commitment to at least 3 hours, or request an extension on the deadline.",
        "💤 Health Note: Compressing work into late nights will cause massive cognitive decay and focus score decline.",
        "🔄 AI Planner tip: Try a condensed 'Fast Track' Beginner plan to strip non-essential concepts."
      ];
    } else if (hoursPerDay === 2) {
      prob = Math.max(35, Math.min(65, Math.round((daysAvailable / daysRequired) * 80)));
      finalVerdict = "Very Tight";
      riskLevel = "High";
      tips = [
        "⚡ Warning: Your schedule leaves virtually zero buffer days for unexpected delays or breaks.",
        "💡 Action: Try to commit 3 hours on weekends to create a safe breathing window.",
        "🎯 Focus Plan: Turn on 'Focus Mode' for all study sessions to increase learning efficiency by 25%.",
        "📅 Google Sync: Push study events immediately to your Calendar to hold yourself accountable."
      ];
    } else if (hoursPerDay === 3) {
      prob = Math.max(70, Math.min(90, Math.round((daysAvailable / daysRequired) * 90)));
      finalVerdict = "Safe";
      riskLevel = "Low";
      tips = [
        "✅ Solid Plan: 3 hours per day is the optimal SaaS study rhythm. You have a balanced buffer.",
        "🌸 Recommendation: Schedule a 10-minute break after every 50 minutes of work.",
        "📊 Progress: Track your streak daily inside the Progress tab to unlock level badges.",
        "💡 Tip: Maintain a consistent start hour (e.g., 09:00 AM) to establish muscular study habits."
      ];
    } else {
      // 4+ hours per day
      prob = Math.min(99, Math.round(95 + (hoursPerDay - 4) * 1.5));
      finalVerdict = "Finish Early";
      riskLevel = "Low";
      if (bufferDays < 0) {
        prob = 80;
        finalVerdict = "Very Intense";
        riskLevel = "Medium";
        tips = [
          "🔥 High Burnout Risk: Your daily hours are high but the deadline is still extremely close.",
          "💡 Action: Ensure you take longer recovery breaks to prevent mental blockages.",
          "🔄 Suggestion: Ask our AI Planner to generate an optimized schedule with built-in buffer days."
        ];
      } else {
        tips = [
          "🎉 Ideal Pace: You are on track to complete all milestones with comfortable extra buffer days.",
          "💡 Strategy: Use the early finish days for comprehensive revision or simulated mock testing.",
          "🌿 Energy Balance: Since your commitment is high, keep a friendly Advisor tone to reduce study stress."
        ];
      }
    }

    setChance(prob);
    setVerdict(finalVerdict);
    setRisk(riskLevel);
    setSuggestions(tips);

  }, [goal, deadline, hoursPerDay, totalEstimatedHours]);

  return (
    <div id="deadline-simulator-card" className="space-y-6 font-sans">
      
      {/* Upper Meta details layout */}
      <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e244b]/40">
          <Sliders className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-display text-base font-bold">Interactive Deadline Simulator</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Simulation Target Goal</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Master algorithms, build project, etc."
                className="w-full bg-[#090b1e]/80 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Target Deadline</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-white outline-none transition-all cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Complexity Class</label>
                <div className="w-full bg-[#090b1e]/60 border border-[#1e244b]/60 rounded-xl py-2.5 px-3 text-xs text-indigo-300 font-bold font-mono">
                  {difficulty} ({totalEstimatedHours}h Node)
                </div>
              </div>
            </div>

            {/* Slider for Hours Per Day */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-gray-400 uppercase tracking-widest pl-1">Hours Committed Per Day</label>
                <span className="text-cyan-400 font-bold font-mono text-sm bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">{hoursPerDay} hours/day</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#090b1e] rounded-lg border border-white/5"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono px-1">
                <span>1h (Won't Finish)</span>
                <span>2h (Tight)</span>
                <span>3h (Safe)</span>
                <span>4h+ (Early)</span>
              </div>
            </div>
          </div>

          {/* Graphical Output / Dial Gauges */}
          <div className="bg-[#090b1e]/50 border border-[#1e244b]/40 rounded-2.5xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            
            {/* Success Probability ring */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-3">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  className="stroke-[#1e244b]"
                  strokeWidth="10"
                  fill="transparent"
                />
                <motion.circle
                  cx="72"
                  cy="72"
                  r="60"
                  className={`${
                    chance < 40 
                      ? "stroke-rose-500" 
                      : chance < 70 
                        ? "stroke-amber-400" 
                        : "stroke-emerald-400"
                  }`}
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={376.8}
                  initial={{ strokeDashoffset: 376.8 }}
                  animate={{ strokeDashoffset: 376.8 - (376.8 * chance) / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white leading-none font-display">
                  {chance}%
                </span>
                <span className="text-[9px] text-[#8692d0] uppercase tracking-wider font-semibold mt-1">
                  PROBABILITY
                </span>
              </div>
            </div>

            {/* Verdict details */}
            <div className="space-y-1 select-none z-10">
              <div className="flex items-center gap-1.5 justify-center">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  risk === "Critical" 
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" 
                    : risk === "High" 
                      ? "bg-amber-500" 
                      : "bg-emerald-400"
                }`} />
                <h4 className="text-white text-sm font-bold font-display uppercase tracking-wider">{verdict}</h4>
              </div>
              <p className="text-[10px] text-gray-400">
                Estimated finish: <strong className="text-cyan-400 font-mono">{finishDate}</strong>
              </p>
            </div>

            {/* Ambient glows */}
            <div className={`absolute -right-10 -bottom-10 w-24 h-24 rounded-full blur-2xl opacity-10 transition-colors ${
              chance < 40 ? "bg-rose-500" : chance < 70 ? "bg-amber-400" : "bg-cyan-500"
            }`} />
          </div>
        </div>

        {/* Diagnostic AI Suggestions Panel */}
        <div className="mt-5 pt-5 border-t border-[#1e244b]/40 space-y-3">
          <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest pl-0.5 flex items-center gap-1.5 select-none">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            Guardian Co-Pilot Diagnostics & Suggestions
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((tip, index) => (
              <div 
                key={index} 
                className="p-3 bg-[#090b1e]/40 border border-[#1e244b]/40 rounded-xl text-[11px] text-gray-300 font-light leading-relaxed flex gap-2"
              >
                <div className="pt-0.5 select-none">⚡</div>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
