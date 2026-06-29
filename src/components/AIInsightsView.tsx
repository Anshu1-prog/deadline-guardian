import React, { useState, useEffect, useMemo, useRef } from "react";
import { Task, UserProfile } from "../types";
import { sendChatMessage, fetchInsights } from "../services/apiService";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Calendar, 
  Flame, 
  Sparkles, 
  Coffee, 
  ChevronRight, 
  ChevronLeft,
  RefreshCw, 
  Clock, 
  Activity,
  Award,
  HeartPulse,
  Send,
  Star,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AIInsightsViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  profile: UserProfile;
}

interface InsightItem {
  id: string;
  title: string;
  description: string;
  metric: string;
  badge: string;
  type: "success" | "warning" | "info" | "danger";
  icon: any;
  confidence: number;
  reasoning: string;
  action: string;
  relatedTasksCount: number;
}

interface PremiumAIData {
  summary: string;
  recommendation: string;
  confidence: number;
  forecast: { day: string; workload: "Low" | "Medium" | "Heavy"; tasksCount: number }[];
  insights: InsightItem[];
  achievements: { title: string; unlocked: boolean; icon: string }[];
  timeline: { time: string; event: string }[];
  riskReason: string;
  motivation: string;
}

// Butter-smooth dynamic live counter
function AnimatedCounter({ value, duration = 1000, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuad = (t: number) => t * (2 - t);
      setCount(Math.floor(easeOutQuad(progress) * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count}{suffix}</span>;
}

// Futuristic SVG Progress Ring Component
function ProgressRing({ value, size = 90, strokeWidth = 7, color = "stroke-indigo-500", label = "", detail = "" }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  detail?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  const colorHex = useMemo(() => {
    if (color === "stroke-rose-500") return "#f43f5e";
    if (color === "stroke-emerald-500") return "#10b981";
    if (color === "stroke-amber-500") return "#f59e0b";
    return "#6366f1"; // stroke-indigo-500
  }, [color]);

  return (
    <div className="flex flex-col items-center p-4 bg-[#111435]/50 border border-white/5 rounded-2xl shadow-lg backdrop-blur-md hover:border-indigo-500/20 transition-all">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-900 fill-none"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none"
            stroke={colorHex}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-extrabold text-white">
            <AnimatedCounter value={value} suffix="%" />
          </span>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mt-3">{label}</span>
      {detail && <span className="text-[9px] text-gray-500 mt-1 font-medium">{detail}</span>}
    </div>
  );
}

export default function AIInsightsView({ tasks, setTasks, profile }: AIInsightsViewProps) {
  const [loadingReschedule, setLoadingReschedule] = useState(false);
  const [rescheduleLog, setRescheduleLog] = useState<string | null>(null);
  
  // Chat Companion State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: "user" | "ai"; text: string }[]>([
    {
      sender: "ai",
      text: `Greetings, ${profile.name}! I am your AI Companion. I have completed my weekly evaluation of your task performance velocity and risk matrices. Let me know if you would like to adjust your workloads or if you need tips to stay motivated!`
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Core Premium AI Analytics State
  const [premiumAIData, setPremiumAIData] = useState<PremiumAIData | null>(null);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Original insights endpoint state (kept to support underlying logic safely)
  const [insightsData, setInsightsData] = useState<any | null>(null);

  // Carousel & Expandable insights trackers
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Record<string, boolean>>({});

  // Memoize tasks signature to prevent infinite re-fetches
  const tasksSignature = useMemo(() => {
    const active = tasks.filter(t => !t.archived);
    return JSON.stringify(active.map(t => ({ id: t.id, completed: t.completed, dueDate: t.dueDate, priority: t.priority })));
  }, [tasks]);

  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);
  const hasInsuffData = activeTasks.length < 3;

  const completedCount = useMemo(() => activeTasks.filter(t => t.completed).length, [activeTasks]);
  const pendingCount = useMemo(() => activeTasks.filter(t => !t.completed).length, [activeTasks]);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const overdueCount = useMemo(() => activeTasks.filter(t => !t.completed && t.dueDate < todayStr).length, [activeTasks, todayStr]);
  const totalCount = activeTasks.length;
  const completionRate = useMemo(() => totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0, [completedCount, totalCount]);

  // Loading indicator phrases
  const loadingTexts = [
    "Analyzing workload complexity...",
    "Calculating burnout probability threshold...",
    "Evaluating streak & study consistency...",
    "Synthesizing customized AI recommendations..."
  ];

  // Auto-cycle the diagnostic text during loading
  useEffect(() => {
    if (!loadingPremium) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingTexts.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [loadingPremium]);

  // Auto-scroll the companion chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // Fallback data generator for offline/errors
  const fallbackPremiumData = useMemo(() => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Generate Forecast
    const forecast = Array.from({ length: 5 }).map((_, i) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const dateStr = targetDate.toISOString().split("T")[0];
      const count = activeTasks.filter(t => !t.completed && t.dueDate === dateStr).length;
      const load: "Low" | "Medium" | "Heavy" = count > 3 ? "Heavy" : count > 1 ? "Medium" : "Low";
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : daysOfWeek[targetDate.getDay()];
      return { day: dayName, workload: load, tasksCount: count };
    });

    // Generate Timeline
    const sortedPending = [...activeTasks].filter(t => !t.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const timeline = sortedPending.slice(0, 4).map((t) => {
      let relDay = "This Week";
      if (t.dueDate === todayStr) relDay = "Today";
      else if (t.dueDate === new Date(Date.now() + 86400000).toISOString().split("T")[0]) relDay = "Tomorrow";
      else {
        const d = new Date(t.dueDate);
        relDay = daysOfWeek[d.getDay()];
      }
      return { time: relDay, event: t.title };
    });

    if (timeline.length === 0) {
      timeline.push({ time: "All Clear", event: "No outstanding deadlines! Treat yourself to some rest." });
    }

    // Generate Achievements
    const achievements = [];
    if (completedCount >= 5) achievements.push({ title: "Completed 5+ tasks", unlocked: true, icon: "award" });
    if (profile.streak >= 3) achievements.push({ title: `${profile.streak}-day streak`, unlocked: true, icon: "zap" });
    if (overdueCount === 0 && pendingCount > 0) achievements.push({ title: "No overdue tasks", unlocked: true, icon: "check" });
    if (completedCount > 0 && overdueCount === 0) achievements.push({ title: "Recovered from backlog", unlocked: true, icon: "star" });
    const completedHigh = activeTasks.some(t => t.completed && t.priority === "High");
    if (completedHigh) achievements.push({ title: "Resolved high priority items", unlocked: true, icon: "check" });
    if (achievements.length === 0) {
      achievements.push({ title: "Task journey started", unlocked: true, icon: "star" });
    }

    // Generate Insights
    const insights: InsightItem[] = [];
    if (overdueCount > 0) {
      insights.push({
        id: "fallback-overdue",
        title: "Overdue Backlog Stress",
        description: `You have ${overdueCount} pending task(s) past their due dates. This compounds cognitive load.`,
        metric: `${overdueCount} Overdue`,
        badge: "Risk",
        type: "danger",
        icon: AlertTriangle,
        confidence: 94,
        reasoning: "Detected overdue study nodes. Rescheduling distributes cognitive pressure and unlocks peak memory retention.",
        action: "Run the Smart Rescheduler",
        relatedTasksCount: overdueCount
      });
    }

    const highPriorityActive = activeTasks.filter(t => !t.completed && t.priority === "High").length;
    if (highPriorityActive > 0) {
      insights.push({
        id: "fallback-high",
        title: "High Priority Sprints",
        description: `Focus on your ${highPriorityActive} high priority task(s) first before reviewing secondary notes.`,
        metric: `${highPriorityActive} Critical Nodes`,
        badge: "Efficiency",
        type: "warning",
        icon: Zap,
        confidence: 88,
        reasoning: "Focusing strictly on primary critical-path assignments boosts learning speed and minimizes fatigue.",
        action: "Target highest priority tasks",
        relatedTasksCount: highPriorityActive
      });
    }

    if (completionRate >= 60) {
      insights.push({
        id: "fallback-streak",
        title: "Optimal Completion Velocity",
        description: `With a ${completionRate}% completion rate, you are maintaining excellent study momentum!`,
        metric: `${completionRate}% Rate`,
        badge: "Streak",
        type: "success",
        icon: Flame,
        confidence: 92,
        reasoning: "Sustaining a daily task resolution pace improves psychological safety and active recall.",
        action: "Maintain current study blocks",
        relatedTasksCount: completedCount
      });
    } else {
      insights.push({
        id: "fallback-opportunity",
        title: "Pomodoro Deconstruction Block",
        description: "Decompose complex items into 25-minute Pomodoro study slots to lower cognitive resistance.",
        metric: `${completionRate}% Velocity`,
        badge: "Opportunity",
        type: "success",
        icon: TrendingUp,
        confidence: 81,
        reasoning: "Breaking down high-difficulty items increases dopamine spikes on task resolutions.",
        action: "Add subtasks to your complex tasks",
        relatedTasksCount: pendingCount
      });
    }

    if (pendingCount > 3) {
      insights.push({
        id: "fallback-congestion",
        title: "Schedule Overload Watch",
        description: "Multiple active items are currently open. Dedicate structured buffer blocks to avoid burnout.",
        metric: `${pendingCount} Open Nodes`,
        badge: "Schedule",
        type: "info",
        icon: Calendar,
        confidence: 85,
        reasoning: "Exceeding 3 concurrently open items increases mental context-switching and reduces focal clarity.",
        action: "Focus on single-tasking sessions",
        relatedTasksCount: pendingCount
      });
    } else {
      insights.push({
        id: "fallback-rest",
        title: "Optimal Buffer Allocation",
        description: "Your schedule has healthy spacing. Use these focus blocks for spaced repetition drills.",
        metric: "Healthy Buffer",
        badge: "Rest",
        type: "info",
        icon: Coffee,
        confidence: 89,
        reasoning: "Sufficient calendar rest intervals allow permanent memory consolidation in the temporal lobe.",
        action: "Practice spacing study tracks",
        relatedTasksCount: 0
      });
    }

    return {
      summary: overdueCount > 0 
        ? `Workload pressure is moderate. Rescheduling ${overdueCount} overdue items is highly recommended.`
        : `Rhythm is clean and consistent with ${completedCount} nodes resolved. Keep maintaining this pace!`,
      recommendation: overdueCount > 0 
        ? "Engage the Smart Rescheduler now to automatically balance outstanding workload demands."
        : "Set up a focused 25-minute study sprint on your top priority learning card today.",
      confidence: Math.min(99, Math.max(65, 70 + completedCount * 3 + totalCount * 2 - overdueCount * 5)),
      forecast,
      insights,
      achievements,
      timeline,
      riskReason: overdueCount > 0 ? `Risk increased due to ${overdueCount} overdue items.` : "Minimal backlog friction.",
      motivation: "Consistent minor gains create monumental transformations over time. Secure your streak today!"
    };
  }, [activeTasks, completedCount, pendingCount, todayStr, overdueCount, totalCount, completionRate, profile.streak]);

  // Primary Gemini Deep Audit Fetch
  useEffect(() => {
    let active = true;
    const fetchComprehensiveAudit = async () => {
      if (hasInsuffData) {
        setPremiumAIData(null);
        return;
      }

      setLoadingPremium(true);

      const prompt = `You are an elite academic productivity AI advisor. Analyze the following complete student/user application state and output a highly detailed, personalized performance audit.

User Profile:
- Name: ${profile.name}
- Streak: ${profile.streak} days
- Focus Score: ${profile.focusScore}%
- Daily Work Hour Limit: ${profile.dailyWorkHours} hrs
- Current XP: ${profile.xp || 0}
- Current Level: ${profile.level || 1}

Task Data (JSON format):
${JSON.stringify(activeTasks.map(t => ({
  title: t.title,
  description: t.description,
  dueDate: t.dueDate,
  priority: t.priority,
  completed: t.completed,
  category: t.category,
  durationHours: t.durationHours || 1,
  subtasksCount: t.subtasks?.length || 0,
  subtasksCompleted: t.subtasks?.filter(s => s.completed).length || 0,
  overdue: !t.completed && t.dueDate < todayStr
})))}

Today's Date: ${todayStr}

Based on this data, construct a strict, valid JSON response with the keys below. You are forbidden from including any markdown formatting, any backticks (like \`\`\`json), any conversational text, or any leading/trailing comments. Output ONLY raw parseable JSON:
{
  "summary": "A 2-sentence highly personalized review of the student's workload, burnout signs, or velocity today.",
  "recommendation": "A key, immediate high-impact action the student should take right now.",
  "confidence": 88,
  "forecast": [
    { "day": "Today", "workload": "Low" | "Medium" | "Heavy", "tasksCount": 2 },
    { "day": "Tomorrow", "workload": "Low" | "Medium" | "Heavy", "tasksCount": 1 },
    { "day": "Wednesday", "workload": "Low" | "Medium" | "Heavy", "tasksCount": 4 },
    { "day": "Thursday", "workload": "Low" | "Medium" | "Heavy", "tasksCount": 0 },
    { "day": "Friday", "workload": "Low" | "Medium" | "Heavy", "tasksCount": 3 }
  ],
  "insights": [
    {
      "id": "insight-1",
      "title": "A short compelling title",
      "description": "Specific actionable guidance referencing actual tasks in the user's workload.",
      "metric": "e.g., '2 High Priority Nodes' or '85% Completion Velocity'",
      "label": "efficiency" | "risk" | "opportunity" | "schedule" | "streak" | "rest",
      "confidence": 92,
      "reasoning": "A deep analysis of why the AI detected this specific trend based on task counts, due dates, and priority structures.",
      "action": "Complete Task X or run the Smart Rescheduler",
      "relatedTasksCount": 1
    }
  ],
  "achievements": [
    { "title": "Completed 5 coding tasks", "unlocked": true, "icon": "check" | "zap" | "star" | "award" }
  ],
  "timeline": [
    { "time": "Today", "event": "Specific milestone or due task title" },
    { "time": "Tomorrow", "event": "Specific milestone or due task title" }
  ],
  "riskReason": "Detailed reason why the overload risk was computed at this score.",
  "motivation": "A brief empowering quote or reminder to protect the student's streak."
}`;

      try {
        const response = await sendChatMessage(prompt, []);
        if (!active) return;

        if (response && response.reply) {
          const text = response.reply;
          // Extract JSON block from text
          const firstBrace = text.indexOf("{");
          const lastBrace = text.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonString = text.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonString);

            // Construct validated structures
            const validatedInsights: InsightItem[] = (parsed.insights || []).map((ins: any, idx: number) => {
              const label = String(ins.label || "").toLowerCase();
              let iconComp = Sparkles;
              let type: "success" | "warning" | "info" | "danger" = "info";

              if (label.includes("risk") || label.includes("overdue") || label.includes("danger")) {
                iconComp = AlertTriangle;
                type = "danger";
              } else if (label.includes("opportunity") || label.includes("velocity") || label.includes("pacing")) {
                iconComp = TrendingUp;
                type = "success";
              } else if (label.includes("efficiency") || label.includes("peak") || label.includes("zap")) {
                iconComp = Zap;
                type = "success";
              } else if (label.includes("schedule") || label.includes("calendar")) {
                iconComp = Calendar;
                type = "info";
              } else if (label.includes("streak") || label.includes("flame") || label.includes("consistency")) {
                iconComp = Flame;
                type = "warning";
              } else if (label.includes("rest") || label.includes("spacing") || label.includes("coffee")) {
                iconComp = Coffee;
                type = "info";
              }

              return {
                id: ins.id || `dynamic-insight-${idx}`,
                title: ins.title || "Insight",
                description: ins.description || "Actionable recommendation.",
                metric: ins.metric || "Calculated",
                badge: ins.label ? (ins.label.charAt(0).toUpperCase() + ins.label.slice(1)) : "AI Insight",
                type,
                icon: iconComp,
                confidence: Number(ins.confidence) || 85,
                reasoning: ins.reasoning || "Workload scheduling patterns align with your target consistency limits.",
                action: ins.action || "Continue execution plan.",
                relatedTasksCount: Number(ins.relatedTasksCount) || 0
              };
            });

            setPremiumAIData({
              summary: parsed.summary || fallbackPremiumData.summary,
              recommendation: parsed.recommendation || fallbackPremiumData.recommendation,
              confidence: Number(parsed.confidence) || fallbackPremiumData.confidence,
              forecast: Array.isArray(parsed.forecast) ? parsed.forecast : fallbackPremiumData.forecast,
              insights: validatedInsights.length > 0 ? validatedInsights : fallbackPremiumData.insights,
              achievements: Array.isArray(parsed.achievements) ? parsed.achievements : fallbackPremiumData.achievements,
              timeline: Array.isArray(parsed.timeline) ? parsed.timeline : fallbackPremiumData.timeline,
              riskReason: parsed.riskReason || fallbackPremiumData.riskReason,
              motivation: parsed.motivation || fallbackPremiumData.motivation
            });
          } else {
            throw new Error("JSON braces not found in response text");
          }
        } else {
          throw new Error("Empty reply from chat service");
        }
      } catch (err) {
        console.warn("Using smart fallback calculated values for AI audit:", err);
        if (active) {
          setPremiumAIData(fallbackPremiumData);
        }
      } finally {
        if (active) {
          setLoadingPremium(false);
        }
      }
    };

    fetchComprehensiveAudit();

    return () => {
      active = false;
    };
  }, [tasksSignature, profile.name, profile.streak]);

  // Keep original insights query logic running safely to feed underlying context state
  useEffect(() => {
    let active = true;
    const loadOriginalInsights = async () => {
      try {
        const response = await fetchInsights(tasks, profile.name, profile.streak);
        if (!active) return;
        if (response.success && response.insights) {
          setInsightsData(response.insights);
        }
      } catch (err) {
        console.error("Original loadInsights query background failure:", err);
      }
    };
    loadOriginalInsights();
    return () => {
      active = false;
    };
  }, [tasks, profile.name, profile.streak]);

  // Dynamic risk score calculation combining direct telemetry & background predictions
  const computedRiskScore = useMemo(() => {
    if (hasInsuffData) return 0;
    const baseRisk = insightsData?.overloadRisk?.score ?? 15;
    const overdueFriction = overdueCount * 25;
    const pendingFriction = pendingCount * 6;
    return Math.min(99, Math.max(5, Math.round((baseRisk + overdueFriction + pendingFriction) / 2)));
  }, [insightsData, overdueCount, pendingCount, hasInsuffData]);

  const riskAssessment = useMemo(() => {
    const score = computedRiskScore;
    let level = "Low";
    let textClass = "text-emerald-400";
    let glowColor = "shadow-[inset_0_0_50px_rgba(52,211,153,0.06)] border-[#10b981]/20";

    if (score >= 80) {
      level = "Critical";
      textClass = "text-rose-400";
      glowColor = "shadow-[inset_0_0_60px_rgba(244,63,94,0.12)] border-[#f43f5e]/30 animate-pulse [animation-duration:3s]";
    } else if (score >= 55) {
      level = "High";
      textClass = "text-amber-400";
      glowColor = "shadow-[inset_0_0_50px_rgba(245,158,11,0.08)] border-[#f59e0b]/20";
    } else if (score >= 25) {
      level = "Moderate";
      textClass = "text-indigo-400";
      glowColor = "shadow-[inset_0_0_50px_rgba(99,102,241,0.07)] border-[#6366f1]/20";
    }

    return { score, level, textClass, glowColor };
  }, [computedRiskScore]);

  // Ambient back-pulse color
  const ambientBgClass = useMemo(() => {
    if (hasInsuffData) return "from-[#080b2a] via-[#090b1e] to-[#040511]";
    if (computedRiskScore < 25) return "from-[#06142a] via-[#090b1e] to-[#030510]"; // subtle emerald-blue
    if (computedRiskScore < 55) return "from-[#0f1138] via-[#090b1e] to-[#030510]"; // subtle deep indigo
    if (computedRiskScore < 80) return "from-[#1f150e] via-[#090b1e] to-[#030510]"; // subtle amber
    return "from-[#280d14] via-[#090b1e] to-[#030510] animate-pulse [animation-duration:12s]"; // critical deep warning glow
  }, [computedRiskScore, hasInsuffData]);

  // Smart Rescheduler logic staggering overdue tasks
  const handleSmartReschedule = () => {
    setLoadingReschedule(true);
    setTimeout(() => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      
      const updatedTasks = tasks.map(task => {
        if (!task.completed && !task.archived && task.dueDate < todayStr) {
          const targetDay = new Date();
          const randomOffset = Math.floor(Math.random() * 3) + 1; // 1-3 days out
          targetDay.setDate(targetDay.getDate() + randomOffset);
          const newDueDate = targetDay.toISOString().split("T")[0];
          return {
            ...task,
            dueDate: newDueDate,
            notes: (task.notes || "") + ` [Auto-Rescheduled on ${todayStr} to stagger load]`
          };
        }
        return task;
      });

      setTasks(updatedTasks);
      setLoadingReschedule(false);
      setRescheduleLog(`Successfully redistributed overdue study blocks across future dates!`);
      
      setChatHistory(prev => [
        ...prev,
        {
          sender: "ai",
          text: `⚡ Engine Action: I have captured all overdue study cards and smoothly staggered them across future days. Workload congestion is now cleared!`
        }
      ]);
    }, 1200);
  };

  // Chat Submission Handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const prompt = `User profile: ${JSON.stringify(profile)}. Workload summary: ${totalCount} active cards, ${completedCount} completed, ${pendingCount} remaining, ${overdueCount} overdue. The user asks: ${userMsg}. Provide a short, direct 2-3 sentence academic recommendation focused on active spacing, focus limits, or memory. Keep it supportive and highly direct.`;
      const response = await sendChatMessage(prompt, []);
      
      setChatHistory(prev => [
        ...prev,
        {
          sender: "ai",
          text: response.reply || "I am analyzing your active metrics. Remember to practice the Pomodoro technique to shield your focus windows!"
        }
      ]);
    } catch (err) {
      setChatHistory(prev => [
        ...prev,
        {
          sender: "ai",
          text: "I recommend establishing a dedicated 15-minute review block this afternoon. Breaking complicated task streams down into brief active recall intervals is optimal."
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Carousel timer controller
  useEffect(() => {
    if (isCarouselHovered || !premiumAIData || premiumAIData.insights.length <= 1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % premiumAIData.insights.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isCarouselHovered, premiumAIData]);

  const activeAuditData = premiumAIData || fallbackPremiumData;

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "award": return <Award className="w-4.5 h-4.5 text-yellow-400" />;
      case "zap": return <Zap className="w-4.5 h-4.5 text-orange-400" />;
      case "star": return <Star className="w-4.5 h-4.5 text-cyan-400" />;
      default: return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />;
    }
  };

  const selectQuickPrompt = (promptText: string) => {
    setChatInput(promptText);
  };

  return (
    <div className={`flex-1 p-8 text-white min-h-screen bg-gradient-to-b ${ambientBgClass} transition-colors duration-1000 pb-20 overflow-y-auto font-sans`}>
      
      {/* Top OS Header Section */}
      <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2.5 rounded-2xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Brain className="w-7 h-7 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                Predictive AI Analytics Node
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Active Core: Gemini Pro Engine</span>
                <span className="text-gray-600">•</span>
                <span>Confidence Threshold: {activeAuditData.confidence}%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Smart Rescheduler Trigger */}
        <div className="flex items-center gap-3 self-start xl:self-center">
          <button
            onClick={handleSmartReschedule}
            disabled={loadingReschedule}
            className="relative group overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.35)] hover:shadow-[0_0_25px_rgba(79,70,229,0.55)] transition-all flex items-center gap-2.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingReschedule ? 'animate-spin' : ''}`} />
            <span>Engage Smart Rescheduler</span>
          </button>
        </div>
      </header>

      {/* Auto-Rescheduled Logging */}
      <AnimatePresence>
        {rescheduleLog && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{rescheduleLog}</span>
            </div>
            <button onClick={() => setRescheduleLog(null)} className="text-emerald-400 hover:text-white font-extrabold text-sm ml-2">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Panel / Empty State */}
      {hasInsuffData ? (
        <div className="max-w-3xl mx-auto my-12 bg-[#121535]/60 border border-[#1f2552] rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent from-indigo-500/10 to-transparent pointer-events-none opacity-40" />
          <Brain className="w-16 h-16 text-indigo-400 mx-auto mb-5 animate-pulse" />
          <h3 className="text-2xl font-display font-extrabold text-white mb-3">Awaiting Study Node Sync</h3>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto mb-8">
            Our predictive workload algorithms require <span className="text-indigo-300 font-bold">at least 3 active tasks</span> in your schedule to calculate risk quotients, study consistency levels, achievements, and customized AI forecasts.
          </p>
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="text-center p-2.5">
              <span className="text-lg font-bold text-indigo-400 block">Step 1</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Add Tasks</span>
            </div>
            <div className="text-center p-2.5">
              <span className="text-lg font-bold text-indigo-400 block">Step 2</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Assign Deadlines</span>
            </div>
            <div className="text-center p-2.5">
              <span className="text-lg font-bold text-indigo-400 block">Step 3</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Sync Dashboard</span>
            </div>
          </div>
        </div>
      ) : loadingPremium ? (
        
        /* Premium Diagnostic Skeleton Loader */
        <div className="max-w-2xl mx-auto my-16 text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={loadingStep}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-indigo-300 font-mono text-xs tracking-widest uppercase font-bold"
            >
              {loadingTexts[loadingStep]}
            </motion.div>
          </AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto pt-6">
            <div className="h-24 bg-[#111435]/40 border border-[#1e244b]/60 rounded-2xl animate-pulse" />
            <div className="h-24 bg-[#111435]/40 border border-[#1e244b]/60 rounded-2xl animate-pulse" />
          </div>
        </div>

      ) : (

        /* Futuristic OS Dashboard Workspace */
        <div className="space-y-6 relative z-10">

          {/* Row 1: Metrics telemetry grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Risk Gauge */}
            <div className={`bg-[#12163b]/75 border p-5 rounded-2xl shadow-xl transition-all duration-500 ${riskAssessment.glowColor} flex items-center justify-between`}>
              <div className="space-y-1.5 pr-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold block">Predictive Risk Level</span>
                <span className={`text-2xl font-black font-display tracking-tight ${riskAssessment.textClass}`}>
                  {riskAssessment.level}
                </span>
                <p className="text-[9px] text-gray-400 leading-snug line-clamp-2">
                  {activeAuditData.riskReason}
                </p>
              </div>
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#10122e" strokeWidth="8" fill="transparent" />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={riskAssessment.level === "Critical" ? "#f43f5e" : riskAssessment.level === "High" ? "#f59e0b" : "#6366f1"}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * riskAssessment.score) / 100 }}
                    transition={{ duration: 1.2 }}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-sm font-extrabold text-white">
                    <AnimatedCounter value={riskAssessment.score} />%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Consistency Progress */}
            <ProgressRing 
              value={completionRate} 
              color="stroke-emerald-500" 
              label="Completion Rate" 
              detail={`${completedCount} of ${totalCount} nodes resolved`} 
            />

            {/* 3. Daily focus index */}
            <ProgressRing 
              value={profile.focusScore || 75} 
              color="stroke-indigo-500" 
              label="Cognitive Spacing" 
              detail={`${profile.dailyWorkHours} hrs ceiling target`} 
            />

            {/* 4. Active Streak Multiplier */}
            <ProgressRing 
              value={Math.min(100, profile.streak * 10)} 
              color="stroke-amber-500" 
              label="Active Streak" 
              detail={`${profile.streak} consecutive day study track`} 
            />
          </div>

          {/* Row 2: Today's AI Status bar */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] rounded-2xl p-5 shadow-xl backdrop-blur-md grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">Today's Executive AI Summary</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-light">
                {activeAuditData.summary}
              </p>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-1.5">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-extrabold block">Primary AI Action</span>
              <p className="text-xs text-cyan-300 font-medium leading-relaxed">
                {activeAuditData.recommendation}
              </p>
            </div>
          </div>

          {/* Row 3: Central Workspace Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Rotating Carousel AI Insights (2/3 Width) */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-indigo-950/40 text-indigo-300 border border-indigo-500/20">
                    Active Reasoning Engine
                  </span>
                </div>

                <div className="mb-4 pb-2 border-b border-[#1e244b]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                    <h3 className="text-white font-display text-sm font-bold">Dynamic Performance Audits</h3>
                  </div>
                  {/* Manual Carousel Buttons */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCarouselIndex(prev => (prev - 1 + activeAuditData.insights.length) % activeAuditData.insights.length)}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-gray-500 px-1.5">
                      {carouselIndex + 1}/{activeAuditData.insights.length}
                    </span>
                    <button 
                      onClick={() => setCarouselIndex(prev => (prev + 1) % activeAuditData.insights.length)}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rotating Carousel container */}
                <div 
                  onMouseEnter={() => setIsCarouselHovered(true)} 
                  onMouseLeave={() => setIsCarouselHovered(false)}
                  className="min-h-[160px] flex flex-col justify-between cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    {activeAuditData.insights.length > 0 && (
                      <motion.div
                        key={carouselIndex}
                        initial={{ opacity: 0, x: 20, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.98 }}
                        transition={{ duration: 0.4 }}
                        onClick={() => {
                          const id = activeAuditData.insights[carouselIndex].id;
                          setExpandedInsights(prev => ({ ...prev, [id]: !prev[id] }));
                        }}
                        className="p-5 bg-slate-950/30 rounded-2xl border border-white/5 shadow-md flex flex-col justify-between relative group hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.06)] transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold border ${
                              activeAuditData.insights[carouselIndex].type === "danger" 
                                ? "bg-rose-950/40 text-rose-300 border-rose-500/20"
                                : activeAuditData.insights[carouselIndex].type === "warning"
                                ? "bg-amber-950/40 text-amber-300 border-amber-500/20"
                                : activeAuditData.insights[carouselIndex].type === "success"
                                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/20"
                                : "bg-indigo-950/40 text-indigo-300 border-indigo-500/20"
                            }`}>
                              {activeAuditData.insights[carouselIndex].badge}
                            </span>
                            <span className="text-xs font-bold text-indigo-400 font-mono">
                              {activeAuditData.insights[carouselIndex].metric}
                            </span>
                          </div>

                          <h4 className="text-white font-extrabold text-sm mb-1.5 flex items-center gap-2">
                            {React.createElement(activeAuditData.insights[carouselIndex].icon || Sparkles, { className: "w-4 h-4 text-cyan-400 shrink-0" })}
                            {activeAuditData.insights[carouselIndex].title}
                          </h4>
                          <p className="text-gray-400 text-xs font-light leading-relaxed mb-1.5">
                            {activeAuditData.insights[carouselIndex].description}
                          </p>
                        </div>

                        {/* Interactive toggle indicators */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                          <span>AI Confidence Score: <strong className="text-gray-300 font-mono">{activeAuditData.insights[carouselIndex].confidence}%</strong></span>
                          <span className="text-indigo-400 font-medium hover:underline flex items-center gap-1">
                            {expandedInsights[activeAuditData.insights[carouselIndex].id] ? "Hide Deep Diagnostics" : "Expand Diagnostics"}
                            <ChevronRight className={`w-3 h-3 transition-transform ${expandedInsights[activeAuditData.insights[carouselIndex].id] ? "rotate-90" : ""}`} />
                          </span>
                        </div>

                        {/* Collapsible details section */}
                        <AnimatePresence>
                          {expandedInsights[activeAuditData.insights[carouselIndex].id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden mt-3.5 pt-3.5 border-t border-white/5 space-y-3.5 text-xs text-gray-400"
                            >
                              <div>
                                <span className="text-[9px] text-gray-500 uppercase font-extrabold tracking-wider block mb-1">Diagnostic Context</span>
                                <p className="italic leading-relaxed text-gray-300">
                                  {activeAuditData.insights[carouselIndex].reasoning}
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-500 uppercase font-extrabold tracking-wider block mb-1">Suggested Execution Path</span>
                                <p className="text-cyan-300 font-semibold leading-relaxed">
                                  {activeAuditData.insights[carouselIndex].action}
                                </p>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1">
                                <span>Related Workload Size:</span>
                                <span className="bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                                  {activeAuditData.insights[carouselIndex].relatedTasksCount} Nodes
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bento Row: Timeline & Forecast Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* A. AI Chronological Timeline */}
                <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <h3 className="text-white font-display text-sm font-bold">AI Chronological Timeline</h3>
                  </div>
                  
                  <div className="relative pl-6 border-l-2 border-indigo-500/20 space-y-4 pt-1">
                    {activeAuditData.timeline.map((item, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider block">{item.time}</span>
                        <span className="text-xs text-gray-300 font-semibold leading-relaxed block mt-0.5">{item.event}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* B. Workload Load Forecast */}
                <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-white font-display text-sm font-bold">Predictive Load Forecast</h3>
                  </div>

                  <div className="space-y-4">
                    {activeAuditData.forecast.map((f, i) => {
                      const isHeavy = f.workload === "Heavy";
                      const isMedium = f.workload === "Medium";
                      const barWidth = isHeavy ? "100%" : isMedium ? "65%" : "30%";
                      const barColor = isHeavy ? "bg-gradient-to-r from-rose-500 to-orange-500" : isMedium ? "bg-gradient-to-r from-indigo-500 to-purple-500" : "bg-gradient-to-r from-emerald-500 to-teal-500";
                      
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="w-16 text-gray-400 font-medium">{f.day}</span>
                          <div className="flex-1 mx-3 bg-slate-900/60 h-2 rounded-full overflow-hidden border border-white/5 relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: barWidth }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className={`h-full rounded-full ${barColor}`}
                            />
                          </div>
                          <div className="w-20 text-right flex items-center justify-end gap-1.5 font-mono">
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              isHeavy ? "text-rose-400 bg-rose-950/40" : isMedium ? "text-indigo-400 bg-indigo-950/40" : "text-emerald-400 bg-emerald-950/40"
                            }`}>
                              {f.workload}
                            </span>
                            <span className="text-gray-500 text-[10px]">({f.tasksCount})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column: Dynamic Achievements & Chat Companion (1/3 Width) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Achievements widget */}
              <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1e244b]/30">
                  <Award className="w-4.5 h-4.5 text-yellow-400" />
                  <h3 className="text-white font-display text-sm font-bold">Performance Achievements</h3>
                </div>

                <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {activeAuditData.achievements.map((ach, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-white/5 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        {getAchievementIcon(ach.icon)}
                        <span className="font-medium text-gray-300">{ach.title}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/10">
                        <Check className="w-3 h-3" /> Unlocked
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat companion widget */}
              <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl flex flex-col justify-between h-[360px] relative">
                
                <div>
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[#1e244b]/30">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <h3 className="text-white font-display text-xs font-bold">AI Workspace Companion</h3>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  {/* Chat messages queue */}
                  <div className="h-44 overflow-y-auto space-y-3 pr-1 text-xs scrollbar-thin">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                          msg.sender === "user" 
                            ? "bg-indigo-600 text-white rounded-tr-none shadow-md" 
                            : "bg-slate-950/70 text-gray-300 rounded-tl-none border border-white/5"
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-950/60 text-gray-500 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* Quick Prompts */}
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => selectQuickPrompt("Provide study spacing strategies.")}
                      className="text-[9px] bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded-md transition-all border border-white/5"
                    >
                      Spacing Tips
                    </button>
                    <button 
                      onClick={() => selectQuickPrompt("How do I avoid fatigue?")}
                      className="text-[9px] bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded-md transition-all border border-white/5"
                    >
                      Avoid Burnout
                    </button>
                  </div>

                  {/* Message submit form */}
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask advice on your schedule..."
                      className="flex-1 bg-black/40 border border-[#1e244b] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-600"
                    />
                    <button 
                      type="submit" 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-center font-bold shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

              </div>

            </div>

          </div>

          {/* Row 4: Motivation Quote */}
          <div className="p-4 bg-indigo-950/20 rounded-2xl border border-indigo-500/10 text-center text-xs text-gray-400 italic">
            " {activeAuditData.motivation} "
          </div>

        </div>
      )}

    </div>
  );
}
