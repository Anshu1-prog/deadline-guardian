import React from "react";
import { 
  Award, 
  Flame, 
  TrendingUp, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  Cloud
} from "lucide-react";
import { Task, UserProfile } from "../types";
import { motion } from "motion/react";

interface ProgressViewProps {
  tasks: Task[];
  profile: UserProfile;
}

export default function ProgressView({ tasks, profile }: ProgressViewProps) {
  const completedTasks = tasks.filter(t => t.completed);
  const pendingTasks = tasks.filter(t => !t.completed);
  const totalTasks = tasks.length;
  
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks.length / totalTasks) * 100) 
    : 0;

  // Calculate dynamic hour metrics
  const totalHoursInvested = completedTasks.reduce((acc, t) => acc + t.durationHours, 0);
  const pendingHoursLeft = pendingTasks.reduce((acc, t) => acc + t.durationHours, 0);

  // List of Achievements to unlock
  const achievements = [
    {
      id: "ach-1",
      title: "First Step of Thousands",
      description: "Initialize your very first AI Dynamic planner schedule node.",
      unlocked: tasks.some(t => !!t.planId),
      icon: Sparkles,
      color: "from-blue-500 to-indigo-500"
    },
    {
      id: "ach-2",
      title: "Consistent Builder",
      description: "Maintain a task execution streak of 3 days or more.",
      unlocked: profile.streak >= 3,
      icon: Flame,
      color: "from-orange-500 to-rose-500"
    },
    {
      id: "ach-3",
      title: "Ultimate Completionist",
      description: "Reach an overall task completion rate of 50% or above.",
      unlocked: completionRate >= 50,
      icon: Award,
      color: "from-emerald-500 to-cyan-500"
    },
    {
      id: "ach-4",
      title: "Heavylifter Priority",
      description: "Safely execute a High Priority task before its slated deadline.",
      unlocked: completedTasks.some(t => t.priority === "High"),
      icon: Zap,
      color: "from-purple-500 to-fuchsia-500"
    },
    {
      id: "ach-5",
      title: "Workspace Pioneer",
      description: "Successfully sync dynamic schedule milestones with Google Calendar or Gmail.",
      unlocked: tasks.some(t => t.gCalSynced || t.gmailSent),
      icon: Cloud,
      color: "from-cyan-500 to-blue-600"
    },
    {
      id: "ach-6",
      title: "Focused Scholar",
      description: "Maintain high efficiency and achieve a Focus Score of 80% or above.",
      unlocked: completionRate >= 80 && completedTasks.length >= 2,
      icon: TrendingUp,
      color: "from-teal-500 to-emerald-600"
    },
    {
      id: "ach-7",
      title: "Elite Revisionist",
      description: "Check off 5 or more study roadmap tasks in your workspace ledger.",
      unlocked: completedTasks.length >= 5,
      icon: Target,
      color: "from-amber-500 to-orange-600"
    },
    {
      id: "ach-8",
      title: "Pacing Champion",
      description: "Distribute your academic goals across multiple distinct plans.",
      unlocked: new Set(tasks.filter(t => t.planId).map(t => t.planId)).size >= 2,
      icon: Activity,
      color: "from-pink-500 to-rose-600"
    }
  ];

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-16 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          Progress & Milestones
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Monitor completion yields, analyze hourly metrics, and track unlockable motivation achievements.
        </p>
      </header>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Metric 1: Completion */}
        <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-2.5xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[#8692d0] text-[10px] font-bold uppercase tracking-wider block mb-1">Completion Rate</span>
          <div className="flex justify-between items-baseline">
            <h4 className="text-white text-3xl font-display font-semibold">{completionRate}%</h4>
            <span className="text-emerald-400 text-xs font-mono font-medium">Goal: 85%</span>
          </div>
          <p className="text-gray-400 text-[10px] pr-2 font-light mt-1.5 leading-snug">
            {completedTasks.length} of {totalTasks} total tasks completed.
          </p>
          <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Metric 2: Streak */}
        <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-2.5xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[#8692d0] text-[10px] font-bold uppercase tracking-wider block mb-1">Execution Streak</span>
          <div className="flex justify-between items-baseline">
            <h4 className="text-white text-3xl font-display font-semibold flex items-center gap-1.5">
              <span>{profile.streak}</span>
              <span className="text-[14px] text-orange-400 font-sans font-bold">days</span>
            </h4>
            <Flame className="w-5 h-5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-bounce" />
          </div>
          <p className="text-gray-400 text-[10px] pr-2 font-light mt-1.5 leading-snug">
            Complete tasks daily to multiply streak yields.
          </p>
          <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (profile.streak / 10) * 100)}%` }} />
          </div>
        </div>

        {/* Metric 3: Invested value */}
        <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-2.5xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[#8692d0] text-[10px] font-bold uppercase tracking-wider block mb-1">Hours Invested</span>
          <div className="flex justify-between items-baseline">
            <h4 className="text-white text-3xl font-display font-semibold font-mono">{totalHoursInvested}</h4>
            <span className="text-[#8692d0] text-[11px] font-sans">hours</span>
          </div>
          <p className="text-gray-400 text-[10px] pr-2 font-light mt-1.5 leading-snug">
            Cumulative sum of completed track estimation hours.
          </p>
          <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (totalHoursInvested / (totalHoursInvested + pendingHoursLeft || 1)) * 100)}%` }} />
          </div>
        </div>

        {/* Metric 4: Backlog Hours */}
        <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-2.5xl p-5 shadow-lg relative overflow-hidden">
          <span className="text-[#8692d0] text-[10px] font-bold uppercase tracking-wider block mb-1">Pending Workload</span>
          <div className="flex justify-between items-baseline">
            <h4 className="text-rose-400 text-3xl font-display font-semibold font-mono">{pendingHoursLeft}</h4>
            <span className="text-[#8692d0] text-[11px] font-sans">hours left</span>
          </div>
          <p className="text-gray-400 text-[10px] pr-2 font-light mt-1.5 leading-snug">
            Total remaining backlog estimate left to execute.
          </p>
          <div className="h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: "35%" }} />
          </div>
        </div>
      </div>

      {/* Achievements / Milestones Section */}
      <section className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl mb-8">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#1e244b]/50">
          <Award className="w-5.5 h-5.5 text-yellow-400 animate-pulse" />
          <h3 className="text-white font-display text-base font-bold">Badge Milestones Accrued</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div 
                key={ach.id}
                className={`p-4 bg-[#151a4a]/40 border border-[#1e244b]/40 rounded-2xl flex gap-4 items-center relative transition-all ${
                  ach.unlocked 
                    ? "border-emerald-500/20" 
                    : "opacity-45 select-none"
                }`}
              >
                {/* Badge visual */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${ach.unlocked ? ach.color : "from-gray-800 to-gray-700"} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>

                <div className="min-w-0 pr-3">
                  <h4 className="text-white text-xs font-bold font-sans tracking-wide">{ach.title}</h4>
                  <p className="text-gray-400 text-[10px] font-light leading-snug mt-1">{ach.description}</p>
                </div>

                {/* Unlock banner indicator */}
                {ach.unlocked ? (
                  <span className="absolute right-3 top-3 text-[8px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider select-none animate-fade-in">
                    Unlocked
                  </span>
                ) : (
                  <span className="absolute right-3 top-3 text-[8px] font-semibold font-mono bg-gray-500/10 text-gray-500 border border-gray-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider select-none">
                    Locked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Completed History Ledger feed */}
      <section className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl h-fit">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e244b]/50">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h3 className="text-white font-display text-base font-bold">Completed Activity ledger</h3>
        </div>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {completedTasks.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs pl-2 font-light">
              📬 No tasks logged completed in the activity ledger yet. Checkoff pending items to record ledger.
            </div>
          ) : (
            completedTasks.map((task) => (
              <div 
                key={task.id}
                className="p-3.5 bg-[#151a4a]/45 rounded-xl border border-[#1e244b]/30 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  <div>
                    <h5 className="text-white text-xs font-bold leading-normal">{task.title}</h5>
                    <span className="inline-block text-[8px] bg-[#090b1e] text-[#8692d0] rounded font-mono px-1.5 py-0.5 mt-0.5 select-none font-bold">
                      {task.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10px]">
                  <span className="text-emerald-400 flex items-center gap-1 font-mono font-medium">
                    🏆 +{task.durationHours * 10} XP
                  </span>
                  <span className="text-gray-500 font-mono">
                    Done: {task.dueDate}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
