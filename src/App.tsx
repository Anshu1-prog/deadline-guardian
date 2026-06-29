import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import MyTasksView from "./components/MyTasksView";
import CalendarView from "./components/CalendarView";
import AIPlannerView from "./components/AIPlannerView";
import ProgressView from "./components/ProgressView";
import AnalyticsView from "./components/AnalyticsView";
import AIInsightsView from "./components/AIInsightsView";
import SettingsView from "./components/SettingsView";
import FloatingAssistantBot from "./components/FloatingAssistantBot";
import FloatingNotesButton from "./components/FloatingNotesButton";
import FloatingActionHub from "./components/FloatingActionHub";
import { TabType, Task, AIPlan, UserProfile, PriorityLevel } from "./types";
import { 
  loadTasks, 
  saveTasks, 
  loadActivePlan, 
  saveActivePlan, 
  loadAllPlans, 
  saveAllPlans, 
  loadProfile, 
  saveProfile,
  calculateStats
} from "./utils/dataStore";
import { initAuth } from "./utils/workspace";
import { usePomodoro } from "./hooks/usePomodoro";
import { validateDate } from "./utils/dateValidator";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export default function App() {
  // Navigation Routing State
  const [activeTab, setActiveTab] = useState<TabType>("Dashboard");

  // Core Mutable States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activePlan, setActivePlan] = useState<AIPlan | null>(null);
  const [allPlans, setAllPlans] = useState<AIPlan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Google Workspace Authorization state
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);

  // Global Chatbot control state
  const [isBotOpen, setIsBotOpen] = useState(false);

  // Global Quick Add Task states
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskCategory, setQuickTaskCategory] = useState("Coding");
  const [quickTaskPriority, setQuickTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [quickTaskDate, setQuickTaskDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const handleQuickAddTaskGlobal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const validation = validateDate(quickTaskDate);
    if (!validation.isValid) {
      showToast(validation.error || "Invalid date.");
      return;
    }

    const newTask: Task = {
      id: `task-quick-${Date.now()}`,
      title: quickTaskTitle.trim(),
      description: "Quick task added via Command Center FAB.",
      dueDate: quickTaskDate,
      category: quickTaskCategory,
      priority: quickTaskPriority,
      completed: false,
      durationHours: 2.0
    };

    setTasks(prev => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });
    showToast(`Added task: "${newTask.title}"!`);
    setIsAddTaskModalOpen(false);
    setQuickTaskTitle("");
  };

  // Global Toast system
  const [appToast, setAppToast] = useState<string | null>(null);
  const showToast = (message: string) => {
    setAppToast(message);
    const timeoutId = setTimeout(() => setAppToast(null), 3500);
    return () => clearTimeout(timeoutId);
  };

  // Global Pomodoro / Focus Mode state engine
  const {
    isFocusModalOpen,
    setIsFocusModalOpen,
    pomodoroTimeLeft,
    setPomodoroTimeLeft,
    pomodoroDuration,
    setPomodoroDuration,
    isPomodoroActive,
    setIsPomodoroActive,
    pomodoroMode,
    setPomodoroMode
  } = usePomodoro(showToast);

  // 1. Mount loader
  useEffect(() => {
    setTasks(loadTasks());
    setActivePlan(loadActivePlan());
    setAllPlans(loadAllPlans());
    setProfile(loadProfile());

    // Google Workspace Auth synchronization
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Synchronize mutable state modifications to localStorage cache boundaries
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveActivePlan(activePlan);
  }, [activePlan]);

  useEffect(() => {
    saveAllPlans(allPlans);
  }, [allPlans]);

  useEffect(() => {
    if (profile) {
      saveProfile(profile);
    }
  }, [profile]);

  // Loading safety fallback
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#090b1e] flex items-center justify-center text-white font-sans text-xs flex-col gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-cyan-400 animate-spin" />
        <span>Initializing Application State Databases...</span>
      </div>
    );
  }

  // Calculate dynamic aggregated workload statistics
  const currentStats = calculateStats(tasks, activePlan);

  // Router layout
  const renderActiveView = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <DashboardView
            tasks={tasks}
            setTasks={setTasks}
            activePlan={activePlan}
            setActivePlan={setActivePlan}
            allPlans={allPlans}
            setAllPlans={setAllPlans}
            profile={profile}
            setProfile={setProfile}
            setActiveTab={setActiveTab}
            stats={currentStats}
            googleToken={googleToken}
            setGoogleToken={setGoogleToken}
            googleUser={googleUser}
            setGoogleUser={setGoogleUser}
            isBotOpen={isBotOpen}
            setIsBotOpen={setIsBotOpen}
            isFocusModalOpen={isFocusModalOpen}
            setIsFocusModalOpen={setIsFocusModalOpen}
            pomodoroTimeLeft={pomodoroTimeLeft}
            setPomodoroTimeLeft={setPomodoroTimeLeft}
            pomodoroDuration={pomodoroDuration}
            setPomodoroDuration={setPomodoroDuration}
            isPomodoroActive={isPomodoroActive}
            setIsPomodoroActive={setIsPomodoroActive}
            pomodoroMode={pomodoroMode}
            setPomodoroMode={setPomodoroMode}
            showToast={showToast}
          />
        );
      case "My Tasks":
        return (
          <MyTasksView 
            tasks={tasks} 
            setTasks={setTasks} 
            googleToken={googleToken} 
            setGoogleToken={setGoogleToken}
            googleUser={googleUser} 
            setGoogleUser={setGoogleUser}
          />
        );
      case "Calendar":
        return (
          <CalendarView 
            tasks={tasks} 
            setTasks={setTasks} 
          />
        );
      case "AI Planner":
        return (
          <AIPlannerView
            tasks={tasks}
            setTasks={setTasks}
            activePlan={activePlan}
            setActivePlan={setActivePlan}
            allPlans={allPlans}
            setAllPlans={setAllPlans}
            setActiveTab={setActiveTab}
            googleToken={googleToken}
            googleUser={googleUser}
          />
        );
      case "Progress":
        return <ProgressView tasks={tasks} profile={profile} />;
      case "Analytics":
        return <AnalyticsView tasks={tasks} setActiveTab={setActiveTab} />;
      case "AI Insights":
        return (
          <AIInsightsView 
            tasks={tasks}
            setTasks={setTasks}
            profile={profile}
          />
        );
      case "Settings":
        return (
          <SettingsView
            profile={profile}
            setProfile={setProfile}
            setTasks={setTasks}
            setActivePlan={setActivePlan}
            setAllPlans={setAllPlans}
            googleToken={googleToken}
            setGoogleToken={setGoogleToken}
            googleUser={googleUser}
            setGoogleUser={setGoogleUser}
          />
        );
      default:
        return (
          <div className="p-8 text-white">
            <h4 className="text-sm font-bold">Error</h4>
            <p className="text-xs text-gray-400">View not successfully matched.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090b1e]">
      {/* Persistent Left Sidebar layout */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        profile={profile}
        focusScore={currentStats.focusScore} 
      />

      {/* Dynamic Main Workspace View */}
      <main id="main-content" className="flex-1 h-screen overflow-hidden flex flex-col">
        {renderActiveView()}
      </main>

      {/* Floating Personal Notes Panel */}
      <FloatingNotesButton googleToken={googleToken} />

      {/* Modern Unified Floating Action Hub (FAB) */}
      <FloatingActionHub
        onQuickAdd={() => setIsAddTaskModalOpen(true)}
        onAskAI={() => setIsBotOpen(true)}
        onStartVoice={() => window.dispatchEvent(new CustomEvent("assistant-voice-trigger"))}
      />

      {/* Floating Support Companion Bot */}
      <FloatingAssistantBot 
        tasks={tasks} 
        setTasks={setTasks}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePlan={activePlan}
        setActivePlan={setActivePlan}
        allPlans={allPlans}
        setAllPlans={setAllPlans}
        profile={profile}
        setProfile={setProfile}
        isOpen={isBotOpen}
        setIsOpen={setIsBotOpen}
      />

      {/* DYNAMIC POMODORO FOCUS TIMER INTERACTIVE MODAL */}
      <AnimatePresence>
        {isFocusModalOpen && (
          <div className="fixed inset-0 bg-[#090b1e]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#12163b] border-2 border-[#1e244b] p-6.5 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl relative text-center"
            >
              <button 
                onClick={() => {
                  setIsFocusModalOpen(false);
                  setIsPomodoroActive(false);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h4 className="text-white font-display font-bold text-lg">Focus Mode Countdown</h4>
                <p className="text-gray-400 text-xs">Maintain steady concentration on study objectives</p>
              </div>

              {/* Circular visual container/representation of progress */}
              <div className="relative w-40 h-40 mx-auto flex items-center justify-center rounded-full border-4 border-[#1e244b] bg-[#0c0f2a] shadow-inner">
                {/* Ring progress indicators */}
                <div className={`absolute inset-1.5 rounded-full border-2 border-dashed ${isPomodoroActive ? 'border-cyan-400/30 animate-[spin_20s_linear_infinite]' : 'border-transparent'}`} />
                
                <div className="space-y-1 z-10">
                  <span className="block text-4xl font-mono font-bold text-white tracking-wide">
                    {Math.floor(pomodoroTimeLeft / 60)}:{(pomodoroTimeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="block text-[9px] uppercase font-mono font-bold text-cyan-400 tracking-widest">
                    {pomodoroMode === "focus" ? "⚔️ FOCUS UNIT" : "☕ REST BREAK"}
                  </span>
                </div>
              </div>

              {/* Custom controls row */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setIsPomodoroActive(!isPomodoroActive)}
                  className={`px-6 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    isPomodoroActive 
                      ? "bg-rose-500 hover:bg-rose-600 text-white" 
                      : "bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                  }`}
                >
                  {isPomodoroActive ? "Pause Block" : "Begin Focus"}
                </button>
                <button
                  onClick={() => {
                    setIsPomodoroActive(false);
                    setPomodoroTimeLeft(1500);
                    setPomodoroDuration(1500);
                    setPomodoroMode("focus");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Reset Timer
                </button>
              </div>

              {/* Presets selectors */}
              <div className="flex justify-center gap-2 border-t border-[#1e244b]/40 pt-4.5 text-[10px]">
                <button 
                  onClick={() => {
                    setIsPomodoroActive(false);
                    setPomodoroTimeLeft(1500);
                    setPomodoroDuration(1500);
                    setPomodoroMode("focus");
                  }}
                  className="px-2.5 py-1 bg-[#090b1e]/60 hover:bg-[#0c0f2a] border border-[#1e244b] rounded-lg text-gray-400 hover:text-white"
                >
                  25m Focus
                </button>
                <button 
                  onClick={() => {
                    setIsPomodoroActive(false);
                    setPomodoroTimeLeft(300);
                    setPomodoroDuration(300);
                    setPomodoroMode("break");
                  }}
                  className="px-2.5 py-1 bg-[#090b1e]/60 hover:bg-[#0c0f2a] border border-[#1e244b] rounded-lg text-gray-400 hover:text-white"
                >
                  5m Break
                </button>
                <button 
                  onClick={() => {
                    setIsPomodoroActive(false);
                    setPomodoroTimeLeft(900);
                    setPomodoroDuration(900);
                    setPomodoroMode("break");
                  }}
                  className="px-2.5 py-1 bg-[#090b1e]/60 hover:bg-[#0c0f2a] border border-[#1e244b] rounded-lg text-gray-400 hover:text-white"
                >
                  15m Break
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL QUICK ADD TASK INTERACTIVE MODAL */}
      <AnimatePresence>
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 bg-[#090b1e]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#12163b] border-2 border-[#1e244b] p-6.5 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddTaskModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h4 className="text-white font-display font-bold text-lg">Quick Add Task</h4>
                <p className="text-gray-400 text-xs">Directly insert a new academic milestone deadline</p>
              </div>

              <form onSubmit={handleQuickAddTaskGlobal} className="space-y-4 text-xs">
                <div className="space-y-1.5 text-left">
                  <span className="text-gray-400">Task Title</span>
                  <input
                    type="text"
                    required
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    placeholder="e.g. Finish DSA Exam Prep"
                    className="w-full bg-[#090b1e] border border-[#1e244b] focus:border-indigo-500 py-2.5 px-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="space-y-1.5">
                    <span className="text-gray-400">Category</span>
                    <select
                      value={quickTaskCategory}
                      onChange={(e) => setQuickTaskCategory(e.target.value)}
                      className="w-full bg-[#090b1e] border border-[#1e244b] text-white py-2 px-2.5 rounded-xl outline-none"
                    >
                      <option value="Coding">Coding</option>
                      <option value="Homework">Homework</option>
                      <option value="Revision">Revision</option>
                      <option value="Presentation">Presentation</option>
                      <option value="Exam">Exam Prep</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-gray-400">Priority Weight</span>
                    <select
                      value={quickTaskPriority}
                      onChange={(e) => setQuickTaskPriority(e.target.value as PriorityLevel)}
                      className="w-full bg-[#090b1e] border border-[#1e244b] text-white py-2 px-2.5 rounded-xl outline-none"
                    >
                      <option value="High">High (ASAP)</option>
                      <option value="Medium">Medium (Balanced)</option>
                      <option value="Low">Low (Buffer)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <span className="text-gray-400">Target Due Date</span>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={quickTaskDate}
                    onChange={(e) => setQuickTaskDate(e.target.value)}
                    className="w-full bg-[#090b1e] border border-[#1e244b] text-white py-2 px-3 rounded-xl outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-lg"
                >
                  Create Task
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Status Toast feedback */}
      {appToast && (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-slate-900 border-2 border-emerald-500/30 text-white text-xs font-sans font-medium px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-bounce">
          <span className="w-2.5 h-2.5 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </span>
          <span>{appToast}</span>
        </div>
      )}
    </div>
  );
}
