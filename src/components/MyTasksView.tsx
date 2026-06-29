import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Filter, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  ArrowUpDown,
  CalendarDays,
  Mail,
  Zap,
  ListTodo,
  Paperclip,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  Settings,
  Flame,
  UserCheck
} from "lucide-react";
import { Task, PriorityLevel, SubTask, TaskRecurring, TaskAttachment } from "../types";
import { detectCategory, breakdownTaskIfLong, isOverdue } from "../utils/dataStore";
import { validateDate } from "../utils/dateValidator";
import { motion, AnimatePresence } from "motion/react";
import { createCalendarEvent, sendGmailReminder, googleSignIn } from "../utils/workspace";

interface MyTasksViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  googleToken: string | null;
  setGoogleToken: React.Dispatch<React.SetStateAction<string | null>>;
  googleUser: any | null;
  setGoogleUser: React.Dispatch<React.SetStateAction<any | null>>;
}

export default function MyTasksView({
  tasks,
  setTasks,
  googleToken,
  setGoogleToken,
  googleUser,
  setGoogleUser
}: MyTasksViewProps) {
  // Input Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("2026-06-30");
  const [category, setCategory] = useState("Coding");
  const [priority, setPriority] = useState<PriorityLevel>("Medium");
  const [durationHours, setDurationHours] = useState(2);

  // New states for Advanced Task Engine features
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTagText, setNewTagText] = useState("");
  const [simulationFile, setSimulationFile] = useState("System_Blueprint.pdf");

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (dueDate < todayStr) {
      setDueDate(todayStr);
    }
  }, [dueDate]);

  // Google Workspace execution progress states
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [mailingTaskId, setMailingTaskId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingGoogleAction, setPendingGoogleAction] = useState<{ type: "calendar" | "gmail"; task: Task } | null>(null);
  const [tasksToast, setTasksToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setTasksToast(message);
    setTimeout(() => setTasksToast(null), 3500);
  };

  const handleSyncCalendar = async (task: Task) => {
    if (!googleToken) {
      setPendingGoogleAction({ type: "calendar", task });
      setShowConnectModal(true);
      return;
    }
    setSyncingTaskId(task.id);
    try {
      await createCalendarEvent(googleToken, task.title, task.description, task.dueDate);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, gCalSynced: true } : t));
      showToast(`Successfully scheduled "${task.title}" on Google Calendar!`);
    } catch (err: any) {
      showToast(`Calendar Sync failed: ${err?.message || err}`);
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleSendGmail = async (task: Task) => {
    if (!googleToken) {
      setPendingGoogleAction({ type: "gmail", task });
      setShowConnectModal(true);
      return;
    }
    setMailingTaskId(task.id);
    try {
      const recipient = googleUser?.email || "me";
      const subject = `⏰ Deadline Guardian Reminder: "${task.title}"`;
      const htmlBody = `
        <div style="font-family: 'Inter', -apple-system, sans-serif; background-color: #090b1e; color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #1e244b; max-width: 520px; margin: auto;">
          <h2 style="color: #6366f1; margin-top: 0; font-family: 'Space Grotesk', sans-serif;">Deadline Guardian Notification</h2>
          <p style="color: #94a3b8; font-size: 13px;">You requested a detailed review trigger for the milestone:</p>
          <div style="background-color: #12163b; padding: 16px; border-radius: 12px; border: 1px solid #1e244b; margin: 16px 0;">
            <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 15px;">${task.title}</h3>
            <p style="color: #cbd5e1; margin: 0 0 12px 0; font-size: 12px;">${task.description || "No description provided."}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #94a3b8;">
              <tr>
                <td style="padding: 4px 0;"><strong>Category:</strong> ${task.category}</td>
                <td style="padding: 4px 0;"><strong>Priority:</strong> ${task.priority}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Deadline:</strong> ${task.dueDate}</td>
                <td style="padding: 4px 0;"><strong>Work Weight:</strong> ${task.durationHours} hours</td>
              </tr>
            </table>
          </div>
          <p style="margin: 20px 0 0 0; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e244b; padding-top: 12px; font-family: sans-serif;">
            Automatically dispatched via Deadline Guardian secure integration layers. Protect your milestones.
          </p>
        </div>
      `;

      await sendGmailReminder(googleToken, recipient, subject, htmlBody);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, gmailSent: true } : t));
      showToast(`Detailed strategy logs dispatched to your Gmail! ✉️`);
    } catch (err: any) {
      showToast(`Gmail reminder failed: ${err?.message || err}`);
    } finally {
      setMailingTaskId(null);
    }
  };

  const handleConnectAndExecute = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast(`Google connected successfully!`);
        setShowConnectModal(false);
        
        if (pendingGoogleAction) {
          const { type, task } = pendingGoogleAction;
          setPendingGoogleAction(null);
          if (type === "calendar") {
            setSyncingTaskId(task.id);
            await createCalendarEvent(result.accessToken, task.title, task.description, task.dueDate);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, gCalSynced: true } : t));
            showToast(`Scheduled "${task.title}" on Google Calendar!`);
          } else {
            setMailingTaskId(task.id);
            const recipient = result.user.email || "me";
            const body = `
              <div style="font-family: sans-serif; background-color: #090b1e; color: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #1e244b; max-width: 520px; margin: auto;">
                <h3 style="color: #6366f1;">Deadline Reminder</h3>
                <p><strong>Task:</strong> ${task.title}</p>
                <p><strong>Due:</strong> ${task.dueDate}</p>
              </div>
            `;
            await sendGmailReminder(result.accessToken, recipient, `⏰ Reminder: ${task.title}`, body);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, gmailSent: true } : t));
            showToast(`Gmail reminder successfully sent!`);
          }
        }
      }
    } catch (e: any) {
      showToast(`OAuth failure: ${e?.message || e}`);
    } finally {
      setSyncingTaskId(null);
      setMailingTaskId(null);
    }
  };

  // Search, Filter, Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Completed">("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | PriorityLevel>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title">("dueDate");

  const categories = ["Coding", "Project", "Academics", "Design", "Review", "Personal", "Other"];

  // Handle addition of new custom manual task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validation = validateDate(dueDate);
    if (!validation.isValid) {
      showToast(validation.error || "Invalid date.");
      return;
    }

    const newTaskTemplate: Omit<Task, "id"> = {
      title,
      description,
      dueDate,
      category,
      priority,
      completed: false,
      durationHours: Number(durationHours) || 1,
      subtasks: [],
      tags: [],
      attachments: [],
      notes: "",
      progress: 0,
      recurring: { frequency: "none", startDate: dueDate }
    };

    const addedTasks = breakdownTaskIfLong(newTaskTemplate);
    setTasks(prev => [...addedTasks, ...prev]);
    
    if (addedTasks.length > 1) {
      showToast(`⚡ Split long task (${Number(durationHours)} hrs) into ${addedTasks.length} daily milestones!`);
    } else {
      showToast(`Task created successfully!`);
    }
    
    // Clear Form fields
    setTitle("");
    setDescription("");
    setDueDate("2026-06-30");
    setCategory("Coding");
    setPriority("Medium");
    setDurationHours(2);
    setShowAddForm(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return { 
          ...t, 
          completed: nextCompleted,
          progress: nextCompleted ? 100 : t.progress
        };
      }
      return t;
    }));
  };

  // Advanced Tasks Operations
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = (t.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
        const completedCount = updated.filter(st => st.completed).length;
        const nextProgress = updated.length > 0 ? Math.round((completedCount / updated.length) * 100) : t.progress;
        return { 
          ...t, 
          subtasks: updated, 
          progress: nextProgress,
          completed: nextProgress === 100 ? true : t.completed
        };
      }
      return t;
    }));
  };

  const handleAddSubtask = (taskId: string) => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newSubtaskTitle.trim(),
      completed: false
    };
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = [...(t.subtasks || []), newSub];
        const completedCount = updated.filter(st => st.completed).length;
        const nextProgress = Math.round((completedCount / updated.length) * 100);
        return { ...t, subtasks: updated, progress: nextProgress };
      }
      return t;
    }));
    setNewSubtaskTitle("");
    showToast("Subtask added successfully!");
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = (t.subtasks || []).filter(st => st.id !== subtaskId);
        const completedCount = updated.filter(st => st.completed).length;
        const nextProgress = updated.length > 0 ? Math.round((completedCount / updated.length) * 100) : 0;
        return { ...t, subtasks: updated, progress: nextProgress };
      }
      return t;
    }));
    showToast("Subtask removed!");
  };

  const handleUpdateNotes = (taskId: string, notes: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, notes } : t));
  };

  const handleUpdateProgress = (taskId: string, progress: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress, completed: progress === 100 } : t));
  };

  const handleUpdateRecurring = (taskId: string, frequency: "none" | "daily" | "weekly" | "monthly") => {
    setTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      recurring: { frequency, startDate: t.dueDate } 
    } : t));
    showToast(`Recurring frequency set to ${frequency}!`);
  };

  const handleToggleDependency = (taskId: string, depId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentDeps = t.dependencies || [];
        const updatedDeps = currentDeps.includes(depId)
          ? currentDeps.filter(id => id !== depId)
          : [...currentDeps, depId];
        return { ...t, dependencies: updatedDeps };
      }
      return t;
    }));
  };

  const handleAddTag = (taskId: string) => {
    if (!newTagText.trim()) return;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentTags = t.tags || [];
        if (currentTags.includes(newTagText.trim())) return t;
        return { ...t, tags: [...currentTags, newTagText.trim()] };
      }
      return t;
    }));
    setNewTagText("");
    showToast("Tag added!");
  };

  const handleRemoveTag = (taskId: string, tag: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, tags: (t.tags || []).filter(tg => tg !== tag) } : t));
    showToast("Tag removed!");
  };

  const handleSimulateAttachment = (taskId: string) => {
    if (!simulationFile) return;
    const size = `${(1.2 + Math.random() * 4).toFixed(1)} MB`;
    const newAttach: TaskAttachment = {
      name: simulationFile,
      size,
      type: simulationFile.split(".").pop() || "pdf"
    };
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, attachments: [...(t.attachments || []), newAttach] };
      }
      return t;
    }));
    showToast(`Mock attachment "${simulationFile}" uploaded!`);
  };

  // Bulk Actions
  const handleBulkToggle = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAll = (filteredList: Task[]) => {
    const filteredIds = filteredList.map(t => t.id);
    const allSelected = filteredIds.every(id => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => {
        const unique = new Set([...prev, ...filteredIds]);
        return Array.from(unique);
      });
    }
  };

  // Filter Tasks list based on state parameters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || 
                          (statusFilter === "Pending" && !task.completed) || 
                          (statusFilter === "Completed" && task.completed);
    
    const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;
    
    const matchesCategory = categoryFilter === "All" || task.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Sort Tasks list
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    } else if (sortBy === "priority") {
      const priorityWeights = { High: 3, Medium: 2, Low: 1 };
      return priorityWeights[b.priority] - priorityWeights[a.priority];
    }
    return 0;
  });

  // Format Helper for dates
  const formatDateString = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) {}
    return dateStr;
  };

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-24 overflow-y-auto relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 select-none">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            My Tasks
          </h2>
          <p className="text-gray-400 text-sm mt-1 font-light">
            Review detailed deadlines, log work durations, set dependencies, and track subtask checklists.
          </p>
        </div>

        {/* Trigger manually slide in task creator */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-[0_4px_15px_rgba(79,70,229,0.3)] hover:scale-[1.02] cursor-pointer transition-all shrink-0 border border-white/5"
        >
          <Plus className="w-4 h-4 text-cyan-300 shrink-0" />
          <span>Add Custom Task</span>
        </button>
      </header>

      {/* Slide-Down Expandable Add-Task Form Panel */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-6"
          >
            <form 
              onSubmit={handleAddTask}
              className="bg-[#12163b] border border-[#1e244b] rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitle(val);
                    const autoCat = detectCategory(val, description);
                    if (autoCat !== "Other") {
                      setCategory(autoCat);
                    }
                  }}
                  placeholder="e.g. Implement Binary Search algorithm"
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-3 px-4 focus:border-indigo-500 text-white placeholder-gray-500 text-sm outline-none transition-all shadow-inner"
                />
              </div>

              <div className="md:col-span-1.5 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-3 px-4 focus:border-indigo-500 text-white text-sm outline-none cursor-pointer"
                >
                  {categories.map(cat => <option className="text-black bg-white" key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="md:col-span-1.5 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-3 px-4 focus:border-indigo-500 text-white text-sm outline-none cursor-pointer"
                >
                  <option className="text-black bg-white" value="High">🔴 High</option>
                  <option className="text-black bg-white" value="Medium">🟡 Medium</option>
                  <option className="text-black bg-white" value="Low">🟢 Low</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Detailed Description</label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDescription(val);
                    const autoCat = detectCategory(title, val);
                    if (autoCat !== "Other") {
                      setCategory(autoCat);
                    }
                  }}
                  placeholder="Details of code lab or literature milestones..."
                  rows={3}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-3 px-4 focus:border-indigo-500 text-white placeholder-gray-500 text-sm outline-none transition-all shadow-inner resize-none"
                />
              </div>

              <div className="md:col-span-1.5 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Duration Hours</label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={durationHours}
                  onChange={(e) => setDurationHours(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-3 px-4 focus:border-indigo-500 text-white text-sm outline-none"
                />
              </div>

              <div className="md:col-span-1.5 space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Target Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-3 px-3.5 focus:border-indigo-500 text-white text-sm outline-none cursor-pointer"
                />
              </div>

              <div className="md:col-span-6 flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Create Milestone Task
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER CONTROLS BANNER */}
      <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-3xl p-6 shadow-xl mb-6 space-y-4">
        
        {/* Row 1: Search & Filter Tabs */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title or description..."
              className="w-full bg-[#090b1e] border border-[#1e244b] focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          </div>

          {/* Status Tabs */}
          <div className="flex bg-[#090b1e] p-1 rounded-xl border border-[#1e244b] w-fit items-center gap-1.5 select-none">
            <button
              onClick={() => handleSelectAll(sortedTasks)}
              className="px-3 py-1 text-[10px] bg-[#1e244b]/60 hover:bg-[#1e244b] border border-white/5 text-gray-300 font-bold rounded-lg cursor-pointer"
              title="Select / Deselect all visible tasks for bulk operations"
            >
              Select All
            </button>
            <div className="h-4 w-[1px] bg-[#1e244b]" />
            {(["All", "Pending", "Completed"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === tab 
                    ? "bg-indigo-600/80 text-white shadow-md" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
                {tab === "Pending" && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[9px] rounded-full font-bold font-mono">
                    {tasks.filter(t => !t.completed).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1e244b]/35">
          {/* Priority filter */}
          <div className="flex items-center gap-2 bg-[#090b1e] border border-[#1e244b]/50 px-3 py-2 rounded-xl text-xs text-gray-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-gray-500 select-none">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-transparent border-none text-white focus:outline-none flex-1 cursor-pointer font-medium"
            >
              <option className="text-black bg-white" value="All">All Levels</option>
              <option className="text-black bg-white" value="High">High Only</option>
              <option className="text-black bg-white" value="Medium">Medium Only</option>
              <option className="text-black bg-white" value="Low">Low Only</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 bg-[#090b1e] border border-[#1e244b]/50 px-3 py-2 rounded-xl text-xs text-gray-300">
            <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-gray-500 select-none">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none flex-1 cursor-pointer font-medium"
            >
              <option className="text-black bg-white" value="All">All Categories</option>
              {categories.map(cat => <option className="text-black bg-white" key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2 bg-[#090b1e] border border-[#1e244b]/50 px-3 py-2 rounded-xl text-xs text-gray-300 sm:col-span-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-gray-500 select-none">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-white focus:outline-none flex-1 cursor-pointer font-medium"
            >
              <option className="text-black bg-white" value="dueDate">Chronological due date</option>
              <option className="text-black bg-white" value="priority">Priority weight levels</option>
              <option className="text-black bg-white" value="title">Alphabetical task title</option>
            </select>
          </div>
        </div>

      </div>

      {/* CORE TASKS COUNT FEED */}
      <div className="space-y-3.5 pb-20">
        {sortedTasks.length === 0 ? (
          <div className="bg-[#12163b]/40 border border-[#1e244b]/40 rounded-3xl py-16 text-center px-4 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[#151a4a] flex items-center justify-center text-gray-500 mb-3 border border-[#1e244b]/30 shadow-md">
              <CheckCircle className="w-7 h-7 opacity-75" />
            </div>
            <h4 className="text-gray-300 font-semibold text-base">No Matching Tasks Found</h4>
            <p className="text-gray-500 text-xs font-light max-w-sm mt-1 leading-snug">
              Modify search queries or category toggles. Click "Add Custom Task" to insert a new manual tracker right away.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedTasks.map(task => {
              const priorityColor = {
                High: "border-l-4 border-l-rose-500 bg-rose-500/10 text-rose-400 text-xs font-display font-medium border border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)] px-2.5 py-0.5 rounded-lg",
                Medium: "border-l-4 border-l-amber-500 bg-amber-500/10 text-amber-400 text-xs font-display font-medium border border-amber-500/20 px-2.5 py-0.5 rounded-lg",
                Low: "border-l-4 border-l-emerald-500 bg-emerald-500/10 text-emerald-400 text-xs font-display font-medium border border-emerald-500/20 px-2.5 py-0.5 rounded-lg",
              };

              const isExpanded = expandedTaskId === task.id;
              
              // Verify if dependencies are satisfied
              const unmetDeps = (task.dependencies || []).map(depId => tasks.find(t => t.id === depId)).filter(t => t && !t.completed);

              return (
                <div
                  key={task.id}
                  id={`task-item-${task.id}`}
                  className={`bg-[#12163b]/70 border ${isExpanded ? "border-indigo-500" : "border-[#1e244b]/80"} hover:border-indigo-500/50 rounded-2.5xl p-5 shadow-lg flex flex-col justify-between transition-all group relative overflow-hidden ${
                    task.completed ? "opacity-75" : ""
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Bulk Checkbox + Complete Checkbox + Title + Toggle Expansion + Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Bulk Multi-select Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={() => handleBulkToggle(task.id)}
                          className="w-4 h-4 rounded border-[#1e244b] bg-[#090b1e] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 shrink-0 mt-1 cursor-pointer"
                          title="Select task for bulk edits"
                        />

                        {/* Status Checkbox Button */}
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all mt-0.5 ${
                            task.completed 
                              ? "bg-cyan-500 border-cyan-500 text-slate-950" 
                              : "border-gray-500 hover:border-cyan-400 hover:bg-cyan-400/5"
                          }`}
                        >
                          {task.completed && <CheckCircle2 className="w-4 h-4 text-slate-900 stroke-[3]" />}
                        </button>
                        
                        <div 
                          className="min-w-0 cursor-pointer flex-1"
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        >
                          <h4 className={`text-white font-semibold text-sm leading-snug transition-colors group-hover:text-cyan-400 ${
                            task.completed ? "line-through text-gray-500 group-hover:text-cyan-600" : ""
                          }`}>
                            {task.title}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                            <span className="inline-block text-[9px] bg-slate-900/60 text-[#8692d0] font-mono px-2 py-0.5 rounded-md font-bold border border-white/5">
                              {task.category}
                            </span>
                            {task.recurring && task.recurring.frequency !== "none" && (
                              <span className="text-[9px] bg-purple-950/40 text-purple-300 px-1.5 py-0.5 rounded-md font-mono border border-purple-500/20">
                                🔁 {task.recurring.frequency}
                              </span>
                            )}
                            {task.dependencies && task.dependencies.length > 0 && (
                              <span className="text-[9px] bg-amber-950/40 text-amber-300 px-1.5 py-0.5 rounded-md font-mono border border-amber-500/20">
                                🔗 Prereqs ({task.dependencies.length})
                              </span>
                            )}
                            {(task.tags || []).map(tg => (
                              <span key={tg} className="text-[9px] bg-blue-950/20 text-cyan-400 px-1.5 py-0.5 rounded-md border border-cyan-500/10 font-mono">
                                #{tg}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Header controls (Expand, Delete) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                          title="Toggle Advanced Checklist & Details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Unmet Dependencies warning banner */}
                    {unmetDeps.length > 0 && (
                      <div className="bg-amber-950/25 border border-amber-500/20 rounded-xl p-2.5 text-[10px] text-amber-300 flex items-start gap-2 select-none">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Prerequisites Pending:</span>
                          <p className="font-light mt-0.5">Please resolve task: "{unmetDeps[0]?.title}" first!</p>
                        </div>
                      </div>
                    )}

                    {/* Task detailed description */}
                    <p className={`text-xs leading-relaxed font-light ${
                      task.completed ? "text-gray-600" : "text-gray-400"
                    }`}>
                      {task.description || "No description provided."}
                    </p>

                    {/* Task Progress Bar indicator */}
                    {(task.progress !== undefined || task.subtasks?.length) ? (
                      <div className="space-y-1 select-none">
                        <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                          <span>Progress Score</span>
                          <span>{task.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-[#090b1e] rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 transition-all duration-300" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                      </div>
                    ) : null}

                    {/* EXPANDED METADATA WIDGET PANEL */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-[#1e244b]/40 pt-4 mt-3 space-y-4"
                        >
                          {/* 1. Subtasks checklists */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Interactive Subtask Checklist</span>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {(task.subtasks || []).map(st => (
                                <div key={st.id} className="flex items-center justify-between bg-[#090b1e]/50 border border-[#1e244b]/30 p-2 rounded-xl">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSubtask(task.id, st.id)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                        st.completed ? "bg-indigo-500 border-indigo-500 text-white" : "border-gray-500 hover:border-indigo-400"
                                      }`}
                                    >
                                      {st.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                    </button>
                                    <span className={`text-xs font-light ${st.completed ? "line-through text-gray-500" : "text-gray-300"}`}>
                                      {st.title}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubtask(task.id, st.id)}
                                    className="p-1 text-gray-600 hover:text-rose-500 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add specific subtask step..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask(task.id))}
                                className="flex-1 bg-[#090b1e]/60 border border-[#1e244b]/40 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-white placeholder-gray-600 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSubtask(task.id)}
                                className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>

                          {/* 2. Dependencies Settings & Recurrence */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Recurrence frequency</span>
                              <select
                                value={task.recurring?.frequency || "none"}
                                onChange={(e) => handleUpdateRecurring(task.id, e.target.value as any)}
                                className="w-full bg-[#090b1e]/70 border border-[#1e244b]/50 rounded-xl py-2 px-3 text-xs text-white outline-none cursor-pointer"
                              >
                                <option className="text-black bg-white" value="none">No Recurrence</option>
                                <option className="text-black bg-white" value="daily">🔁 Daily Recurrent</option>
                                <option className="text-black bg-white" value="weekly">🔁 Weekly Recurrent</option>
                                <option className="text-black bg-white" value="monthly">🔁 Monthly Recurrent</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Task dependency block</span>
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleToggleDependency(task.id, e.target.value);
                                    e.target.value = "";
                                  }
                                }}
                                className="w-full bg-[#090b1e]/70 border border-[#1e244b]/50 rounded-xl py-2 px-3 text-xs text-white outline-none cursor-pointer"
                              >
                                <option className="text-black bg-white" value="">+ Select Dependency</option>
                                {tasks.filter(t => t.id !== task.id).map(t => (
                                  <option className="text-black bg-white" key={t.id} value={t.id}>
                                    {(task.dependencies || []).includes(t.id) ? "✓ " : ""} {t.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* 3. Progress Slider & Tags management */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Manual Progress Slider</span>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={task.progress || 0}
                                  onChange={(e) => handleUpdateProgress(task.id, parseInt(e.target.value))}
                                  className="flex-1 accent-indigo-500 cursor-pointer"
                                />
                                <span className="text-xs font-mono font-bold text-gray-300">{task.progress || 0}%</span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Add Custom Tag</span>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="e.g. exams"
                                  value={newTagText}
                                  onChange={(e) => setNewTagText(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag(task.id))}
                                  className="flex-1 bg-[#090b1e]/60 border border-[#1e244b]/40 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-white placeholder-gray-600 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddTag(task.id)}
                                  className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 4. Notes Scratchpad */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Private Study Notes</span>
                            <textarea
                              placeholder="Type custom equations, code snippets, or research remarks..."
                              value={task.notes || ""}
                              onChange={(e) => handleUpdateNotes(task.id, e.target.value)}
                              rows={2}
                              className="w-full bg-[#090b1e]/80 border border-[#1e244b]/50 rounded-xl p-3 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-all resize-none"
                            />
                          </div>

                          {/* 5. Simulated File Attachments */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">Simulated Attachments</span>
                            <div className="space-y-1.5">
                              {(task.attachments || []).map((att, attIdx) => (
                                <div key={attIdx} className="flex items-center gap-2 text-[11px] text-gray-400 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                                  <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="text-gray-300 font-mono">{att.name}</span>
                                  <span className="text-[9px] text-gray-500 font-bold">({att.size})</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <select
                                value={simulationFile}
                                onChange={(e) => setSimulationFile(e.target.value)}
                                className="flex-1 bg-[#090b1e]/60 border border-[#1e244b]/40 rounded-lg py-1.5 px-3 text-xs text-white outline-none cursor-pointer"
                              >
                                <option className="text-black bg-white" value="System_Blueprint.pdf">System_Blueprint.pdf</option>
                                <option className="text-black bg-white" value="ML_Algorithms_Lecture2.pdf">ML_Algorithms_Lecture2.pdf</option>
                                <option className="text-black bg-white" value="database_mockups.png">database_mockups.png</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSimulateAttachment(task.id)}
                                className="px-3 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-cyan-500/20"
                              >
                                Upload File
                              </button>
                            </div>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isOverdue(task) && (
                      <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 space-y-2 select-none">
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400 animate-pulse" />
                          <span>Passed Deadline! Give option to reschedule:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              const newDueDate = tomorrow.toISOString().split("T")[0];
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, dueDate: newDueDate } : t));
                              showToast(`Rescheduled "${task.title}" to Tomorrow!`);
                            }}
                            className="text-[10px] bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded px-2 py-1 border border-indigo-500/30 transition-all cursor-pointer font-medium"
                          >
                            Tomorrow (+1d)
                          </button>
                          <button
                            onClick={() => {
                              const nextWeek = new Date();
                              nextWeek.setDate(nextWeek.getDate() + 7);
                              const newDueDate = nextWeek.toISOString().split("T")[0];
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, dueDate: newDueDate } : t));
                              showToast(`Rescheduled "${task.title}" to next week!`);
                            }}
                            className="text-[10px] bg-cyan-500/20 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded px-2 py-1 border border-cyan-500/30 transition-all cursor-pointer font-medium"
                          >
                            Next Week (+7d)
                          </button>
                          <input
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => {
                              if (e.target.value) {
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, dueDate: e.target.value } : t));
                                showToast(`Rescheduled "${task.title}" to ${e.target.value}!`);
                              }
                            }}
                            className="text-[10px] bg-[#090b1e] border border-[#1e244b] text-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                            title="Choose Custom Date"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Stats Row */}
                  <div className="flex items-center justify-between border-t border-[#1e244b]/40 pt-4 mt-4 gap-2 flex-wrap select-none">
                    <div className="flex items-center gap-3.5 text-[10px]">
                      {/* Due date */}
                      <span className="text-gray-400 flex items-center gap-1 font-mono font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-[#10b981]" />
                        {formatDateString(task.dueDate)}
                      </span>

                      {/* Work estimation hours */}
                      <span className="text-gray-400 flex items-center gap-1 font-mono font-semibold">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {task.durationHours} hrs
                      </span>
                    </div>

                    {/* Google Action shortcuts */}
                    <div className="flex items-center gap-1.5">
                      {/* Google Calendar Link Button */}
                      <button
                        onClick={() => handleSyncCalendar(task)}
                        disabled={syncingTaskId === task.id}
                        className={`p-1 rounded-md border transition-all cursor-pointer ${
                          task.gCalSynced 
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" 
                            : "bg-[#090b1e]/60 border-[#1e244b]/60 text-gray-400 hover:text-white hover:border-indigo-400"
                        }`}
                        title={task.gCalSynced ? "Synced with Google Calendar!" : "Sync task with Google Calendar"}
                      >
                        {syncingTaskId === task.id ? (
                          <span className="w-3 h-3 block border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CalendarDays className="w-3 h-3" />
                        )}
                      </button>

                      {/* Gmail Reminder Dispatch Button */}
                      <button
                        onClick={() => handleSendGmail(task)}
                        disabled={mailingTaskId === task.id}
                        className={`p-1 rounded-md border transition-all cursor-pointer ${
                          task.gmailSent 
                            ? "bg-[#10b981]/15 border-emerald-400/40 text-cyan-400" 
                            : "bg-[#090b1e]/60 border-[#1e244b]/60 text-gray-400 hover:text-white hover:border-indigo-400"
                        }`}
                        title={task.gmailSent ? "Gmail Reminder Sent!" : "Email a milestone reminder via Gmail"}
                      >
                        {mailingTaskId === task.id ? (
                          <span className="w-3 h-3 block border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                      </button>

                      {/* Priority Indicator */}
                      <span className={task.completed ? "text-[10px] bg-cyan-900/10 border border-cyan-800/20 text-cyan-500 px-2.5 py-0.5 rounded-lg shrink-0 font-medium font-sans" : priorityColor[task.priority]}>
                        {task.completed ? "Completed" : task.priority}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STICKY FLOATING BULK-ACTIONS PANEL */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#12163b]/95 border-2 border-indigo-500/40 px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-6 z-40 backdrop-blur-md w-full max-w-xl select-none"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-xs text-indigo-200 font-mono font-bold">
                {selectedTaskIds.length} Milestone(s) Selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, completed: true, progress: 100 } : t));
                  setSelectedTaskIds([]);
                  showToast(`Successfully marked ${selectedTaskIds.length} milestones as completed! ✅`);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Complete
              </button>
              <button
                onClick={() => {
                  setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, priority: "High" } : t));
                  setSelectedTaskIds([]);
                  showToast(`Elevated priority level to High! 🔴`);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Set High
              </button>
              <button
                onClick={() => {
                  setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
                  setSelectedTaskIds([]);
                  showToast(`Bulk deleted selected milestone trackers! 🗑️`);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Delete
              </button>
              <div className="h-4 w-[1px] bg-indigo-500/30" />
              <button
                onClick={() => setSelectedTaskIds([])}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Login Confirmation Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-[#090b1e]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#12163b] border-2 border-[#1e244b] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative select-none">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/25">
              <Zap className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-white font-display font-bold text-base">Google Integration Required</h4>
              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">
                To sync your deadlines to Google Calendar or dispatch reminders via Gmail, authorize your Google account once.
              </p>
            </div>
            <div className="flex gap-2 pt-2.5">
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setPendingGoogleAction(null);
                }}
                className="flex-1 py-2.5 bg-[#090b1e] hover:bg-[#090b1e]/80 border border-[#1e244b] text-gray-400 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectAndExecute}
                className="flex-1 py-2.5 bg-white text-slate-900 hover:bg-gray-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-transform"
              >
                <span>Authorize</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast feedback */}
      {tasksToast && (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-slate-900 border-2 border-emerald-500/30 text-white text-xs font-sans font-medium px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-bounce select-none">
          <span className="w-2.5 h-2.5 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </span>
          <span>{tasksToast}</span>
        </div>
      )}

    </div>
  );
}
