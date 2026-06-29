import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Clock, 
  Tag, 
  AlertTriangle,
  Layers,
  ArrowRight
} from "lucide-react";
import { Task, PriorityLevel } from "../types";
import { validateDate } from "../utils/dateValidator";
import { motion, AnimatePresence } from "motion/react";

interface CalendarViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export default function CalendarView({ tasks, setTasks }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); // Dynamic central date
  const [selectedDayYMD, setSelectedDayYMD] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [calToast, setCalToast] = useState<string | null>(null);

  const showLocalToast = (msg: string) => {
    setCalToast(msg);
    setTimeout(() => setCalToast(null), 3000);
  };

  // Quick Add Form fields
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("Medium");
  const [newCategory, setNewCategory] = useState("Coding");
  const [newHours, setNewHours] = useState(2);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const year = currentDate.getFullYear();
  const monthIdx = currentDate.getMonth();

  // Helper date metrics
  const firstDayOfMonth = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  // Convert month-day to key "YYYY-MM-DD"
  const getDayString = (day: number) => {
    const m = monthIdx + 1;
    return `${year}-${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
  };

  // Click date handler
  // Click date handler
  const handleDayClick = (dayStr: string) => {
    setSelectedDayYMD(dayStr);
    
    // Check if clicked date is in the past
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dayStr);
    target.setHours(0,0,0,0);
    if (target < today) {
      showLocalToast("Selected past date (read-only mode).");
    }
  };

  // Filter tasks due on selected day
  const selectedDayTasks = tasks.filter(t => t.dueDate === selectedDayYMD);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const validation = validateDate(selectedDayYMD);
    if (!validation.isValid) {
      showLocalToast(validation.error || "Cannot schedule tasks on past dates.");
      return;
    }

    const newTask: Task = {
      id: `task-cal-${Date.now()}`,
      title: newTitle,
      description: `Created directly from calendar interface scheduled for ${selectedDayYMD}.`,
      dueDate: selectedDayYMD,
      category: newCategory,
      priority: newPriority,
      completed: false,
      durationHours: Number(newHours) || 2
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTitle("");
    setNewHours(2);
    setShowQuickAdd(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const renderDaysGrid = () => {
    const cells = [];
    
    // Add spacer blanks for preceding days of previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(
        <div 
          key={`blank-${i}`} 
          className="min-h-[90px] border border-[#1e244b]/20 bg-[#090b1e]/20 p-2 opacity-30 select-none"
        />
      );
    }

    // Add days of navigated month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayYMD = getDayString(day);
      const isSelected = selectedDayYMD === dayYMD;
      const today = new Date();
      const isToday = day === today.getDate() && monthIdx === today.getMonth() && year === today.getFullYear();
      const dayTasks = tasks.filter(t => t.dueDate === dayYMD);

      // Distribute tasks dots colors
      const pendingHighTasks = dayTasks.filter(t => !t.completed && t.priority === "High");
      const pendingMediumTasks = dayTasks.filter(t => !t.completed && t.priority === "Medium");
      const pendingLowTasks = dayTasks.filter(t => !t.completed && t.priority === "Low");
      const completedTasks = dayTasks.filter(t => t.completed);

      cells.push(
        <div
          key={`day-cell-${day}`}
          onClick={() => handleDayClick(dayYMD)}
          className={`min-h-[100px] border border-[#1e244b]/50 p-2 text-left relative flex flex-col justify-between transition-all cursor-pointer group ${
            isSelected 
              ? "bg-indigo-950/40 border-indigo-400/80 shadow-[inset_0_0_15px_rgba(79,70,229,0.3)]" 
              : "bg-[#12163b]/30 hover:bg-[#12163b]/60"
          }`}
        >
          {/* Day number header */}
          <div className="flex justify-between items-center select-none">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isToday 
                ? "bg-cyan-500 text-slate-950 font-bold" 
                : isSelected
                  ? "text-cyan-400 font-bold"
                  : "text-gray-300"
            }`}>
              {day}
            </span>
            
            {dayTasks.length > 0 && (
              <span className="text-[9px] text-[#8692d0] font-mono leading-none">
                {dayTasks.filter(t => t.completed).length}/{dayTasks.length}
              </span>
            )}
          </div>

          {/* Micro dots display area for previews (Capped to first 3) */}
          <div className="space-y-1.5 mt-2 flex-grow overflow-hidden select-none">
            {dayTasks.slice(0, 2).map(task => (
              <div 
                key={task.id}
                className={`text-[9px] truncate px-1.5 py-0.5 rounded border leading-none font-medium ${
                  task.completed 
                    ? "bg-cyan-900/10 text-cyan-400 border-cyan-800/10 line-through opacity-60" 
                    : task.priority === "High"
                      ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                      : task.priority === "Medium"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                }`}
              >
                {task.title}
              </div>
            ))}
            {dayTasks.length > 2 && (
              <div className="text-[8px] text-gray-500 pl-1 font-mono">
                +{dayTasks.length - 2} more tasks
              </div>
            )}
          </div>

          {/* Tiny Status Circle Dot group */}
          <div className="flex gap-1 items-center mt-1 shrink-0 h-1.5">
            {pendingHighTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
            {pendingMediumTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            {pendingLowTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            {completedTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
          </div>
        </div>
      );
    }

    return cells;
  };

  const getFormatDateTitle = (dateYMD: string) => {
    try {
      const parts = dateYMD.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
      }
    } catch(e) {}
    return dateYMD;
  };

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-16 overflow-y-auto">
      <header className="mb-6">
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          Calendar View
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Detailed full-month grid calendar view displaying tasks. Click any cell to inspect and add schedules.
        </p>
      </header>

      {/* Grid Layout containing full month + day inspection side-panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Calendar Month View Grid itself */}
        <div className="xl:col-span-3 bg-[#12163b]/70 border border-[#1e244b] p-5 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            {/* Header control buttons */}
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#1e244b]/50">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-white font-display text-lg font-bold">
                  {monthNames[monthIdx]} {year}
                </h3>
                {monthIdx === 5 && year === 2026 && (
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded-full uppercase border border-cyan-400/25">
                    June Staging
                  </span>
                )}
              </div>

              {/* Navigation button toggles */}
              <div className="flex items-center gap-2 bg-[#090b1e] border border-[#1e244b]/60 p-1.5 rounded-xl">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    const year = today.getFullYear();
                    const month = today.getMonth() + 1;
                    const day = today.getDate();
                    setSelectedDayYMD(`${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`);
                  }}
                  className="px-3.5 py-1 text-[11px] font-bold text-gray-400 hover:text-white transition-all hover:bg-white/5 rounded-lg"
                >
                  Reset to Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* S-M-T-W-T-F-S row */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5 border-b border-[#1e244b]/40 pb-2">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <span key={day} className="text-xs font-bold text-gray-400 tracking-wider">
                  {day}
                </span>
              ))}
            </div>

            {/* Number days cells */}
            <div className="grid grid-cols-7 gap-1 bg-[#1e244b]/10 p-0.5 rounded-xl overflow-hidden">
              {renderDaysGrid()}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1e244b]/40 text-[10px] text-gray-500 flex justify-between items-center">
            <span>🔴 High Priority | 🟡 Medium Priority | 🟢 Low Priority | ⚫ Completed</span>
            <span>Click any day cell to load dynamic list.</span>
          </div>
        </div>

        {/* Right Side: Inspection & Quick Task Addition Tray */}
        <div className="space-y-4">
          
          {/* Inspected Day Details board */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-5 rounded-3xl shadow-lg flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex border-b border-[#1e244b]/50 pb-3 mb-4 justify-between items-start">
                <div>
                  <h4 className="text-gray-400 text-[10px] uppercase font-bold tracking-widest leading-none">Schedule For</h4>
                  <p className="text-cyan-400 font-display text-sm font-bold mt-1 max-w-[170px] truncate">
                    {getFormatDateTitle(selectedDayYMD)}
                  </p>
                </div>
                
                {/* Manual Add Trigger */}
                <button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg cursor-pointer transition-colors"
                  title="Quick add task"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Show Calendar quick Add Form */}
              <AnimatePresence>
                {showQuickAdd && (
                  <motion.form
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleQuickAdd}
                    className="p-3 bg-[#090b1e] border border-[#1e244b] rounded-2xl space-y-3 mb-4"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase pl-0.5">Title</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Task title..."
                        className="w-full bg-[#151a4a]/50 text-xs border border-[#1e244b] focus:border-indigo-500 px-2.5 py-2 rounded-lg text-white placeholder-gray-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase pl-0.5">Priority</label>
                        <select
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                          className="w-full bg-[#151a4a]/50 text-xs border border-[#1e244b] px-2 py-1.5 rounded-lg text-white focus:outline-none"
                        >
                          <option className="text-black bg-white" value="High">🔴 High</option>
                          <option className="text-black bg-white" value="Medium">🟡 Medium</option>
                          <option className="text-black bg-white" value="Low">🟢 Low</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase pl-0.5">Hours</label>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={newHours}
                          onChange={(e) => setNewHours(Number(e.target.value))}
                          className="w-full bg-[#151a4a]/50 text-xs border border-[#1e244b] px-2 py-1.5 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickAdd(false)}
                        className="px-2.5 py-1 text-[10px] font-bold text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg border border-white/5"
                      >
                        Create
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Tasks List on this day */}
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {selectedDayTasks.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-xs px-2 select-none flex flex-col items-center">
                    <span className="text-2xl mb-1.5">📭</span>
                    <h5 className="font-semibold text-gray-400">No Tasks Due</h5>
                    <p className="text-[10px] text-gray-600 max-w-[150px] mt-0.5 leading-snug">
                      Click the "+" above to quickly allocate item tasks.
                    </p>
                  </div>
                ) : (
                  selectedDayTasks.map(task => {
                    const priorityDot = {
                      High: "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]",
                      Medium: "bg-amber-400",
                      Low: "bg-emerald-400"
                    };

                    return (
                      <div
                        key={task.id}
                        className="p-3 bg-[#151a4a]/45 rounded-xl border border-[#1e244b]/40 hover:border-[#1e244b] transition-all flex justify-between items-center group gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox trigger */}
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleToggleTask(task.id)}
                            className="w-4 h-4 accent-cyan-500 shrink-0 cursor-pointer"
                          />
                          
                          <div className="min-w-0">
                            <h5 className={`text-xs font-semibold text-white leading-normal truncate ${
                              task.completed ? "line-through text-gray-500" : ""
                            }`}>
                              {task.title}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 select-none">
                              {/* priority identifier dot */}
                              <span className={`w-1.5 h-1.5 rounded-full ${task.completed ? "bg-cyan-400" : priorityDot[task.priority]}`} />
                              <span className="text-[9px] text-[#8692d0] font-mono leading-none font-semibold">
                                {task.category} • {task.durationHours}h
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer shrink-0"
                          title="Wipe Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Total workload recap box */}
            <div className="pt-4 border-t border-[#1e244b]/50 select-none">
              <div className="bg-[#090b1e]/90 p-3.5 rounded-xl border border-[#1e244b]/30">
                <div className="flex justify-between items-center text-[10px] text-gray-400">
                  <span>Workload Count:</span>
                  <span className="font-bold text-white font-mono">{selectedDayTasks.length} items</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5">
                  <span>Total Duration:</span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {selectedDayTasks.reduce((acc, t) => acc + t.durationHours, 0)} hrs
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Toast Notification element */}
      <AnimatePresence>
        {calToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-slate-900/95 border border-indigo-500/45 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 max-w-sm"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <p className="text-xs text-white leading-normal font-medium">{calToast}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
