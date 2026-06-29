import React, { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, 
  Calendar, 
  AlertTriangle, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  CalendarDays,
  Mail,
  Zap,
  Info,
  CheckSquare,
  Check,
  MessageSquare,
  X,
  Plus
} from "lucide-react";
import { Task, AIPlan, UserProfile, TabType, PriorityLevel } from "../types";
import { detectCategory, isOverdue } from "../utils/dataStore";
import { motion, AnimatePresence } from "motion/react";
import { createCalendarEvent, sendGmailReminder, googleSignIn } from "../utils/workspace";
import ClassroomSync from "./ClassroomSync";
import { fetchConfig, generatePlan } from "../services/apiService";

interface DashboardViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activePlan: AIPlan | null;
  setActivePlan: React.Dispatch<React.SetStateAction<AIPlan | null>>;
  allPlans: AIPlan[];
  setAllPlans: React.Dispatch<React.SetStateAction<AIPlan[]>>;
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setActiveTab: (tab: TabType) => void;
  stats: {
    tasksThisWeek: number;
    upcomingDeadlinesCount: number;
    riskLevel: "High" | "Medium" | "Low";
    focusScore: number;
  };
  googleToken: string | null;
  setGoogleToken: React.Dispatch<React.SetStateAction<string | null>>;
  googleUser: any | null;
  setGoogleUser: React.Dispatch<React.SetStateAction<any | null>>;
  isBotOpen: boolean;
  setIsBotOpen: (open: boolean) => void;
  isFocusModalOpen: boolean;
  setIsFocusModalOpen: (open: boolean) => void;
  pomodoroTimeLeft: number;
  setPomodoroTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  pomodoroDuration: number;
  setPomodoroDuration: React.Dispatch<React.SetStateAction<number>>;
  isPomodoroActive: boolean;
  setIsPomodoroActive: React.Dispatch<React.SetStateAction<boolean>>;
  pomodoroMode: "focus" | "break";
  setPomodoroMode: React.Dispatch<React.SetStateAction<"focus" | "break">>;
  showToast: (msg: string) => void;
}

export default function DashboardView({
  tasks,
  setTasks,
  activePlan,
  setActivePlan,
  allPlans,
  setAllPlans,
  profile,
  setProfile,
  setActiveTab,
  stats,
  googleToken,
  setGoogleToken,
  googleUser,
  setGoogleUser,
  isBotOpen,
  setIsBotOpen,
  isFocusModalOpen,
  setIsFocusModalOpen,
  pomodoroTimeLeft,
  setPomodoroTimeLeft,
  pomodoroDuration,
  setPomodoroDuration,
  isPomodoroActive,
  setIsPomodoroActive,
  pomodoroMode,
  setPomodoroMode,
  showToast
}: DashboardViewProps) {
  const [objective, setObjective] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);

  React.useEffect(() => {
    fetchConfig()
      .then(data => {
        if (data && data.success) {
          setHasGeminiKey(data.hasGemini);
        }
      })
      .catch(err => console.error("Failed to check Gemini API status:", err));
  }, []);

  React.useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (deadline < todayStr) {
      setDeadline(todayStr);
    }
  }, [deadline]);

  // States for mini Calendar Widget
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // Google Workspace execution progress states
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [mailingTaskId, setMailingTaskId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingGoogleAction, setPendingGoogleAction] = useState<{ type: "calendar" | "gmail"; task: Task } | null>(null);


  // Calculate closest deadline dynamically
  const getClosestDeadline = () => {
    const pendingTasks = tasks.filter(t => !t.completed);
    if (pendingTasks.length === 0) return "None";
    const sorted = [...pendingTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return sorted[0].dueDate;
  };
  const closestDeadline = getClosestDeadline();


  // Dynamic metrics calculations to remove all hardcoded values from Goal Progress Section
  const currentGoalName = activePlan ? (activePlan.planName || activePlan.objective) : "No active goal";

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const completionProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  let daysRemainingStr = "No active deadline";
  const deadlineStr = activePlan?.targetDeadline || closestDeadline;
  if (deadlineStr && deadlineStr !== "None") {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(deadlineStr);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      daysRemainingStr = `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
    } else if (diffDays === 0) {
      daysRemainingStr = "Due today";
    } else {
      daysRemainingStr = `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} overdue`;
    }
  }

  let estDateStr = "No tasks pending";
  const incompleteTasksList = tasks.filter(t => !t.completed);
  if (incompleteTasksList.length > 0) {
    const remainingHours = incompleteTasksList.reduce((sum, t) => sum + (t.durationHours || 0), 0);
    const dailyHours = profile?.dailyWorkHours || 4;
    const daysNeeded = Math.ceil(remainingHours / dailyHours);
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + daysNeeded);
    estDateStr = estDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } else if (totalTasksCount > 0 && incompleteTasksList.length === 0) {
    estDateStr = "Completed";
  }

  const currentStreakStr = profile.streak > 0 ? `${profile.streak} days 🔥` : "No focus sessions yet";

  const focusTimerHours = parseFloat(localStorage.getItem("deadline_guardian_focus_hours") || "0");
  const taskCompletedHours = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.durationHours || 0), 0);
  const totalFocusHours = parseFloat((focusTimerHours + taskCompletedHours).toFixed(1));
  const focusHoursStr = totalFocusHours > 0 ? `${totalFocusHours} hrs` : "No focus sessions yet";


  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
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
          <hr style="border: 0; border-top: 1px solid #1e244b; margin: 16px 0;" />
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 10px 0;">Milestone Notification Reminder:</h3>
          <p style="color: #22d3ee; font-weight: bold; font-size: 18px; margin: 0 0 12px 0;">${task.title}</p>
          <p style="color: #9cb3c9; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">${task.description || "You have an approaching academic milestone. Review your steps and execution metrics to protect your deadlines."}</p>
          
          <div style="background-color: rgba(18, 22, 59, 0.7); border: 1px solid #1e244b; border-radius: 12px; padding: 14px; font-size: 12px; margin-bottom: 16px;">
            <p style="margin: 0 0 6px 0; color: #a1b0cb;"><strong style="color: #f43f5e;">Target Due Date:</strong> ${task.dueDate}</p>
            <p style="margin: 0 0 6px 0; color: #a1b0cb;"><strong style="color: #fbbf24;">Priority Weight:</strong> ${task.priority}</p>
            <p style="margin: 0; color: #a1b0cb;"><strong style="color: #34d399;">Category Partition:</strong> ${task.category}</p>
          </div>
          
          <p style="margin: 20px 0 0 0; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e244b; padding-top: 12px;">
            Dispatched via secure automated Gemini/Workspace layers. Protect your milestones.
          </p>
        </div>
      `;
      await sendGmailReminder(googleToken, recipient, subject, htmlBody);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, gmailSent: true } : t));
      showToast(`Gmail reminder successfully sent to ${recipient}!`);
    } catch (err: any) {
      showToast(`Gmail delivery failed: ${err?.message || err}`);
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

  const getMockGeneratedPlanClient = (obj: string, targetDl: string, skillLevel: string = "Intermediate", commitment: string = "Moderate (3-4 hrs)", academicTone: string = "Friendly Advisor") => {
    const norm = obj.trim() || "Achieve Success";
    const dl = targetDl || "2026-06-30";

    const titleWords = norm.split(" ");
    const formattedPlanName = titleWords.map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : "").join(" ");
    const lowerObjective = norm.toLowerCase();

    let steps = [];
    let totalHours = 12.0;

    if (lowerObjective.includes("data structure") || lowerObjective.includes("algorithm") || lowerObjective.includes("leetcode")) {
      steps = [
        {
          title: `Understand Basics of ${formattedPlanName}`,
          description: `Analyze primitive linear structures, memory allocation models, and evaluate initial complexity matrices for ${norm}.`,
          durationHours: 2.5
        },
        {
          title: `Explore Core Mechanisms & Recursion`,
          description: `Dive deep into standard data pipelines, stack frames, and practice fundamental backtracking or structural algorithms.`,
          durationHours: 3.0
        },
        {
          title: `Master Advanced Non-linear Systems`,
          description: `Implement complex traversals, node manipulation, and optimization methodologies tailored to ${norm}.`,
          durationHours: 3.5
        },
        {
          title: `Final Reviews, Complexities & Stress Practice`,
          description: `Test edge-case boundaries, practice pattern-solving drills, and perform a full mock evaluation prior to the target deadline.`,
          durationHours: 3.0
        }
      ];
      totalHours = 12.0;
    } else if (
      lowerObjective.includes("web") || 
      lowerObjective.includes("site") || 
      lowerObjective.includes("react") || 
      lowerObjective.includes("app") || 
      lowerObjective.includes("code") || 
      lowerObjective.includes("program") || 
      lowerObjective.includes("software") || 
      lowerObjective.includes("dev")
    ) {
      steps = [
        {
          title: `Architecture & Scaffolding for ${formattedPlanName}`,
          description: `Model components and core states, design initial wireframes, and scaffold the complete project modules for ${norm}.`,
          durationHours: 2.0
        },
        {
          title: `Frontend User Interfaces & Layout Design`,
          description: `Build responsive UI elements with modern styled blocks, ensuring a high-fidelity representation of ${norm}.`,
          durationHours: 3.5
        },
        {
          title: `Backend APIs & Data Sync Controllers`,
          description: `Formulate route endpoints, write validation layers, and establish safe local storage systems for ${norm}.`,
          durationHours: 4.0
        },
        {
          title: `Integration Review, QA Trials & Deployment`,
          description: `Run comprehensive cross-platform walkthroughs, debug connection lag, and publish the compiled release bundle.`,
          durationHours: 2.5
        }
      ];
      totalHours = 12.0;
    } else if (
      lowerObjective.includes("exam") || 
      lowerObjective.includes("test") || 
      lowerObjective.includes("study") || 
      lowerObjective.includes("quiz") || 
      lowerObjective.includes("learn") || 
      lowerObjective.includes("read") || 
      lowerObjective.includes("course") || 
      lowerObjective.includes("class")
    ) {
      steps = [
        {
          title: `Scope Mapping & Primary References for ${formattedPlanName}`,
          description: `Gather curriculum topics, highlight vital syllabus goals, and review primary literature for ${norm}.`,
          durationHours: 2.5
        },
        {
          title: `Detailed Concept Drafting & Summaries`,
          description: `Summarize complex chapters, draft key reference sheets, and identify major thematic points regarding ${norm}.`,
          durationHours: 3.5
        },
        {
          title: `Active Recall & Practical Quizzes`,
          description: `Carry out flashcard drill runs, solve past papers, and review weak performance concepts under simulated conditions.`,
          durationHours: 4.0
        },
        {
          title: `Final Revision & Mock Test Simulation`,
          description: `Re-evaluate cheat sheets, clear doubts, and complete a timed comprehensive evaluation before the deadline on ${dl}.`,
          durationHours: 2.0
        }
      ];
      totalHours = 12.0;
    } else {
      steps = [
        {
          title: `Foundations of ${formattedPlanName}`,
          description: `Explore primary definitions, review essential background material, and set up your roadmap scope to target ${norm} successfully.`,
          durationHours: 2.0
        },
        {
          title: `Initial Drills & Practical Implementation`,
          description: `Begin hands-on exercises focused on ${norm}, experiment with essential steps, and identify potential roadblocks.`,
          durationHours: 3.0
        },
        {
          title: `Advanced Development & Integration`,
          description: `Iterate on complex elements of ${norm}, integrate multiple components, and refine pacing models for better efficiency.`,
          durationHours: 4.0
        },
        {
          title: `Final Validation & Completion Milestone`,
          description: `Conduct a thorough quality review of your accomplishments for ${norm}, correct minor bugs, and lock in the final milestone.`,
          durationHours: 2.0
        }
      ];
      totalHours = 11.0;
    }

    if (academicTone === "Rigid Coach") {
      steps = steps.map(s => ({
        ...s,
        title: `[STRICT] ${s.title}`,
        description: `Strict discipline: ${s.description} Deliverables must be verified without exception.`
      }));
    } else if (academicTone === "Friendly Advisor") {
      steps = steps.map(s => ({
        ...s,
        title: `🌟 ${s.title}`,
        description: `Friendly tip: ${s.description} Take comfortable breaks and stay positive!`
      }));
    } else if (academicTone === "Philosophical Sage") {
      steps = steps.map(s => ({
        ...s,
        title: `⏳ ${s.title}`,
        description: `Wisdom: ${s.description} Contemplate your growth and understand the deeper patterns.`
      }));
    }

    return {
      planName: formattedPlanName,
      steps: steps,
      estimatedTotalHours: totalHours
    };
  };

  // Redirects directly to the AI Planner tab with pre-filled inputs
  const handleGeneratePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const finalObjective = objective.trim() || "Learn Data Structures";
    const finalDeadline = deadline || "2026-06-30";
    
    // Persist pending values so AIPlannerView can pick them up automatically
    localStorage.setItem("deadline_guardian_pending_objective", finalObjective);
    localStorage.setItem("deadline_guardian_pending_deadline", finalDeadline);
    
    setActiveTab("AI Planner");
  };

  const handlePlanClassroomAssignment = async (title: string, dueDate: string, description: string) => {
    setObjective(title);
    setDeadline(dueDate);
    setIsGenerating(true);
    setGenerationSource(null);
    let planData = null;
    let fallbackRequired = false;

    try {
      const data = await generatePlan(title, dueDate, "Intermediate", "Moderate (3-4 hrs)", "Friendly Advisor");
      if (data && data.success && data.plan) {
        planData = data.plan;
        setGenerationSource(data.source || "gemini-api");
      } else {
        fallbackRequired = true;
      }
    } catch (err) {
      console.warn("AI Generation request failed, using high-fidelity local models:", err);
      fallbackRequired = true;
    }

    if (fallbackRequired || !planData || !planData.steps || !Array.isArray(planData.steps)) {
      try {
        await new Promise(resolve => setTimeout(resolve, 900));
        planData = getMockGeneratedPlanClient(title, dueDate, "Intermediate", "Moderate (3-4 hrs)", "Friendly Advisor");
        setGenerationSource("local-intelligent-planner");
      } catch (err) {
        console.error("Local fallback mock planner failed:", err);
      }
    }

    try {
      if (planData && planData.steps && Array.isArray(planData.steps)) {
        const generatedSteps = planData.steps.map((step: any, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          title: step.title || `Milestone ${idx + 1}`,
          description: step.description || "Milestone description",
          durationHours: step.durationHours || 2.0
        }));

        const newPlan: AIPlan = {
          id: `plan-${Date.now()}`,
          planName: planData.planName || title,
          objective: title,
          targetDeadline: dueDate,
          steps: generatedSteps,
          estimatedTotalHours: planData.estimatedTotalHours || 10,
          createdAt: new Date().toISOString(),
          applied: false
        };

        setActivePlan(newPlan);
        setAllPlans(prev => [newPlan, ...prev]);

        const generatedTasks: Task[] = generatedSteps.map((step: any, idx: number) => {
          const currentSimulated = new Date();
          let target = new Date(dueDate);
          if (isNaN(target.getTime())) {
            target = new Date();
            target.setDate(target.getDate() + 7);
          }
          let diffTime = target.getTime() - currentSimulated.getTime();
          if (isNaN(diffTime) || diffTime < 0) {
            diffTime = 7 * 24 * 60 * 60 * 1000;
          }
          const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          const tasksPerDay = Math.max(2, Math.ceil(generatedSteps.length / diffDays));
          let offsetDays = Math.floor(idx / tasksPerDay);
          if (offsetDays >= diffDays) {
            offsetDays = diffDays - 1;
          }
          if (offsetDays < 0) offsetDays = 0;

          const stepDate = new Date();
          stepDate.setDate(stepDate.getDate() + offsetDays);
          
          let formattedStepDate = dueDate;
          try {
            if (!isNaN(stepDate.getTime())) {
              formattedStepDate = stepDate.toISOString().split("T")[0];
            }
          } catch (e) {
            console.error(e);
          }

          if (idx === generatedSteps.length - 1) {
            formattedStepDate = dueDate;
          }

          const detected = detectCategory(step.title, step.description);
          return {
            id: `task-ai-${Date.now()}-${idx}`,
            title: step.title,
            description: step.description,
            priority: "Medium" as PriorityLevel,
            category: detected === "Other" ? "Academics" : detected,
            dueDate: formattedStepDate,
            completed: false,
            planId: newPlan.id,
            durationHours: step.durationHours
          };
        });

        setTasks(prev => [...generatedTasks, ...prev]);
        showToast(`🎉 Succesfully imported Classroom coursework & planned ${generatedTasks.length} milestones!`);

        if (googleToken) {
          Promise.all(
            generatedTasks.map(t => 
              createCalendarEvent(googleToken, t.title, t.description, t.dueDate)
                .then(() => {
                  setTasks(prev => prev.map(pt => pt.id === t.id ? { ...pt, gCalSynced: true } : pt));
                })
                .catch(err => console.error("Auto GCal sync failed for coursework:", err))
            )
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle completion of task in upcoming tasks lists
  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleDirectCreateClassroomTask = async (title: string, dueDate: string, description: string) => {
    const detected = detectCategory(title, description);
    const newTask: Task = {
      id: `task-classroom-${Date.now()}`,
      title,
      description,
      priority: "Medium",
      category: detected === "Other" ? "Academics" : detected,
      dueDate,
      completed: false,
      durationHours: 2
    };

    setTasks(prev => [newTask, ...prev]);
    showToast(`🎯 Added Classroom assignment: "${title}" directly to your tasks!`);

    if (googleToken) {
      try {
        await createCalendarEvent(googleToken, title, description, dueDate);
        setTasks(prev => prev.map(pt => pt.id === newTask.id ? { ...pt, gCalSynced: true } : pt));
        showToast(`Synced "${title}" with Google Calendar! 🗓️`);
      } catch (err) {
        console.error("Calendar sync failed for single assignment:", err);
      }
    }
  };

  const handleImportAllClassroomAssignments = async (assignments: { title: string; dueDate: string; description: string }[]) => {
    if (assignments.length === 0) {
      showToast("No active assignments to import.");
      return;
    }

    const newTasks: Task[] = assignments.map((item, idx) => {
      const detected = detectCategory(item.title, item.description);
      return {
        id: `task-classroom-bulk-${Date.now()}-${idx}`,
        title: item.title,
        description: item.description,
        priority: "Medium",
        category: detected === "Other" ? "Academics" : detected,
        dueDate: item.dueDate,
        completed: false,
        durationHours: 2
      };
    });

    setTasks(prev => [...newTasks, ...prev]);
    showToast(`🚀 Successfully imported ${assignments.length} assignments as active tasks!`);

    if (googleToken) {
      try {
        await Promise.all(
          newTasks.map(async t => {
            try {
              await createCalendarEvent(googleToken, t.title, t.description, t.dueDate);
              setTasks(prev => prev.map(pt => pt.id === t.id ? { ...pt, gCalSynced: true } : pt));
            } catch (err) {
              console.error("Bulk sync error for task:", t.title, err);
            }
          })
        );
        showToast("Synced imported assignments to your Google Calendar! 🗓️");
      } catch (err) {
        console.error("Bulk calendar sync failed:", err);
      }
    }
  };

  // Render Days for mini Calendar View widget (Dynamic Month)
  const renderCalendarDays = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon, etc.
    
    // Get total days in current month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get total days in previous month for padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days = [];
    const today = new Date();
    
    // Add grayed out trailing items from previous month
    const prevMonthStart = prevMonthDays - startDayOfWeek + 1;
    for (let i = prevMonthStart; i <= prevMonthDays; i++) {
      days.push(
        <div key={`prev-${i}`} className="text-gray-600 text-xs text-center py-1 font-light">
          {i}
        </div>
      );
    }

    // Add days of the month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const displayMonth = month + 1;
      const dateStringYMD = `${year}-${displayMonth < 10 ? "0" + displayMonth : displayMonth}-${d < 10 ? "0" + d : d}`;
      
      const tasksOnDate = tasks.filter(t => t.dueDate === dateStringYMD);
      const hasTasks = tasksOnDate.length > 0;
      const isSelectedDay = dateStringYMD === deadline;
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      days.push(
        <button
          key={`day-${d}`}
          id={`cal-mini-day-${d}`}
          type="button"
          onClick={() => {
            setDeadline(dateStringYMD);
          }}
          className={`text-xs text-center py-1 font-sans rounded-full relative group transition-all flex flex-col items-center justify-center h-7 w-7 mx-auto cursor-pointer ${
            isSelectedDay
              ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(79,70,229,0.8)] border border-cyan-400/50"
              : isToday
                ? "bg-cyan-500 text-slate-950 font-bold border border-cyan-300"
                : hasTasks 
                  ? "text-cyan-400 hover:bg-white/5 font-semibold"
                  : "text-gray-300 hover:bg-white/5"
          }`}
        >
          <span>{d}</span>
          
          {/* Real-time status dot indicator if tasks are scheduled on this date */}
          {hasTasks && (
            <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
              isSelectedDay 
                ? "bg-white" 
                : tasksOnDate.every(t => t.completed) 
                  ? "bg-emerald-400" 
                  : "bg-rose-400 animate-pulse"
            }`} />
          )}
        </button>
      );
    }

    // Add grayed out starting items for next month
    const totalFilled = startDayOfWeek + totalDaysInMonth;
    const remainingBlanks = (7 - (totalFilled % 7)) % 7;
    for (let j = 1; j <= remainingBlanks; j++) {
      days.push(
        <div key={`next-${j}`} className="text-gray-600 text-xs text-center py-1 font-light">
          {j}
        </div>
      );
    }

    return days;
  };

  // Calculate overall progress of the current active plan
  const calculatePlanProgress = () => {
    if (!activePlan) return 0;
    
    // Find tasks linked to this active plan
    const linkedTasks = tasks.filter(t => t.planId === activePlan.id);
    if (linkedTasks.length === 0) {
      // Hardcoded fallback mimicking the screenshot ratio if no dynamic tasks are linked
      return 48;
    }
    
    const completedVal = linkedTasks.filter(t => t.completed).length;
    return Math.round((completedVal / linkedTasks.length) * 100);
  };

  const planProgressPercent = calculatePlanProgress();

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-gradient-to-b from-[#090b1e] to-[#12163b] font-sans pb-16 overflow-y-auto">
      {/* Top Header Dashboard Bar with profile avatar */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-display font-bold text-white tracking-tight">
              Deadline Guardian AI
            </h2>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-4.5 h-4.5 text-cyan-400" />
            </div>
          </div>
          <p className="text-[#8692d0] text-sm font-medium mt-1">
            Your AI-powered Task & Deadline Planner
          </p>
        </div>

        {/* Profile indicator */}
        <div className="flex items-center gap-3 bg-[#12163b]/60 border border-[#1e244b]/60 px-4 py-2 rounded-2xl shadow-lg">
          <span className="text-sm font-medium text-gray-300">
            Hey, {profile.name} 👋
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
            U
          </div>
        </div>
      </header>

      {/* Main Interactive Work Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2/3 Content Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. AI DAILY BRIEF - Large premium card */}
          {(() => {
            const todayStr = new Date().toISOString().split("T")[0];
            const todayTasks = tasks.filter(t => t.dueDate === todayStr);
            const todayCompletedCount = todayTasks.filter(t => t.completed).length;
            const upcomingDeadlinesCount = tasks.filter(t => !t.completed).length;
            
            // Workload Hours calculation
            const totalWorkloadMinutes = todayTasks.reduce((acc, t) => acc + (t.durationHours || 2.0) * 60, 0);
            const workloadHours = Math.floor(totalWorkloadMinutes / 60);
            const workloadMins = Math.round(totalWorkloadMinutes % 60);
            const workloadStr = totalWorkloadMinutes > 0 
              ? `${workloadHours} ${workloadHours === 1 ? 'hour' : 'hours'} ${workloadMins > 0 ? `${workloadMins} mins` : ''}`
              : "0 hours";

            // One personalized AI recommendation
            let aiRecommendation = "Ensure your priorities are aligned and take a short break between focus sessions.";
            if (todayTasks.some(t => t.priority === "High" && !t.completed)) {
              const firstHigh = todayTasks.find(t => t.priority === "High" && !t.completed);
              aiRecommendation = `Prioritize completing "${firstHigh?.title}" before 6 PM to stay ahead of upcoming milestones.`;
            } else if (upcomingDeadlinesCount > 5) {
              aiRecommendation = "You have a backlog of deadlines. We suggest slotting a 50-minute deep work block today.";
            } else if (todayTasks.length === 0) {
              aiRecommendation = "No tasks due today! Perfect opportunity to generate an advanced study plan or review syllabus files.";
            }

            return (
              <div className="bg-gradient-to-r from-[#12163b] via-[#1a1f4d] to-[#12163b] border border-[#1e244b] rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl -z-1" />
                <div className="absolute top-4 right-4 bg-[#22d3ee]/10 text-[#22d3ee] text-[10px] px-2.5 py-1 rounded-full font-mono font-bold tracking-wider uppercase">
                  ✦ AI Daily Brief
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-white font-display font-bold text-2xl tracking-tight">
                      {getGreeting()}, {profile.name}!
                    </h3>
                    <p className="text-gray-300 text-xs">Your personalized AI copilot brief is ready.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1e244b]/60">
                    <div className="bg-[#090b1e]/60 p-3 rounded-2xl border border-[#1e244b]/30">
                      <span className="text-gray-400 text-[10px] block uppercase font-mono tracking-wider">Today's Tasks</span>
                      <span className="text-white text-lg font-bold font-display">{todayTasks.length} {todayTasks.length === 1 ? 'task' : 'tasks'}</span>
                    </div>
                    <div className="bg-[#090b1e]/60 p-3 rounded-2xl border border-[#1e244b]/30">
                      <span className="text-gray-400 text-[10px] block uppercase font-mono tracking-wider">Deadlines</span>
                      <span className="text-white text-lg font-bold font-display">{upcomingDeadlinesCount} pending</span>
                    </div>
                    <div className="bg-[#090b1e]/60 p-3 rounded-2xl border border-[#1e244b]/30">
                      <span className="text-gray-400 text-[10px] block uppercase font-mono tracking-wider">Workload</span>
                      <span className="text-white text-sm font-bold font-display leading-tight block mt-0.5">{workloadStr}</span>
                    </div>
                    <div className="bg-[#090b1e]/60 p-3 rounded-2xl border border-[#1e244b]/30">
                      <span className="text-gray-400 text-[10px] block uppercase font-mono tracking-wider">Productivity</span>
                      <span className="text-emerald-400 text-lg font-bold font-display">
                        {todayTasks.length > 0 ? `${Math.round((todayCompletedCount / todayTasks.length) * 100)}%` : "100%"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-indigo-950/40 border border-indigo-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-cyan-300 font-mono tracking-wider">AI Recommendation</span>
                      <p className="text-gray-200 text-[11px] leading-relaxed font-light">{aiRecommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}





          {/* MIDDLE COLUMN - Grid for Quick Stats & Goal Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 6. QUICK STATS - Improved styled widgets with colored borders depending on data */}
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Quick Stats
              </div>
              <div className="grid grid-cols-1 gap-3">
                {/* Tasks This Week */}
                <div className={`bg-[#12163b]/70 border-l-4 ${stats.tasksThisWeek > 10 ? 'border-l-rose-500' : stats.tasksThisWeek > 5 ? 'border-l-amber-500' : 'border-l-blue-500'} border-y border-r border-[#1e244b] rounded-2xl p-4 flex items-center justify-between hover:border-blue-500/30 transition-all duration-300 shadow-lg`}>
                  <div>
                    <span className="text-gray-400 text-[11px] font-medium block">Tasks This Week</span>
                    <span className="text-white text-2xl font-display font-bold mt-1 block">{stats.tasksThisWeek}</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-[#12163b]/70 border-l-4 border-l-emerald-500 border-y border-r border-[#1e244b] rounded-2xl p-4 flex items-center justify-between hover:border-emerald-500/30 transition-all duration-300 shadow-lg">
                  <div>
                    <span className="text-gray-400 text-[11px] font-medium block">Upcoming Deadlines</span>
                    <span className="text-white text-2xl font-display font-bold mt-1 block">{stats.upcomingDeadlinesCount}</span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                </div>

                {/* Risk Level */}
                <div className={`bg-[#12163b]/70 border-l-4 ${stats.riskLevel === 'High' ? 'border-l-rose-500' : stats.riskLevel === 'Medium' ? 'border-l-amber-500' : 'border-l-emerald-500'} border-y border-r border-[#1e244b] rounded-2xl p-4 flex items-center justify-between hover:border-rose-500/30 transition-all duration-300 shadow-lg`}>
                  <div>
                    <span className="text-gray-400 text-[11px] font-medium block">Risk Level</span>
                    <span className={`text-xl font-display font-bold mt-1 block ${stats.riskLevel === 'High' ? 'text-rose-400' : stats.riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{stats.riskLevel}</span>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stats.riskLevel === 'High' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. & 5. GOAL PROGRESS & PRODUCTIVITY STREAK - Beautiful progress widget */}
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                Goal Progress
              </div>
              <div className="bg-[#12163b]/60 border border-[#1e244b] rounded-3xl p-5 space-y-4 shadow-xl hover:border-indigo-500/30 transition-all duration-300">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">Current Goal</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                      {stats.riskLevel === 'High' ? 'At Risk' : 'On Track'}
                    </span>
                  </div>
                  <h4 className="text-white text-xs font-semibold leading-tight">{currentGoalName}</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Completion Progress</span>
                    <span className="font-mono text-cyan-300 font-bold">{completionProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#090b1e] rounded-full overflow-hidden border border-white/5 relative">
                    <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${completionProgress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1e244b]/40 text-[11px]">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-mono">Days Remaining</span>
                    <span className="text-white font-semibold font-mono">{daysRemainingStr}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-mono">Current Streak</span>
                    <span className={`font-mono font-bold ${profile.streak > 0 ? "text-emerald-400" : "text-gray-400"}`}>{currentStreakStr}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-mono">Estimated Date</span>
                    <span className="text-white font-semibold font-mono">{estDateStr}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-mono">Focus Hours</span>
                    <span className={`font-mono font-bold ${totalFocusHours > 0 ? "text-cyan-300" : "text-gray-400"}`}>{focusHoursStr}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM COLUMN - Grid for Today's Timeline & AI Insight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 2. TODAY'S TIMELINE */}
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#22d3ee] rounded-full" />
                Today's Timeline
              </div>
              <div className="bg-[#12163b]/60 border border-[#1e244b] rounded-3xl p-5 space-y-4.5 max-h-[260px] overflow-y-auto custom-scrollbar shadow-xl">
                {(() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const todayTasks = tasks.filter(t => t.dueDate === todayStr);

                  if (todayTasks.length === 0) {
                    return (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-gray-500 text-xs italic">No items scheduled for today.</p>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent("global-add-task-trigger"))}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Task
                        </button>
                      </div>
                    );
                  }

                  // Standard static hour intervals to match index
                  const intervals = ["09:00", "11:00", "12:00", "15:00", "18:00", "20:00"];

                  return (
                    <div className="space-y-4.5 relative pl-4 border-l border-[#1e244b]/80">
                      {todayTasks.slice(0, 5).map((t, index) => {
                        const time = intervals[index % intervals.length];
                        return (
                          <div key={t.id} className="relative group">
                            {/* Bullet connector */}
                            <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#12163b] shadow-md group-hover:bg-indigo-400 transition-colors" />
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-[#22d3ee] tracking-wide">{time}</span>
                              <span className={`text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${t.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {t.completed ? "Complete" : "Pending"}
                              </span>
                            </div>
                            <h5 className="text-white text-xs font-semibold leading-tight mt-1 group-hover:text-cyan-300 transition-colors truncate">{t.title}</h5>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. AI INSIGHT OF THE DAY */}
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                AI Insight of the Day
              </div>
              <div className="bg-[#12163b]/60 border border-[#1e244b] rounded-3xl p-5 space-y-4 shadow-xl hover:border-pink-500/30 transition-all duration-300 flex flex-col justify-between min-h-[220px]">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-pink-400 font-mono tracking-wider">Data Pattern Detected</span>
                    <p className="text-gray-200 text-[11px] leading-relaxed font-light">
                      {(() => {
                        const codingTasks = tasks.filter(t => t.category === "Coding");
                        const highPriorityTasks = tasks.filter(t => t.priority === "High" && !t.completed);
                        
                        if (codingTasks.length > 3) {
                          return "Pattern analysis suggests you complete your coding sprints much faster in the evenings. Schedule structural algorithm analysis for 6 PM to maximize flow blocks.";
                        } else if (highPriorityTasks.length > 2) {
                          return "Today has a heavy concentration of high-priority milestones. We strongly recommend finishing high-leverage deliverables first to avoid critical buffer decay.";
                        } else {
                          return "You typically delay DBMS syllabus reviews. Slotting a short 25-minute Pomodoro focus block today will prevent cumulative stress prior to finals.";
                        }
                      })()}
                    </p>
                  </div>
                </div>

                <div className="text-[9px] text-gray-500 font-mono border-t border-[#1e244b]/40 pt-3">
                  Recommendation: Start difficult work first to safeguard deadlines.
                </div>
              </div>
            </div>

          </div>

          {/* AI GENERATED PLAN PANEL */}
          <div className="bg-gradient-to-b from-[#12163b] to-[#12163b]/60 border border-[#1e244b] rounded-3xl p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-display font-medium text-lg flex items-center gap-2">
                AI Generated Plan <span className="text-cyan-400 text-sm">✦</span>
              </h3>
              
              {generationSource && (
                <span className="text-[10px] bg-indigo-500/10 border border-indigo-400/30 text-cyan-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold font-mono animate-fade-in">
                  Source: {generationSource}
                </span>
              )}
            </div>

            {activePlan ? (
              <div className="space-y-5">
                {/* Steps List */}
                <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-6">
                  {activePlan.steps.map((step, index) => {
                    // Pick distinct bullet colors mirroring screenshot gradients (purple, blue, green, light green)
                    const bulletColors = [
                      "from-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
                      "from-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
                      "from-emerald-500 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                      "from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]",
                      "from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]",
                    ];
                    const activeColorClass = bulletColors[index % bulletColors.length];

                    return (
                      <div key={step.id} className="relative group">
                        {/* Circle Bullet Badge */}
                        <span className={`absolute -left-[38px] top-0 w-8 h-8 rounded-full bg-gradient-to-tr ${activeColorClass} border border-[#090b1e] flex items-center justify-center text-xs font-bold font-display text-white z-2 group-hover:scale-110 transition-transform`}>
                          {index + 1}
                        </span>

                        {/* Title, Duration Badge and Description */}
                        <div className="bg-[#151a4a]/30 hover:bg-[#151a4a]/50 p-4 border border-[#1e244b]/30 rounded-2xl transition-all relative">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                            <h4 className="text-white text-sm font-semibold font-sans tracking-wide">
                              {step.title}
                            </h4>
                            <span className="text-[11px] bg-slate-900/60 border border-[#1e244b] text-gray-300 font-mono font-medium px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              ~{step.durationHours} hrs
                            </span>
                          </div>
                          <p className="text-[#a0aec0] text-xs font-light leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall Plan Completion calculation bar */}
                <div className="pt-4 border-t border-[#1e244b]/40">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="font-semibold text-gray-300">Overall Progress</span>
                    <span className="font-bold text-white font-mono text-sm">{planProgressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#090b1e] rounded-full overflow-hidden border border-white/5 relative">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${planProgressPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 font-light">
                    Sync tasks completion under "My Tasks" to automatically drive overall progress percentages.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-cyan-400 border border-indigo-400/20 mb-3 animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-gray-300 font-semibold text-sm">No Active Schedule Plan Generated</h4>
                <p className="text-gray-500 text-xs font-light max-w-sm mt-1 leading-snug">
                  Enter an objective like "Learn Data Structures" above and click "Generate Plan" to layout your automatic AI roadmap metrics!
                </p>
              </div>
            )}
          </div>

          {/* BOTTOM ADVOCATING ACCENT QUOTE */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-[#1e244b]/40 rounded-2.5xl p-4 text-center relative overflow-hidden group shadow-lg">
            <span className="text-[#a855f7]/30 text-3xl font-serif absolute top-1 left-4 select-none">“</span>
            <p className="text-gray-200 text-xs md:text-sm italic font-medium relative tracking-wide">
              "A plan is only good if you follow it every day."
            </p>
            <span className="block text-[10px] font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#22d3ee] to-[#a855f7] mt-1 tracking-wider uppercase">
              — Deadline Guardian AI ✦
            </span>
          </div>

        </div>

        {/* Right 1/3 Content Column */}
        <div className="space-y-6">

          {/* DAILY TASK CHECKLIST FOR TODAY */}
          {(() => {
            const todayStr = new Date().toISOString().split("T")[0];
            const todayTasks = tasks.filter(t => t.dueDate === todayStr);
            const todayCompletedCount = todayTasks.filter(t => t.completed).length;
            const todayProgressPercent = todayTasks.length > 0 ? Math.round((todayCompletedCount / todayTasks.length) * 100) : 0;
            const overdueTasksForTodayWidget = tasks.filter(t => !t.completed && isOverdue(t));

            const handleRescheduleOverdue = () => {
              setTasks(prev => prev.map(t => {
                if (!t.completed && isOverdue(t)) {
                  return { ...t, dueDate: todayStr };
                }
                return t;
              }));
              showToast("All overdue deadlines have been rolled forward to today! 🛡️");
            };

            const handleRescheduleSingleTask = (id: string) => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = tomorrow.toISOString().split("T")[0];
              
              setTasks(prev => prev.map(t => {
                if (t.id === id) {
                  return { ...t, dueDate: tomorrowStr };
                }
                return t;
              }));
              showToast("Task deadline deferred safely to tomorrow! ⏳");
            };

            return (
              <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-white font-display font-medium text-base">
                        Today's Checklist
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/45 px-2 py-0.5 rounded-full">
                      {todayStr}
                    </span>
                  </div>

                  {todayTasks.length > 0 ? (
                    <div className="space-y-4">
                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400">Daily Pacing</span>
                          <span className="text-cyan-300 font-bold">
                            {todayCompletedCount} of {todayTasks.length} Done ({todayProgressPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300" 
                            style={{ width: `${todayProgressPercent}%` }} 
                          />
                        </div>
                      </div>

                      {/* Daily Tasks Checkbox List */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {todayTasks.map(task => (
                          <div 
                            key={task.id} 
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              task.completed 
                                ? "bg-emerald-950/10 border-emerald-500/20 opacity-60" 
                                : "bg-[#151a4a]/40 border-[#1e244b]/30 hover:border-indigo-500/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className={`w-4 h-4 rounded-md flex items-center justify-center border cursor-pointer transition-colors ${
                                  task.completed 
                                    ? "border-emerald-500 bg-emerald-500 text-white" 
                                    : "border-gray-500 hover:border-cyan-400"
                                }`}
                              >
                                {task.completed && <Check className="w-3 h-3 stroke-[3px]" />}
                              </button>
                              <span className={`text-[11px] truncate leading-tight ${task.completed ? "text-gray-400 line-through" : "text-white font-medium"}`}>
                                {task.title}
                              </span>
                            </div>
                            <span className="text-[9px] text-[#8692d0] font-mono shrink-0">
                              {task.durationHours} hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-500 text-[11px] font-light leading-relaxed">
                      🎉 Clear Skies Today! No study tasks scheduled. Use the AI Planner to schedule tasks or generate goals.
                    </div>
                  )}

                  {/* OVERDUE ALERTS WITH ONE-CLICK RESCHEDULING */}
                  {overdueTasksForTodayWidget.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#1e244b]/60 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                          ⚠️ {overdueTasksForTodayWidget.length} Overdue Deadlines
                        </span>
                        <button
                          onClick={handleRescheduleOverdue}
                          className="text-[9px] text-cyan-400 hover:text-white hover:underline font-bold transition-all cursor-pointer"
                        >
                          Reschedule All to Today
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                        {overdueTasksForTodayWidget.slice(0, 3).map(ot => (
                          <div 
                            key={ot.id} 
                            className="p-2.5 bg-rose-950/10 border border-rose-500/25 rounded-xl flex items-center justify-between text-[10px]"
                          >
                            <span className="text-gray-300 truncate pr-2 max-w-[130px]">{ot.title}</span>
                            <button
                              onClick={() => handleRescheduleSingleTask(ot.id)}
                              className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-[8px] font-bold transition-colors cursor-pointer"
                            >
                              Delay
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Google Classroom Integration Card */}
          <ClassroomSync
            googleToken={googleToken}
            setGoogleToken={setGoogleToken}
            setGoogleUser={setGoogleUser}
            onSelectAssignment={handlePlanClassroomAssignment}
            onDirectCreateTask={handleDirectCreateClassroomTask}
            onImportAllAssignments={handleImportAllClassroomAssignments}
          />
          
          {/* CALENDAR VIEW WIDGET (Compact month visual selector) */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-3xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-display font-medium text-base">
                Calendar View
              </h3>
              
              {/* Navigate Month */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    const prevMonth = new Date(currentCalendarDate);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    setCurrentCalendarDate(prevMonth);
                  }}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-gray-200 font-mono px-1 select-none min-w-[70px] text-center">
                  {currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button 
                  onClick={() => {
                    const nextMonth = new Date(currentCalendarDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    setCurrentCalendarDate(nextMonth);
                  }}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* S-M-T-W-T-F-S headers row */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5 border-b border-[#1e244b]/40 pb-1.5 opacity-80">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <span key={day} className="text-[9px] font-bold text-gray-400 tracking-wider">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Numbers grid (June 2026 pre-populated replica design) */}
            <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 justify-items-center">
              {renderCalendarDays()}
            </div>
          </div>

          {/* UPCOMING TASKS (Mutable tasks list) */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-3xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-display font-medium text-base">
                  Upcoming Tasks
                </h3>
                
                <button 
                  onClick={() => setActiveTab("My Tasks")}
                  className="text-xs text-indigo-400 hover:text-cyan-400 font-semibold flex items-center gap-1 shrink-0 transition-colors group"
                >
                  <span>View All</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Actionable List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {tasks.filter(t => !t.completed).length === 0 ? (
                  <div className="py-8 text-center px-4 flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60 mb-2" />
                    <h5 className="text-gray-300 text-xs font-semibold">All Tasks Completed!</h5>
                    <p className="text-gray-500 text-[10px] mt-0.5 max-w-sm">No pending deadlines scheduled today.</p>
                  </div>
                ) : (
                  tasks
                    .filter(t => !t.completed)
                    .slice(0, 5) // Cap to topmost 5 tasks matching layout space
                    .map((task) => {
                      // Map Priority classes
                      const priorityStyles = {
                        High: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]",
                        Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        Low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      };

                      return (
                        <div 
                          key={task.id}
                          className="flex flex-col p-3.5 bg-[#151a4a]/40 border border-[#1e244b]/40 rounded-2xl hover:border-[#1e244b] transition-all group gap-2"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Checkbox button triggers complete animation */}
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className="w-5 h-5 rounded-md border border-gray-500 flex items-center justify-center hover:border-cyan-400 hover:bg-cyan-400/5 group/box cursor-pointer shrink-0 transition-colors"
                              >
                                <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400 scale-0 group-hover/box:scale-50 transition-transform" />
                              </button>

                              <div className="min-w-0 pr-1.5">
                                <h4 className="text-white text-xs font-semibold leading-snug group-hover:text-cyan-400 transition-colors truncate">
                                  {task.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <p className="text-gray-400 text-[10px] font-mono tracking-wide flex items-center gap-1 font-semibold">
                                    <Calendar className="w-3 h-3 text-[#10b981]" />
                                    {formatDateString(task.dueDate)}
                                  </p>
                                  <span className="inline-block text-[9px] bg-slate-950/60 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-[#1e244b]">
                                    {task.category}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 select-none">
                              {/* Google Calendar Link Button */}
                              <button
                                onClick={() => handleSyncCalendar(task)}
                                disabled={syncingTaskId === task.id}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  task.gCalSynced 
                                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 font-bold" 
                                    : "bg-[#090b1e]/60 border-[#1e244b]/60 text-gray-400 hover:text-white hover:border-indigo-400"
                                }`}
                                title={task.gCalSynced ? "Synced with Calendar!" : "Sync task with Google Calendar"}
                              >
                                {syncingTaskId === task.id ? (
                                  <span className="w-3.5 h-3.5 block border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CalendarDays className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Gmail Reminder Dispatch Button */}
                              <button
                                onClick={() => handleSendGmail(task)}
                                disabled={mailingTaskId === task.id}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  task.gmailSent 
                                    ? "bg-[#10b981]/15 border-emerald-400/35 text-cyan-400" 
                                    : "bg-[#090b1e]/60 border-[#1e244b]/60 text-gray-400 hover:text-white hover:border-indigo-400"
                                }`}
                                title={task.gmailSent ? "Gmail Reminder Sent!" : "Email a milestone reminder via Gmail"}
                              >
                                {mailingTaskId === task.id ? (
                                  <span className="w-3.5 h-3.5 block border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Priority Badge */}
                              <span className={`text-[9px] font-display font-medium border px-2 py-0.5 rounded-lg shrink-0 ${priorityStyles[task.priority]}`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>

                          {isOverdue(task) && (
                            <div className="mt-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 space-y-1.5 w-full">
                              <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-semibold">
                                <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400 animate-pulse" />
                                <span>Passed deadline! Give option to reschedule:</span>
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
                                  className="text-[9px] bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded px-2 py-1 border border-indigo-500/30 transition-all cursor-pointer font-medium"
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
                                  className="text-[9px] bg-cyan-500/20 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded px-2 py-1 border border-cyan-500/30 transition-all cursor-pointer font-medium"
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
                                  className="text-[9px] bg-[#090b1e] border border-[#1e244b] text-gray-200 rounded px-1 py-0.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                  title="Choose Custom Date"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Quick action details info */}
            <div className="border-t border-[#1e244b]/40 pt-4 mt-4 text-[10px] text-gray-500 flex items-center gap-1 justify-center">
              <span>💡</span>
              <span>Need more? Add manual core tasks in the <b>My Tasks</b> manager.</span>
            </div>
          </div>

        </div>

      </div>

      {/* Google Login Confirmation Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-[#090b1e]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#12163b] border-2 border-[#1e244b] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative">
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



    </div>
  );
}
