export type PriorityLevel = "High" | "Medium" | "Low";

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskRecurring {
  frequency: "daily" | "weekly" | "monthly" | "none";
  startDate: string;
  endDate?: string;
}

export interface TaskAttachment {
  name: string;
  url?: string;
  size?: string;
  type?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  category: string; // "Coding", "Academics", "Career", "Finance", "Personal", "Design", "General"
  priority: PriorityLevel;
  completed: boolean;
  planId?: string; // Links task to a generated plan
  durationHours: number;
  gCalSynced?: boolean; // Google Calendar status indicator
  gmailSent?: boolean; // Gmail dispatch status indicator
  // Advanced task management extension
  risk?: "Low" | "Medium" | "High" | "Overdue";
  riskProbability?: number; // Actual risk probability percentage (e.g. 0-100)
  estimatedTime?: number; // fallback to durationHours
  actualTime?: number;
  status?: "To Do" | "In Progress" | "Completed" | "Archived";
  progress?: number; // 0 to 100
  notes?: string;
  archived?: boolean;
  
  // Smart Task Engine Support
  subtasks?: SubTask[];
  recurring?: TaskRecurring;
  dependencies?: string[]; // Task IDs that this task depends on
  tags?: string[];
  attachments?: TaskAttachment[];
  color?: string; // Calendar hex color coding
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  durationHours: number;
  dayOffset?: number;
  dependencies?: string[]; // step IDs that this step depends on
}

export interface AIPlan {
  id: string;
  planName: string;
  objective: string;
  targetDeadline: string; // YYYY-MM-DD
  steps: PlanStep[];
  estimatedTotalHours: number;
  createdAt: string; // ISO date string
  applied: boolean;
  // Advanced AI Planner extensions
  milestones?: string[];
  difficultyAnalysis?: {
    level: "Easy" | "Medium" | "Hard" | "Expert";
    reason: string;
  };
  dailySchedule?: { time: string; task: string }[];
  weeklySchedule?: { week: string; theme: string }[];
  revisionSchedule?: string[];
  bufferDays?: number;
  progressCheckpoints?: string[];
  
  // Real Commercial extensions
  catchUpDays?: number;
  completionPredictionDate?: string;
  smartSuggestions?: string[];
  recommendedOrder?: string[]; // step IDs in recommended sequence
}

export interface UserProfile {
  name: string;
  avatarSeed: string; // RoboHash, Dicebear, or predefined
  streak: number;
  focusScore: number; // 0-100 percentage
  dailyWorkHours: number; // default work hours threshold
  joinedDate: string;
  // gamification details
  xp?: number;
  level?: number;
  coins?: number;
  achievements?: { id: string; title: string; unlockedAt: string; icon: string }[];
  streakRecord?: number;
  // Settings persistence
  theme?: "Dark" | "OLED" | "Glass";
  accentColor?: string;
  notifications?: {
    deadlineReminder: boolean;
    overdueReminder: boolean;
    dailyPlanningReminder: boolean;
    weeklyReport: boolean;
    achievementUnlocked: boolean;
    riskAlert: boolean;
  };
  pomodoroSettings?: {
    workTime: number;
    shortBreak: number;
    longBreak: number;
    autoStart: boolean;
    autoBreak: boolean;
  };
}

export type TabType = 
  | "Dashboard" 
  | "My Tasks" 
  | "Calendar" 
  | "AI Planner" 
  | "Progress" 
  | "Analytics" 
  | "AI Insights"
  | "Settings";


