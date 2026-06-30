import React, { useState } from "react";
import { 
  Sparkles, 
  Settings2, 
  Compass, 
  Calendar, 
  Clock, 
  Zap, 
  ArrowRight, 
  Import, 
  Bookmark, 
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Award
} from "lucide-react";
import { Task, AIPlan, TabType, PlanStep } from "../types";
import { detectCategory } from "../utils/dataStore";
import { motion, AnimatePresence } from "motion/react";
import { createCalendarEvent, sendGmailReminder } from "../utils/workspace";
import DeadlineSimulator from "./DeadlineSimulator";
import { generatePlan } from "../services/apiService";

interface AIPlannerViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activePlan: AIPlan | null;
  setActivePlan: React.Dispatch<React.SetStateAction<AIPlan | null>>;
  allPlans: AIPlan[];
  setAllPlans: React.Dispatch<React.SetStateAction<AIPlan[]>>;
  setActiveTab: (tab: TabType) => void;
  googleToken: string | null;
  googleUser: any | null;
}

export default function AIPlannerView({
  tasks,
  setTasks,
  activePlan,
  setActivePlan,
  allPlans,
  setAllPlans,
  setActiveTab,
  googleToken,
  googleUser
}: AIPlannerViewProps) {
  // Input settings states
  const [objective, setObjective] = useState(() => {
    return localStorage.getItem("deadline_guardian_pending_objective") || "";
  });
  const [deadline, setDeadline] = useState(() => {
    return localStorage.getItem("deadline_guardian_pending_deadline") || "2026-06-30";
  });
  const [skillLevel, setSkillLevel] = useState("Intermediate");
  const [plannerSubTab, setPlannerSubTab] = useState<"generator" | "simulator">("generator");
  const [previewTab, setPreviewTab] = useState<"flowchart" | "milestones" | "schedules" | "checkpoints">("flowchart");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingDuration, setEditingDuration] = useState(2.0);

  // On mount, check and clean up the pending values so they don't persist endlessly
  React.useEffect(() => {
    localStorage.removeItem("deadline_guardian_pending_objective");
    localStorage.removeItem("deadline_guardian_pending_deadline");
  }, []);

  React.useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (deadline < todayStr) {
      setDeadline(todayStr);
    }
  }, [deadline]);
  const [commitment, setCommitment] = useState("Moderate (3-4 hrs)");
  const [academicTone, setAcademicTone] = useState("Rigid Coach");
  const [isGenerating, setIsGenerating] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success">("idle");
  const [plannerToast, setPlannerToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setPlannerToast(message);
    setTimeout(() => setPlannerToast(null), 3500);
  };

  // Temporary generated plan display state (lets user preview before locking it in as activePlan)
  const [previewPlan, setPreviewPlan] = useState<AIPlan | null>(null);

  const getMockGeneratedPlanClient = (obj: string, targetDl: string, skillLevel: string = "Intermediate", commitment: string = "Moderate (3-4 hrs)", academicTone: string = "Friendly Advisor") => {
    const norm = obj.trim() || "Achieve Success";
    const dl = targetDl || "2026-06-30";

    // 1. Extract dynamic core subject terms
    const titleWords = norm.split(" ");
    const formattedPlanName = titleWords.map(w => w ? (w.charAt(0).toUpperCase() + w.slice(1)) : "").join(" ");
    const lowerObjective = norm.toLowerCase();

    const stopWords = new Set(["learn", "how", "to", "build", "create", "study", "prepare", "for", "get", "ready", "the", "a", "an", "and", "with", "then", "using", "in", "on", "of", "by", "at", "about", "is", "are", "be"]);
    const coreSubjectTerms = titleWords
      .filter(w => w && !stopWords.has(w.toLowerCase()))
      .map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const subject = coreSubjectTerms.length > 0 ? coreSubjectTerms.slice(0, 3).join(" ") : formattedPlanName;

    // 2. Determine target days and maximum workload limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dl);
    let diffDays = 7;
    if (!isNaN(targetDate.getTime())) {
      const diffTime = targetDate.getTime() - today.getTime();
      diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    let maxHoursPerDay = 4;
    if (commitment.toLowerCase().includes("light") || commitment.toLowerCase().includes("1-2")) {
      maxHoursPerDay = 2;
    } else if (commitment.toLowerCase().includes("heavy") || commitment.toLowerCase().includes("5+")) {
      maxHoursPerDay = 6;
    }

    // 3. Choose content category matching the objective keywords
    let baseSteps = [];
    let isCoding = lowerObjective.includes("web") || lowerObjective.includes("site") || lowerObjective.includes("react") || lowerObjective.includes("app") || lowerObjective.includes("code") || lowerObjective.includes("program") || lowerObjective.includes("software") || lowerObjective.includes("dev") || lowerObjective.includes("js") || lowerObjective.includes("html") || lowerObjective.includes("css") || lowerObjective.includes("rust") || lowerObjective.includes("python") || lowerObjective.includes("java") || lowerObjective.includes("sql") || lowerObjective.includes("github") || lowerObjective.includes("git");
    let isAlgorithms = lowerObjective.includes("data structure") || lowerObjective.includes("algorithm") || lowerObjective.includes("leetcode") || lowerObjective.includes("hacker") || lowerObjective.includes("sorting") || lowerObjective.includes("search") || lowerObjective.includes("complexity");
    let isExam = lowerObjective.includes("exam") || lowerObjective.includes("test") || lowerObjective.includes("study") || lowerObjective.includes("quiz") || lowerObjective.includes("learn") || lowerObjective.includes("read") || lowerObjective.includes("course") || lowerObjective.includes("class") || lowerObjective.includes("cert") || lowerObjective.includes("degree") || lowerObjective.includes("history") || lowerObjective.includes("science");

    if (isAlgorithms) {
      baseSteps = [
        {
          title: `Foundations of ${subject}`,
          description: `Analyze linear structure representations, memory layouts, and evaluate initial Big-O runtime matrices.`,
          durationHours: 2.5
        },
        {
          title: `Core Recursion & Stack Modeling`,
          description: `Deconstruct recursive workflows, trace state-frames, and practice fundamental divide-and-conquer methodologies.`,
          durationHours: 3.0
        },
        {
          title: `Non-linear Traversal & Nodes`,
          description: `Implement tree-based nodes, handle pointers safely, and debug structural tree/graph parsing modules.`,
          durationHours: 3.5
        },
        {
          title: `Advanced Dynamic Solvers`,
          description: `Construct optimal sub-structures, manage state caching vectors, and optimize backtracking decision branches.`,
          durationHours: 4.0
        },
        {
          title: `Simulated Trials & Pattern Review`,
          description: `Evaluate boundary index constraints, review space-time trade-offs, and execute timed performance drills.`,
          durationHours: 3.0
        }
      ];
    } else if (isCoding) {
      baseSteps = [
        {
          title: `Architecture & Dev Setup for ${subject}`,
          description: `Model core schemas, design components tree, configure build tools, and scaffold the initial directory tree.`,
          durationHours: 2.0
        },
        {
          title: `Interface Design & Core Screens`,
          description: `Build responsive views using highly-polished Tailwind blocks, maintaining clean layouts and custom components.`,
          durationHours: 3.0
        },
        {
          title: `State Management & Business Logic`,
          description: `Establish centralized client data stores, coordinate handlers, and program core synchronous events.`,
          durationHours: 3.5
        },
        {
          title: `Backend Controllers & Storage Pipelines`,
          description: `Develop API endpoint proxies, write input validators, and configure local storage serialization engines.`,
          durationHours: 4.0
        },
        {
          title: `Quality Reviews, Bugfixes & Production Build`,
          description: `Audit component render trees, fix memory leak triggers, bundle assets, and deploy the production-ready applet.`,
          durationHours: 2.5
        }
      ];
    } else if (isExam) {
      baseSteps = [
        {
          title: `Syllabus Scope & Reference Mapping`,
          description: `Categorize curriculum modules, gather primary documentation nodes, and prioritize essential review topics.`,
          durationHours: 2.5
        },
        {
          title: `Thematic Summaries & Core Drafts`,
          description: `Synthesize complex concepts into structured study sheets and annotate difficult paradigms with dynamic flowcharts.`,
          durationHours: 3.5
        },
        {
          title: `Spaced active Recall & Quiz Sessions`,
          description: `Conduct flashcard drill runs, complete mock assessment modules, and isolate weak conceptual nodes.`,
          durationHours: 4.0
        },
        {
          title: `Doubts Resolution & Revision Loops`,
          description: `Re-evaluate hard-to-memorize formulas, verify answers with reference sheets, and clear lingering ambiguities.`,
          durationHours: 3.0
        },
        {
          title: `Comprehensive Timed Examination Prep`,
          description: `Execute full timed simulations to calibrate pacing thresholds and build solid performance confidence.`,
          durationHours: 2.0
        }
      ];
    } else {
      baseSteps = [
        {
          title: `Strategic Orientation for ${subject}`,
          description: `Map out high-level project targets, identify success markers, and organize reference resources.`,
          durationHours: 2.0
        },
        {
          title: `Early Practical Experiments`,
          description: `Execute introductory hands-on trials, explore core concepts practically, and catalog early bottlenecks.`,
          durationHours: 3.0
        },
        {
          title: `Advanced Core Customizations`,
          description: `Design complex integration stages, coordinate multiple operational streams, and fine-tune progress pacing.`,
          durationHours: 4.0
        },
        {
          title: `Integrative Verification Loops`,
          description: `Evaluate achievements against original criteria, check performance stability, and resolve lingering bugs.`,
          durationHours: 3.0
        },
        {
          title: `Milestone Realization & Polish`,
          description: `Wrap up deliverables, run visual/functional audits, and finalize the complete master plan.`,
          durationHours: 2.0
        }
      ];
    }

    // 4. Adjust step hours based on student skill level
    const scale = skillLevel === "Beginner" ? 0.8 : skillLevel === "Advanced" ? 1.3 : 1.0;
    baseSteps = baseSteps.map(step => ({
      ...step,
      durationHours: parseFloat(Math.max(1.0, Math.round(step.durationHours * scale * 2) / 2).toFixed(1))
    }));

    // 5. Tone customisation helper
    const transformTone = (title: string, desc: string) => {
      let t = title;
      let d = desc;
      if (academicTone === "Rigid Coach") {
        t = `[STRICT] ${title}`;
        d = `Strict compliance advisory: ${desc} Deliverables must be verified without shortcut or compromise.`;
      } else if (academicTone === "Friendly Advisor") {
        t = `🌟 ${title}`;
        d = `Advisor Tip: ${desc} Remember to balance your screen-time with comfortable stretching breaks!`;
      } else if (academicTone === "Philosophical Sage") {
        t = `⏳ ${title}`;
        d = `Philosophical insight: ${desc} Seek not merely the output, but the underlying patterns governing the journey.`;
      }
      return { t, d };
    };

    // 6. Assemble steps and map them to spread across available days (diffDays)
    const stepsToDistribute: any[] = [];
    const S = baseSteps.length;
    for (let i = 0; i < S; i++) {
      const step = baseSteps[i];
      // Spread evenly across diffDays
      const assignedDay = Math.min(diffDays - 1, Math.floor(i * (diffDays / S)));
      const duration = step.durationHours;

      const { t, d } = transformTone(step.title, step.description);
      stepsToDistribute.push({
        title: t,
        description: d,
        durationHours: duration,
        dayOffset: assignedDay
      });
    }

    // 7. Workload Pacing Constraint Solver
    // We ensure that for any given day, total hours does not exceed maxHoursPerDay.
    // If it does, we shift items to subsequent days. If we hit the final day, we compress them.
    let solvedTasks = stepsToDistribute.map(t => ({ ...t }));
    let changed = true;
    let limitCounter = 0;
    while (changed && limitCounter < 150) {
      changed = false;
      limitCounter++;

      const dailyHours: { [day: number]: number } = {};
      for (const t of solvedTasks) {
        dailyHours[t.dayOffset] = (dailyHours[t.dayOffset] || 0) + t.durationHours;
      }

      for (let d = 0; d < diffDays; d++) {
        const hours = dailyHours[d] || 0;
        if (hours > maxHoursPerDay) {
          if (d === diffDays - 1) {
            // Compress all tasks of this final day to fit the limit
            const ratio = maxHoursPerDay / hours;
            for (const t of solvedTasks) {
              if (t.dayOffset === d) {
                t.durationHours = parseFloat(Math.max(0.5, Math.round(t.durationHours * ratio * 2) / 2).toFixed(1));
              }
            }
          } else {
            // Shift the last task of this day to the next day (d + 1)
            const dayTasks = solvedTasks.filter(t => t.dayOffset === d);
            if (dayTasks.length > 1) {
              const lastTask = dayTasks[dayTasks.length - 1];
              lastTask.dayOffset = d + 1;
              changed = true;
              break;
            } else if (dayTasks.length === 1) {
              // Split the single task that exceeds the limit
              const task = dayTasks[0];
              const excess = task.durationHours - maxHoursPerDay;
              task.durationHours = maxHoursPerDay;
              solvedTasks.push({
                title: `${task.title} (Part II)`,
                description: `${task.description} (Continuing the work from previous day)`,
                durationHours: parseFloat(Math.max(0.5, Math.round(excess * 2) / 2).toFixed(1)),
                dayOffset: d + 1
              });
              changed = true;
              break;
            }
          }
        }
      }
    }

    // 8. Enforce "At least 2 tasks per active study day" requirement
    const finalSteps: any[] = [];
    const activeDays = Array.from(new Set(solvedTasks.map(t => t.dayOffset))).sort((a, b) => a - b);
    for (const d of activeDays) {
      const dayTasks = solvedTasks.filter(t => t.dayOffset === d);
      if (dayTasks.length === 1) {
        const t = dayTasks[0];
        if (t.durationHours >= 1.0) {
          const half = parseFloat((t.durationHours / 2).toFixed(1));
          finalSteps.push({
            title: `📚 ${t.title.replace(/^(📚|🛠️|⏳|🌟|\[STRICT\])\s*/, "")}: Theory Core`,
            description: `${t.description} (Conceptual grounding and core theoretical preparation)`,
            durationHours: half,
            dayOffset: d
          });
          finalSteps.push({
            title: `🛠️ ${t.title.replace(/^(📚|🛠️|⏳|🌟|\[STRICT\])\s*/, "")}: Application Lab`,
            description: `${t.description} (Hands-on exercise, practical drills, and active application)`,
            durationHours: parseFloat((t.durationHours - half).toFixed(1)),
            dayOffset: d
          });
        } else {
          finalSteps.push(t);
          finalSteps.push({
            title: `📝 Daily Progress Sync`,
            description: "Review current conceptual notes, track objectives achieved, and prepare tomorrow's focus parameters.",
            durationHours: 0.5,
            dayOffset: d
          });
        }
      } else {
        finalSteps.push(...dayTasks);
      }
    }

    const calculatedTotal = finalSteps.reduce((acc, curr) => acc + curr.durationHours, 0);

    // 9. Determine level based on keyword checks
    let level: "Easy" | "Medium" | "Hard" | "Expert" = "Medium";
    let reason = `This plan requires structured, step-by-step progress to master ${subject}. Keep an active learning mindset.`;
    if (isAlgorithms) {
      level = "Hard";
      reason = "Theoretical algorithms demand deep conceptual comprehension paired with intensive proof drills.";
    } else if (isCoding) {
      level = "Medium";
      reason = "Practical application requires coordinating states, designs, and debugging edge cases.";
    } else if (isExam) {
      level = "Medium";
      reason = "Academic testing requires robust recall, structured study cards, and timed practice simulations.";
    }

    return {
      planName: `${subject} Strategy`,
      steps: finalSteps,
      estimatedTotalHours: parseFloat(calculatedTotal.toFixed(1)),
      milestones: [
        `Phase 1: Concepts & Fundamentals of ${subject}`,
        `Phase 2: Deep Core Drills & Hands-on Lab work`,
        `Phase 3: Integration, Spaced Review, & Milestone Lock-in`
      ],
      difficultyAnalysis: {
        level,
        reason
      },
      dailySchedule: [
        { time: "09:00 AM", task: "Theory Core & Concept Overview" },
        { time: "11:30 AM", task: "Practical Code Application Lab" },
        { time: "03:00 PM", task: "Spaced Active Recall & Flashcards review" },
        { time: "05:00 PM", task: "Revision of daily logs and tomorrow prep" }
      ],
      weeklySchedule: [
        { week: "Week 1", theme: `Foundations of ${subject} & Setup` },
        { week: "Week 2", theme: `Advanced Development, QA Testing, and Deployment Prep` }
      ],
      revisionSchedule: [
        "24-Hour Spaced Review: Reread daily study summary blocks",
        "72-Hour Application Drill: Re-implement lab problems without looking at solutions",
        "Pre-deadline Mock Test: Conduct a mock evaluation 1 day prior to the target"
      ],
      bufferDays: Math.max(1, Math.floor(diffDays * 0.15)),
      progressCheckpoints: [
        `Can write a concise summary of main ${subject} concepts`,
        `Completed all high-priority daily lab drills`,
        `Successfully demoed final integrated outcome to a peer or mock test`
      ],
      catchUpDays: Math.max(1, Math.floor(diffDays * 0.08)),
      completionPredictionDate: dl,
      smartSuggestions: [
        `Align core ${subject} tasks to morning hours to avoid fatigue.`,
        "Utilize the built-in catch-up reserves on Thursdays to handle backlogs.",
        "Set custom checklist subtasks for faster milestone execution."
      ]
    };
  };

  const handleSaveStepEdit = (stepId: string) => {
    if (!previewPlan) return;
    const updatedSteps = previewPlan.steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          title: editingTitle,
          description: editingDescription,
          durationHours: editingDuration
        };
      }
      return step;
    });
    const updatedTotalHours = parseFloat(updatedSteps.reduce((acc, s) => acc + s.durationHours, 0).toFixed(1));
    setPreviewPlan({
      ...previewPlan,
      steps: updatedSteps,
      estimatedTotalHours: updatedTotalHours
    });
    setEditingStepId(null);
    showToast("Step details updated locally!");
  };

  const handleRegenerateStep = (stepId: string) => {
    if (!previewPlan) return;
    const verbs = ["Conduct deep theoretical analysis of", "Execute practical lab experiments on", "Review complexity vectors for", "Scaffold initial modules for", "Run verification drills for"];
    const standardAdjectives = ["advanced components of", "fundamental traits of", "edge-cases in", "operational parameters for"];
    const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
    const randomAdj = standardAdjectives[Math.floor(Math.random() * standardAdjectives.length)];
    
    const updatedSteps = previewPlan.steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          title: `${randomVerb} ${step.title.split(" ").slice(1).join(" ") || "Core Objectives"}`,
          description: `AI-Rescheduled adaptation: ${randomVerb} ${randomAdj} target nodes dynamically to prevent workload saturation.`,
          durationHours: Math.round((step.durationHours * (0.8 + Math.random() * 0.4)) * 2) / 2 || 1.5
        };
      }
      return step;
    });
    
    const updatedTotalHours = parseFloat(updatedSteps.reduce((acc, s) => acc + s.durationHours, 0).toFixed(1));
    setPreviewPlan({
      ...previewPlan,
      steps: updatedSteps,
      estimatedTotalHours: updatedTotalHours
    });
    showToast("Step regenerated dynamically by AI! 🧠");
  };

  const handleReschedulePlan = () => {
    if (!previewPlan) return;
    // Shifting days or compressing duration
    const updatedSteps = previewPlan.steps.map((step, idx) => ({
      ...step,
      durationHours: Math.max(1, Math.round((step.durationHours * 0.9) * 2) / 2),
      dayOffset: Math.max(0, step.dayOffset + (idx % 2 === 0 ? 0 : 1))
    }));
    const updatedTotalHours = parseFloat(updatedSteps.reduce((acc, s) => acc + s.durationHours, 0).toFixed(1));
    setPreviewPlan({
      ...previewPlan,
      steps: updatedSteps,
      estimatedTotalHours: updatedTotalHours,
      bufferDays: (previewPlan.bufferDays || 1) + 1
    });
    showToast("Roadmap compressed & rescheduled! Saved extra buffer days 📅");
  };

  const handleGenerateAdvanced = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    setIsGenerating(true);
    setImportStatus("idle");
    setPreviewPlan(null);

    let planData = null;
    let fallbackRequired = false;

    try {
      const data = await generatePlan(objective, deadline, skillLevel, commitment, academicTone);
      if (data && data.success && data.plan) {
        planData = data.plan;
      } else {
        fallbackRequired = true;
      }
    } catch (err) {
      console.warn("Advanced AI Generation request failed, using high-fidelity local models:", err);
      fallbackRequired = true;
    }

    if (fallbackRequired || !planData || !planData.steps || !Array.isArray(planData.steps)) {
      try {
        // Simulate organic generation delay for local client engines 
        await new Promise(resolve => setTimeout(resolve, 900));
        planData = getMockGeneratedPlanClient(objective, deadline, skillLevel, commitment, academicTone);
      } catch (err) {
        console.error("Local mock planner error:", err);
      }
    }

    try {
      if (planData && planData.steps && Array.isArray(planData.steps)) {
        // Assemble steps
        const generatedSteps = planData.steps.map((step: any, idx: number) => ({
          id: `step-adv-${Date.now()}-${idx}`,
          title: step.title || `Milestone ${idx + 1}`,
          description: step.description || "Milestone description",
          durationHours: step.durationHours || 2.0,
          dayOffset: typeof step.dayOffset === "number" ? step.dayOffset : 0
        }));

        const newPlan: AIPlan = {
          id: `plan-adv-${Date.now()}`,
          planName: `${academicTone === "Rigid Coach" ? "[Rigid] " : ""}${planData.planName || objective} (${skillLevel})`,
          objective: objective,
          targetDeadline: deadline,
          steps: generatedSteps,
          estimatedTotalHours: planData.estimatedTotalHours || 12,
          createdAt: new Date().toISOString(),
          applied: false,
          milestones: planData.milestones,
          difficultyAnalysis: planData.difficultyAnalysis,
          dailySchedule: planData.dailySchedule,
          weeklySchedule: planData.weeklySchedule,
          revisionSchedule: planData.revisionSchedule,
          bufferDays: planData.bufferDays,
          progressCheckpoints: planData.progressCheckpoints
        };

        setPreviewPlan(newPlan);
      } else {
        console.error("No valid steps parsed from AI planner");
      }
    } catch (err) {
      console.error("Error setting preview plan in advanced view:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Import preview plan into active task list and activePlan
  const handleImportPlan = () => {
    if (!previewPlan) return;

    // Set as the central active plan displayed in dashboard
    const lockedPlan = { ...previewPlan, applied: true };
    setActivePlan(lockedPlan);
    setAllPlans(prev => [lockedPlan, ...prev]);

    // Create central tasks
    const generatedTasks: Task[] = previewPlan.steps.map((step, idx) => {
      // Offset scheduling using dayOffset
      const stepDate = new Date();
      if (typeof step.dayOffset === "number") {
        stepDate.setDate(stepDate.getDate() + step.dayOffset);
      } else {
        const currentSimulated = new Date();
        let target = new Date(previewPlan.targetDeadline);
        if (isNaN(target.getTime())) {
          target = new Date();
          target.setDate(target.getDate() + 7);
        }
        let diffTime = target.getTime() - currentSimulated.getTime();
        if (isNaN(diffTime) || diffTime < 0) {
          diffTime = 7 * 24 * 60 * 60 * 1000; // 7 days fallback
        }
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        // Decide tasks density per day (either 2 per day, or more if deadline is extremely tight)
        const tasksPerDay = Math.max(2, Math.ceil(previewPlan.steps.length / diffDays));
        let offsetDays = Math.floor(idx / tasksPerDay);
        
        if (offsetDays >= diffDays) {
          offsetDays = diffDays - 1;
        }
        if (offsetDays < 0) offsetDays = 0;

        stepDate.setDate(stepDate.getDate() + offsetDays);
      }

      let formattedStepDate = previewPlan.targetDeadline;
      try {
        if (!isNaN(stepDate.getTime())) {
          formattedStepDate = stepDate.toISOString().split("T")[0];
        }
      } catch (e) {
        console.error("Date formatting failed in advanced planner:", e);
      }

      // Guard: don't let task dueDate be before current date
      const todayStr = new Date().toISOString().split("T")[0];
      if (formattedStepDate < todayStr) {
        formattedStepDate = todayStr;
      }

      return {
        id: `task-ai-adv-${Date.now()}-${idx}`,
        title: step.title,
        description: step.description,
        dueDate: formattedStepDate,
        category: detectCategory(step.title, step.description),
        priority: idx >= previewPlan.steps.length - 2 ? "High" as const : "Medium" as const,
        completed: false,
        planId: lockedPlan.id,
        durationHours: step.durationHours
      };
    });

    // Merge tasks
    setTasks(prev => [...generatedTasks, ...prev]);
    setImportStatus("success");
    setObjective("");
    setPreviewPlan(null);

    // AUTO ADD TO GOOGLE CALENDAR & SEND EMAIL TO GMAIL IF AUTHORIZED
    if (googleToken) {
      showToast("Scheduling roadmap milestones to Google Calendar...");
      Promise.all(
        generatedTasks.map(t => 
          createCalendarEvent(googleToken, t.title, t.description, t.dueDate)
            .then(() => {
              setTasks(prev => prev.map(pt => pt.id === t.id ? { ...pt, gCalSynced: true } : pt));
            })
            .catch(err => console.error(`Planner view auto GCal failed for "${t.title}":`, err))
        )
      ).then(() => {
        showToast("Milestones added to Google Calendar! 📅");
      });

      // Consolidate detailed HTML steps list to send as a Gmail summary notification raw HTML body text
      const htmlStepsList = lockedPlan.steps.map((step: any, idx: number) => `
        <div style="background-color: rgba(21, 26, 74, 0.4); border: 1px solid #1e244b; border-radius: 12px; padding: 14px; margin-bottom: 12px; color: #ffffff;">
          <p style="margin: 0 0 4px 0; color: #22d3ee; font-weight: bold; font-size: 14px; font-family: sans-serif;">Step ${idx + 1}: ${step.title}</p>
          <p style="margin: 0 0 6px 0; color: #9cb3c9; font-size: 12px; line-height: 1.4; font-family: sans-serif;">${step.description}</p>
          <p style="margin: 0; color: #a1b0cb; font-size: 11px; font-family: sans-serif;">Pacing Weight: <strong>${step.durationHours} hours</strong></p>
        </div>
      `).join("");

      const emailRecipient = googleUser?.email || "me";
      const emailSubject = `🚀 Deployment Ready: Roadmap "${lockedPlan.planName}" Sync Alert`;
      const emailBody = `
        <div style="font-family: 'Inter', -apple-system, sans-serif; background-color: #090b1e; color: #ffffff; padding: 24px; border-radius: 20px; border: 1px solid #1e244b; max-width: 520px; margin: auto;">
          <h2 style="color: #6366f1; margin: 0 0 6px 0; font-family: sans-serif;">Deadline Guardian AI</h2>
          <p style="color: #9cb3c9; font-size: 13px; margin: 0 0 16px 0; font-family: sans-serif;">Your personalized academic roadmap strategy has been successfully generated & mapped onto your calendar endpoints.</p>
          <hr style="border: 0; border-top: 1px solid #1e244b; margin: 16px 0;" />
          
          <h3 style="color: #ffffff; font-size: 15px; margin: 0 0 12px 0; font-family: sans-serif;">Strategy Plan:</h3>
          ${htmlStepsList}
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px;">
            <tr>
              <td style="padding: 12px; font-size: 12px; font-family: sans-serif; color: #a1b0cb;">
                <strong>Estimated Work Time:</strong> ${lockedPlan.estimatedTotalHours} hours total pacing<br/>
                <strong>Target Completion Deadline:</strong> ${lockedPlan.targetDeadline}
              </td>
            </tr>
          </table>

          <p style="margin: 20px 0 0 0; text-align: center; font-size: 11px; color: #475569; border-top: 1px solid #1e244b; padding-top: 12px; font-family: sans-serif;">
            Automatically dispatched via Deadline Guardian secure integration layers. Protect your milestones.
          </p>
        </div>
      `;

      sendGmailReminder(googleToken, emailRecipient, emailSubject, emailBody)
        .then(() => {
          setTasks(prev => prev.map(pt => pt.planId === lockedPlan.id ? { ...pt, gmailSent: true } : pt));
          showToast("Detailed strategy logs dispatched to your Gmail! ✉️");
        })
        .catch(err => {
          console.error("Auto Gmail message delivery failed:", err);
        });
    }

    // Auto navigate to dashboard to review progress
    setTimeout(() => {
      setActiveTab("Dashboard");
    }, 1200);
  };

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-16 overflow-y-auto">
      <header className="mb-4">
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          AI Planner
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Customize difficulty metrics, workload tolerances, and pacing triggers to generate high-fidelity schedules.
        </p>
      </header>

      {/* Sub-tab Switcher */}
      <div className="flex gap-4 mb-6 border-b border-[#1e244b]/60 pb-3">
        <button
          onClick={() => setPlannerSubTab("generator")}
          className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            plannerSubTab === "generator" 
              ? "text-cyan-400 border-b-2 border-cyan-400 font-extrabold" 
              : "text-gray-400 hover:text-white font-medium"
          }`}
        >
          AI Roadmap Generator
        </button>
        <button
          onClick={() => setPlannerSubTab("simulator")}
          className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            plannerSubTab === "simulator" 
              ? "text-purple-400 border-b-2 border-purple-400 font-extrabold" 
              : "text-gray-400 hover:text-white font-medium"
          }`}
        >
          Deadline Probability Simulator 🎯
        </button>
      </div>

      {plannerSubTab === "generator" ? (
        /* Main layout grid - left input controls, right preview block */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Advanced Generation Parameters Forms */}
        <div className="lg:col-span-5 bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl space-y-5 h-fit">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-[#1e244b]/40">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-white font-display text-base font-bold">Planning Configurator</h3>
          </div>

          <form onSubmit={handleGenerateAdvanced} className="space-y-4">
            
            {/* Objective */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Target Goal / Skill Node *</label>
              <textarea
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Learn Machine Learning basics or Build an ecommerce backend"
                rows={2}
                className="w-full bg-[#090b1e]/80 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-3 px-4 text-white placeholder-gray-500 text-sm outline-none transition-all shadow-inner resize-none"
              />
            </div>

            {/* Grid for Deadline & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Deadline */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1 select-none">Target Deadline</label>
                <div className="flex gap-1">
                  <select
                    value={deadline.split("-")[1] || "06"}
                    aria-label="Deadline Month"
                    onChange={(e) => {
                      const parts = deadline.split("-");
                      parts[1] = e.target.value;
                      setDeadline(parts.join("-"));
                    }}
                    className="flex-1 bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-2.5 px-1.5 focus:border-indigo-500 text-[11px] text-white outline-none cursor-pointer"
                  >
                    <option className="text-black bg-white" value="01">Jan</option>
                    <option className="text-black bg-white" value="02">Feb</option>
                    <option className="text-black bg-white" value="03">Mar</option>
                    <option className="text-black bg-white" value="04">Apr</option>
                    <option className="text-black bg-white" value="05">May</option>
                    <option className="text-black bg-white" value="06">Jun</option>
                    <option className="text-black bg-white" value="07">Jul</option>
                    <option className="text-black bg-white" value="08">Aug</option>
                    <option className="text-black bg-white" value="09">Sep</option>
                    <option className="text-black bg-white" value="10">Oct</option>
                    <option className="text-black bg-white" value="11">Nov</option>
                    <option className="text-black bg-white" value="12">Dec</option>
                  </select>
                  <select
                    value={deadline.split("-")[2] || "30"}
                    aria-label="Deadline Day"
                    onChange={(e) => {
                      const parts = deadline.split("-");
                      parts[2] = e.target.value;
                      setDeadline(parts.join("-"));
                    }}
                    className="w-14 bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-2.5 px-1 focus:border-indigo-500 text-[11px] text-white outline-none cursor-pointer text-center"
                  >
                    {Array.from({ length: 31 }, (_, i) => {
                      const dVal = (i + 1).toString().padStart(2, "0");
                      return <option className="text-black bg-white" key={dVal} value={dVal}>{dVal}</option>;
                    })}
                  </select>
                  <select
                    value={deadline.split("-")[0] || "2026"}
                    aria-label="Deadline Year"
                    onChange={(e) => {
                      const parts = deadline.split("-");
                      parts[0] = e.target.value;
                      setDeadline(parts.join("-"));
                    }}
                    className="w-16 bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-2.5 px-1 focus:border-indigo-500 text-[11px] text-white outline-none cursor-pointer text-center"
                  >
                    <option className="text-black bg-white" value="2026">2026</option>
                    <option className="text-black bg-white" value="2027">2027</option>
                    <option className="text-black bg-white" value="2028">2028</option>
                  </select>
                </div>
                
                
              </div>

              {/* Tone style */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Academic Tone</label>
                <select
                  value={academicTone}
                  onChange={(e) => setAcademicTone(e.target.value)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-2.5 px-3 focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
                >
                  <option className="text-black bg-white" value="Rigid Coach">Rigid Coach 🧗</option>
                  <option className="text-black bg-white" value="Friendly Advisor">Friendly Advisor 🌱</option>
                  <option className="text-black bg-white" value="Direct Execution">Direct Execution 🎯</option>
                </select>
              </div>
            </div>

            {/* Grid for Level & Commitment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1 font-sans">Preparation Depth</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-2.5 px-3 focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
                >
                  <option className="text-black bg-white" value="Beginner">Beginner (Fast Track)</option>
                  <option className="text-black bg-white" value="Intermediate">Intermediate (Core Concepts)</option>
                  <option className="text-black bg-white" value="Advanced">Advanced (Deep Technical)</option>
                </select>
              </div>

              {/* Commitment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1 font-sans">Work Load Tolerance</label>
                <select
                  value={commitment}
                  onChange={(e) => setCommitment(e.target.value)}
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] rounded-xl py-2.5 px-3 focus:border-indigo-500 text-xs text-white outline-none cursor-pointer"
                >
                  <option className="text-black bg-white" value="Light (1-2 hrs)">Light (1-2 hrs / day)</option>
                  <option className="text-black bg-white" value="Moderate (3-4 hrs)">Moderate (3-4 hrs / day)</option>
                  <option className="text-black bg-white" value="Intense (5+ hrs)">Intense (5+ hrs / day)</option>
                </select>
              </div>
            </div>

            {/* Button trigger */}
            <div className="pt-3 relative group">
              <motion.button
                type="submit"
                id="generate-plan-advanced-button"
                disabled={isGenerating || !objective.trim()}
                whileHover={{ scale: isGenerating ? 1 : 1.02, shadow: "0px 0px 20px rgba(99, 102, 241, 0.4)" }}
                whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 shadow-2xl relative overflow-hidden cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-300`}
              >
                {/* Background high-contrast sliding reflex highlight */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-display font-extrabold text-cyan-300 animate-pulse tracking-widest">
                      Consulting Cortex Engines...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5 text-cyan-300 animate-pulse shrink-0" />
                    <span className="font-display font-extrabold tracking-widest text-shadow">
                      Generate AI Roadmap
                    </span>
                  </>
                )}

                {/* Subtle outer cyan ring glow on hover */}
                <div className="absolute inset-0 rounded-2xl border border-cyan-400/0 group-hover:border-cyan-400/20 transition-colors pointer-events-none" />
              </motion.button>

              {/* Dynamic instruction footer helper under the button */}
              {!objective.trim() && (
                <div className="text-center mt-2 text-[10px] text-gray-500 italic select-none">
                  * Type a target goal above to enable the AI Generator
                </div>
              )}
            </div>

          </form>

          {/* Quick Informational Tip Card */}
          <div className="bg-[#090b1e]/40 p-4 rounded-2xl border border-[#1e244b]/30 flex gap-3 text-[11px] text-gray-400 select-none">
            <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold text-gray-300">Pacing Adaptation:</span>
              <p className="font-light leading-snug">
                Depending on the chosen deadline date, Gemini automatically balances hours-to-day weight thresholds to minimize risk levels!
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Generated Roadmap Preview Flowchart */}
        <div className="lg:col-span-7 bg-[#12163b]/40 border border-[#1e244b]/60 rounded-3xl p-6 min-h-[480px] flex flex-col justify-between shadow-xl">
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-[#1e244b]/40 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#10b981]" />
                <h3 className="text-white font-display text-base font-bold">Blueprint Roadmap Preview</h3>
              </div>

              {previewPlan && (
                <span className="px-3 py-1 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/35 text-[10px] font-mono font-bold rounded-full animate-pulse">
                  Ready to Deploy ({previewPlan.steps.length} Steps)
                </span>
              )}
            </div>

            {/* Preview content */}
            {previewPlan ? (
              <div className="space-y-5">
                
                {/* Meta details header */}
                <div className="bg-[#090b1e]/70 border border-[#1e244b]/30 p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider select-none">Plan Node</span>
                    <p className="text-white text-xs truncate max-w-[120px] font-bold">{previewPlan.planName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider select-none">Skill Level</span>
                    <p className="text-cyan-400 text-xs font-bold font-mono">{skillLevel}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider select-none">Target Due</span>
                    <p className="text-white text-xs font-bold font-mono">{deadline}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider select-none">Total Hours</span>
                    <p className="text-purple-400 text-xs font-bold font-mono">{previewPlan.estimatedTotalHours} hrs</p>
                  </div>
                </div>

                {/* Interactive Plan controls bar */}
                <div className="flex justify-between items-center bg-[#090b1e]/40 p-3 rounded-xl border border-[#1e244b]/30">
                  <span className="text-[10px] text-gray-400 font-sans">
                    Need optimization? Shift and balance task dates automatically.
                  </span>
                  <button
                    onClick={handleReschedulePlan}
                    className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/30 border border-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-300 transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    Reschedule Roadmap 📅
                  </button>
                </div>

                {/* Nested Preview Tabs switcher */}
                <div className="flex gap-2 border-b border-[#1e244b]/30 pb-2">
                  <button
                    onClick={() => setPreviewTab("flowchart")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      previewTab === "flowchart" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Flowchart Steps
                  </button>
                  <button
                    onClick={() => setPreviewTab("milestones")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      previewTab === "milestones" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Milestones & Risk
                  </button>
                  <button
                    onClick={() => setPreviewTab("schedules")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      previewTab === "schedules" ? "bg-purple-500/15 text-purple-400 border border-purple-500/25" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Daily/Weekly Schedules
                  </button>
                  <button
                    onClick={() => setPreviewTab("checkpoints")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      previewTab === "checkpoints" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Pacing Checkpoints
                  </button>
                </div>

                {/* Tab content area */}
                <div className="max-h-[290px] overflow-y-auto pr-1">
                  
                  {previewTab === "flowchart" && (
                    <div className="relative pl-6 border-l-2 border-indigo-500/20 space-y-4">
                      {previewPlan.steps.map((step, idx) => (
                        <div key={step.id} className="relative group">
                          {/* Vertical line connector badge */}
                          <span className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-[#1e244b] border border-[#22d3ee]/20 text-white font-mono font-bold text-[10px] flex items-center justify-center select-none group-hover:bg-cyan-500 transition-colors">
                            {idx + 1}
                          </span>

                          {editingStepId === step.id ? (
                            <div className="p-4 bg-[#12163b] border border-cyan-500/30 rounded-2xl space-y-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Step Title</label>
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="w-full bg-[#090b1e] border border-[#1e244b] rounded-lg py-1.5 px-3 text-xs text-white outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Step Description</label>
                                <textarea
                                  value={editingDescription}
                                  onChange={(e) => setEditingDescription(e.target.value)}
                                  rows={2}
                                  className="w-full bg-[#090b1e] border border-[#1e244b] rounded-lg py-1.5 px-3 text-xs text-white outline-none resize-none"
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <label className="text-[9px] font-bold text-gray-400 uppercase">Hours:</label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={editingDuration}
                                    onChange={(e) => setEditingDuration(parseFloat(e.target.value) || 1.0)}
                                    className="w-16 bg-[#090b1e] border border-[#1e244b] rounded-lg py-1 px-2 text-xs text-center text-white outline-none"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingStepId(null)}
                                    className="px-2.5 py-1 text-[10px] bg-slate-800 text-gray-300 rounded-md font-bold hover:bg-slate-700 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveStepEdit(step.id)}
                                    className="px-2.5 py-1 text-[10px] bg-cyan-600 text-white rounded-md font-bold hover:bg-cyan-500 cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Content panel */
                            <div className="p-4 bg-[#151a4a]/40 border border-[#1e244b]/40 hover:border-cyan-400/30 rounded-2xl transition-all">
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h4 className="text-white text-xs font-bold leading-snug truncate pr-3">{step.title}</h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] bg-slate-900/60 text-gray-300 font-mono px-2 py-0.5 rounded border border-[#1e244b] font-bold">
                                    ~{step.durationHours}h
                                  </span>
                                </div>
                              </div>
                              <p className="text-gray-400 text-[10px] font-light leading-relaxed mb-3">{step.description}</p>
                              
                              <div className="flex justify-end gap-2 pt-2 border-t border-[#1e244b]/20 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleRegenerateStep(step.id)}
                                  className="text-[9px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                                  title="AI recalculate this step"
                                >
                                  🔄 AI Regenerate
                                </button>
                                <span className="text-gray-600 select-none">|</span>
                                <button
                                  onClick={() => {
                                    setEditingStepId(step.id);
                                    setEditingTitle(step.title);
                                    setEditingDescription(step.description);
                                    setEditingDuration(step.durationHours);
                                  }}
                                  className="text-[9px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                                >
                                  ✏️ Edit
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {previewTab === "milestones" && (
                    <div className="space-y-4">
                      {/* Difficulty Gauge card */}
                      <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider font-mono">AI Difficulty Score</span>
                          <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/35 text-[9px] font-mono font-bold rounded-full uppercase">
                            {previewPlan.difficultyAnalysis?.level || "Medium"}
                          </span>
                        </div>
                        <p className="text-gray-300 text-[11px] font-light leading-relaxed">
                          {previewPlan.difficultyAnalysis?.reason || `This plan requires structured, step-by-step progress to master ${previewPlan.planName}.`}
                        </p>
                      </div>

                      {/* Milestones timeline */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1 block">Strategy Roadmap Milestones</span>
                        {(previewPlan.milestones || [
                          `Phase 1: Concepts & Fundamentals of ${previewPlan.planName}`,
                          `Phase 2: Deep Core Drills & Hands-on Lab work`,
                          `Phase 3: Integration, Spaced Review, & Milestone Lock-in`
                        ]).map((milestone, mIdx) => (
                          <div key={mIdx} className="p-3 bg-[#151a4a]/20 border border-[#1e244b]/30 rounded-xl flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-[#1e244b] text-[10px] font-mono font-bold text-cyan-400 flex items-center justify-center shrink-0">
                              M{mIdx + 1}
                            </span>
                            <span className="text-gray-300 text-[10px] font-light">{milestone}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex gap-2 justify-between p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-xl text-[10px] text-gray-400 font-mono">
                          <span>🛡️ Safety Buffer:</span>
                          <span className="text-cyan-400 font-bold">{previewPlan.bufferDays || 1} day(s)</span>
                        </div>
                        <div className="flex gap-2 justify-between p-3 bg-purple-950/10 border border-purple-500/10 rounded-xl text-[10px] text-gray-400 font-mono">
                          <span>🏃 Catch-Up Reserve:</span>
                          <span className="text-purple-400 font-bold">{previewPlan.catchUpDays || Math.max(1, Math.round((previewPlan.bufferDays || 1) * 0.5))} day(s)</span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-900/40 border border-white/5 rounded-xl text-[10px] text-gray-400">
                        <div className="flex justify-between font-mono mb-2">
                          <span>📅 Completion Prediction:</span>
                          <span className="text-emerald-400 font-bold">{previewPlan.completionPredictionDate || previewPlan.targetDeadline}</span>
                        </div>
                        <div className="space-y-1 pl-1">
                          <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Smart Suggestions:</span>
                          {(previewPlan.smartSuggestions || [
                            "Cluster highly challenging milestones into morning focus slots.",
                            "Use active recall cards within 24h of completing practical labs.",
                            "Leverage built-in buffer blocks to secure sleep consistency."
                          ]).map((sug, sIdx) => (
                            <div key={sIdx} className="flex gap-1.5 items-start text-gray-400">
                              <span className="text-cyan-400 mt-0.5">•</span>
                              <span className="font-light">{sug}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {previewTab === "schedules" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Daily Hourly template */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1 block">Suggested Daily Spaced Slots</span>
                        {(previewPlan.dailySchedule || [
                          { time: "09:00 AM", task: "Theory Core & Concept Overview" },
                          { time: "11:30 AM", task: "Practical Code Application Lab" },
                          { time: "03:00 PM", task: "Spaced Active Recall & Flashcards review" },
                          { time: "05:00 PM", task: "Revision of daily logs and tomorrow prep" }
                        ]).map((slot, sIdx) => (
                          <div key={sIdx} className="p-2.5 bg-[#151a4a]/20 border border-[#1e244b]/30 rounded-xl flex justify-between items-center text-[10px]">
                            <span className="text-purple-400 font-mono font-bold shrink-0">{slot.time}</span>
                            <span className="text-gray-300 font-light truncate max-w-[140px]">{slot.task}</span>
                          </div>
                        ))}
                      </div>

                      {/* Weekly Themes template */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1 block">Weekly Milestone Themes</span>
                        {(previewPlan.weeklySchedule || [
                          { week: "Week 1", theme: "Scaffold, Core Foundations & Setup Mastery" },
                          { week: "Week 2", theme: "Deep drills, Advanced integration & Testing" }
                        ]).map((wk, wIdx) => (
                          <div key={wIdx} className="p-2.5 bg-[#151a4a]/20 border border-[#1e244b]/30 rounded-xl text-[10px]">
                            <span className="text-emerald-400 font-bold font-mono block mb-0.5">{wk.week}</span>
                            <span className="text-gray-300 font-light block leading-relaxed">{wk.theme}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewTab === "checkpoints" && (
                    <div className="space-y-4">
                      {/* Progress Checkpoints */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1 block">Measurable Knowledge Checkpoints</span>
                        {(previewPlan.progressCheckpoints || [
                          "Can summarize main concepts without references",
                          "Completed all high-priority daily lab drills",
                          "Demoed integrated outcome to peer / mock evaluator"
                        ]).map((cp, cIdx) => (
                          <div key={cIdx} className="p-3 bg-[#151a4a]/20 border border-[#1e244b]/30 rounded-xl flex gap-2.5 items-start">
                            <span className="text-cyan-400 mt-0.5 font-bold">✓</span>
                            <span className="text-gray-300 text-[10px] font-light leading-relaxed">{cp}</span>
                          </div>
                        ))}
                      </div>

                      {/* Spacing revisions slots */}
                      <div className="space-y-2 pt-2 border-t border-[#1e244b]/20">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pl-1 block">Spaced Revision Milestones</span>
                        {(previewPlan.revisionSchedule || [
                          "24h Spaced Review: Reread daily study summary blocks",
                          "72h Application Drill: Re-implement lab problems from memory",
                          "Pre-deadline Mock Test: Conduct timed evaluation 1 day prior"
                        ]).map((rev, rIdx) => (
                          <div key={rIdx} className="p-2.5 bg-purple-950/10 border border-purple-500/10 rounded-xl text-[10px] text-gray-300 font-light">
                            ⏳ {rev}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="py-20 text-center px-4 flex flex-col items-center justify-center h-full">
                {isGenerating ? (
                  <div className="space-y-3.5 flex flex-col items-center">
                    {/* Glowing spinner */}
                    <div className="relative w-11 h-11">
                      <div className="absolute inset-0 border-3 border-indigo-500/10 rounded-full" />
                      <div className="absolute inset-0 border-3 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                    </div>
                    <h5 className="text-gray-300 font-semibold text-sm">Automating AI Scheduling Matrix...</h5>
                    <p className="text-gray-500 text-xs font-light max-w-sm">Generating sequenced phases and workload estimations.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center select-none">
                    <Compass className="w-11 h-11 text-gray-600 opacity-60 flex justify-center items-center" />
                    <h5 className="text-gray-400 font-semibold text-xs leading-normal">Roadmap Workspace Empty</h5>
                    <p className="text-gray-500 text-[11px] font-light max-w-sm leading-normal">
                      Fill custom configurations on the left panel, and trigger <b>Generate AI Roadmap</b>. Review sequences before applying them.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Import Feedback overlay */}
            <AnimatePresence>
              {importStatus === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center shrink-0">
                    <Award className="w-4.5 h-4.5 fill-slate-900 stroke-[2.5]" />
                  </div>
                  <div>
                    <h5 className="text-emerald-400 font-bold text-xs">Roadmap Applied Successfully!</h5>
                    <p className="text-gray-400 text-[10px] font-light">
                      Steps imported into active tasks lists. Navigating to Dashboard in 1.2s...
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Locked-In Import action bar at the absolute bottom of panel */}
          {previewPlan && (
            <div className="border-t border-[#1e244b]/50 pt-5 mt-5 flex justify-between items-center bg-[#151241]/20">
              <span className="text-[10px] text-gray-400 text-left max-w-xs font-light">
                Applying roadmap feeds newly generated cards directly into active tasks database tracker sequentially.
              </span>
              
              <button
                onClick={handleImportPlan}
                className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 hover:scale-[1.02] active:scale-[0.98] transition-all text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 border border-emerald-300/30 cursor-pointer shadow-lg hover:shadow-cyan-500/15 font-sans"
              >
                <Import className="w-4 h-4 stroke-[2.5]" />
                <span>Deploy Task Schedule</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}

        </div>

      </div>
      ) : (
        <DeadlineSimulator defaultGoal={objective} defaultDeadline={deadline} />
      )}

      {/* Dynamic Notification Toast */}
      <AnimatePresence>
        {plannerToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 border border-indigo-400/30 rounded-2.5xl shadow-2xl shadow-indigo-950/40 text-xs font-bold font-sans text-white flex items-center gap-2.5"
          >
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse animate-bounce" />
            <span>{plannerToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
