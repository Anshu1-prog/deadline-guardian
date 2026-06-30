import { Task, AIPlan, UserProfile, PriorityLevel } from "../types";

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_PLAN: AIPlan | null = null;

export const INITIAL_PROFILE: UserProfile = {
  name: "",
  avatarSeed: "default",
  streak: 0,
  focusScore: 0,
  dailyWorkHours: 0,
  joinedDate: new Date().toISOString().split("T")[0],
};

// Local storage key names
const STORAGE_KEYS = {
  TASKS: "deadline_guardian_tasks",
  ACTIVE_PLAN: "deadline_guardian_active_plan",
  ALL_PLANS: "deadline_guardian_all_plans",
  PROFILE: "deadline_guardian_profile"
};

export function loadTasks(): Task[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.TASKS);
    let loaded: Task[] = [];
   if (data) {
  loaded = JSON.parse(data);
} else {
  loaded = [];
}
    // Update priorities dynamically based on deadline
    return loaded.map(t => ({
      ...t,
      priority: getDynamicPriority(t.dueDate)
    }));
  } catch (e) {
    console.error("Failed to parse tasks from safeStorage", e);
  }
  return [];
}

export function saveTasks(tasks: Task[]): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error("Failed to save tasks to safeStorage", e);
  }
}

export function loadActivePlan(): AIPlan | null {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.ACTIVE_PLAN);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse active plan from safeStorage", e);
  }
  return null;
}

export function saveActivePlan(plan: AIPlan | null): void {
  try {
    if (plan) {
      safeStorage.setItem(STORAGE_KEYS.ACTIVE_PLAN, JSON.stringify(plan));
    } else {
      safeStorage.removeItem(STORAGE_KEYS.ACTIVE_PLAN);
    }
  } catch (e) {
    console.error("Failed to save active plan to safeStorage", e);
  }
}

export function loadAllPlans(): AIPlan[] {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.ALL_PLANS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse all plans from safeStorage", e);
  }
  return [];
}

export function saveAllPlans(plans: AIPlan[]): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.ALL_PLANS, JSON.stringify(plans));
  } catch (e) {
    console.error("Failed to save all plans to safeStorage", e);
  }
}

export function loadProfile(): UserProfile {
  try {
    const data = safeStorage.getItem(STORAGE_KEYS.PROFILE);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse profile from safeStorage", e);
  }
  return {
    name: "User",
    avatarSeed: "guardian-avatar",
    streak: 0,
    focusScore: 0,
    dailyWorkHours: 6,
    joinedDate: "2026-06-01"
  };
}

export function saveProfile(profile: UserProfile): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile to safeStorage", e);
  }
}

// Utility to calculate dynamic statistics based on tasks state
export function calculateStats(tasks: Task[], activePlan: AIPlan | null) {
  const currentDate = new Date();
  currentDate.setHours(0,0,0,0);

  // 1. Tasks This Week (within +/- 3 days of today)
  const tasksThisWeek = tasks.filter(t => {
    if (!t || !t.dueDate) return false;
    const taskDate = new Date(t.dueDate);
    taskDate.setHours(0,0,0,0);
    const diffTime = Math.abs(taskDate.getTime() - currentDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 4; // within 4 days of today (this week context)
  }).length;

  // 2. Upcoming Deadlines count (incomplete tasks in the future or today)
  const upcomingDeadlinesCount = tasks.filter(t => !t.completed).length;

  // 3. Risk Level based on closest incomplete task deadline
  // "low risk means deadline in 7 days medium 3 to 5 and high is 1 to 2"
  const incompleteTasks = tasks.filter(t => !t.completed);
  let riskLevel: "High" | "Medium" | "Low" = "Low";
  
  if (incompleteTasks.length > 0) {
    let minDiffDays = 999;
    incompleteTasks.forEach(t => {
      const taskDate = new Date(t.dueDate);
      taskDate.setHours(0,0,0,0);
      const diffTime = taskDate.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < minDiffDays) {
        minDiffDays = diffDays;
      }
    });

    if (minDiffDays <= 2) {
      riskLevel = "High";
    } else if (minDiffDays <= 5) {
      riskLevel = "Medium";
    } else {
      riskLevel = "Low";
    }
  }

  // 4. Focus score: 0 if no tasks exist
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  let focusScore = 0;
  if (totalCount > 0) {
    focusScore = Math.round((completedCount / totalCount) * 100);
    focusScore = Math.max(0, Math.min(100, focusScore));
  }

  return {
    tasksThisWeek,
    upcomingDeadlinesCount,
    riskLevel,
    focusScore
  };
}

export function detectCategory(title: string, description: string = ""): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("wireframe") || text.includes("figma") || text.includes("logo") || text.includes("css") || text.includes("color") || text.includes("style") || text.includes("frontend") || text.includes("mockup") || text.includes("theme")) {
    return "Design";
  }
  if (text.includes("test") || text.includes("review") || text.includes("bug") || text.includes("audit") || text.includes("check") || text.includes("verify") || text.includes("refactor") || text.includes("qa") || text.includes("evaluate") || text.includes("debug") || text.includes("optimize")) {
    return "Review";
  }
  if (text.includes("study") || text.includes("math") || text.includes("exam") || text.includes("lecture") || text.includes("classroom") || text.includes("homework") || text.includes("assignment") || text.includes("course") || text.includes("academic") || text.includes("revise") || text.includes("school") || text.includes("curriculum") || text.includes("syllabus") || text.includes("science") || text.includes("history") || text.includes("classroom") || text.includes("coursework")) {
    return "Academics";
  }
  if (text.includes("code") || text.includes("program") || text.includes("develop") || text.includes("react") || text.includes("typescript") || text.includes("api") || text.includes("backend") || text.includes("database") || text.includes("git") || text.includes("javascript") || text.includes("npm") || text.includes("esbuild") || text.includes("server") || text.includes("endpoints") || text.includes("algorithmic") || text.includes("coding")) {
    return "Coding";
  }
  if (text.includes("project") || text.includes("build") || text.includes("create") || text.includes("implement") || text.includes("app") || text.includes("application") || text.includes("scaffold") || text.includes("milestone") || text.includes("architecture")) {
    return "Project";
  }
  if (text.includes("buy") || text.includes("clean") || text.includes("gym") || text.includes("personal") || text.includes("health") || text.includes("call") || text.includes("gift") || text.includes("sleep") || text.includes("stretch") || text.includes("meditate") || text.includes("break")) {
    return "Personal";
  }
  return "Other";
}

export function getDynamicPriority(dueDate: string): PriorityLevel {
  const targetDate = new Date(dueDate);
  if (isNaN(targetDate.getTime())) return "Medium";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);
  
  const diffTime = targetMidnight.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 2) {
    return "High";
  } else if (diffDays <= 4) {
    return "Medium";
  } else {
    return "Low";
  }
}

export function isOverdue(task: Task): boolean {
  if (task.completed) return false;
  const targetDate = new Date(task.dueDate);
  if (isNaN(targetDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);
  return targetMidnight < today;
}

export function breakdownTaskIfLong(task: Omit<Task, "id"> & { id?: string }): Task[] {
  const minLongHours = 6;
  if (task.durationHours < minLongHours) {
    return [{
      ...task,
      id: task.id || `task-${Date.now()}`
    } as Task];
  }

  // Parse dueDate
  let targetDate = new Date(task.dueDate);
  if (isNaN(targetDate.getTime())) {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);

  // Number of days including today and the target date
  const diffTime = targetMidnight.getTime() - today.getTime();
  let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays < 1) diffDays = 1;

  const totalHours = task.durationHours;
  if (diffDays === 1) {
    const chunkSize = 2; // split into 2 hour subtasks
    const numChunks = Math.ceil(totalHours / chunkSize);
    const subtasks: Task[] = [];
    for (let i = 0; i < numChunks; i++) {
      const chunkHours = i === numChunks - 1 ? totalHours - (i * chunkSize) : chunkSize;
      if (chunkHours <= 0) continue;
      subtasks.push({
        id: `task-split-${Date.now()}-${i}`,
        title: `${task.title} (Part ${i + 1}/${numChunks})`,
        description: `${task.description} - Sub-task ${i + 1} of ${numChunks} [Allocated: ${chunkHours} hrs]`,
        dueDate: task.dueDate,
        category: task.category,
        priority: task.priority,
        completed: false,
        durationHours: parseFloat(chunkHours.toFixed(1)),
        planId: task.planId,
        gCalSynced: task.gCalSynced,
        gmailSent: task.gmailSent
      });
    }
    return subtasks;
  } else {
    // Distribute hours across diffDays
    const hoursPerDay = totalHours / diffDays;
    const subtasks: Task[] = [];
    for (let i = 0; i < diffDays; i++) {
      const currentStepDate = new Date(today);
      currentStepDate.setDate(today.getDate() + i);
      const formattedDate = currentStepDate.toISOString().split("T")[0];

      const partsCount = diffDays;
      subtasks.push({
        id: `task-split-${Date.now()}-${i}`,
        title: `${task.title} (Day ${i + 1}/${partsCount})`,
        description: `${task.description} - Day ${i + 1} progress block [Allocated: ${hoursPerDay.toFixed(1)} hrs]`,
        dueDate: formattedDate,
        category: task.category,
        priority: task.priority,
        completed: false,
        durationHours: parseFloat(hoursPerDay.toFixed(1)),
        planId: task.planId,
        gCalSynced: task.gCalSynced,
        gmailSent: task.gmailSent
      });
    }
    return subtasks;
  }
}
