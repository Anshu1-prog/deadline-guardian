import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  Bot, 
  User, 
  Loader2,
  CalendarDays,
  Mail,
  HelpCircle,
  Brain,
  Smile,
  AlertTriangle,
  Gift,
  Coffee,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sliders,
  Settings,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, TabType, AIPlan, UserProfile } from "../types";
import { sendChatMessage } from "../services/apiService";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface FloatingAssistantBotProps {
  tasks?: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  activePlan?: AIPlan | null;
  setActivePlan?: React.Dispatch<React.SetStateAction<AIPlan | null>>;
  allPlans?: AIPlan[];
  setAllPlans?: React.Dispatch<React.SetStateAction<AIPlan[]>>;
  profile?: UserProfile;
  setProfile?: React.Dispatch<React.SetStateAction<UserProfile>>;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export default function FloatingAssistantBot({ 
  tasks = [], 
  setTasks,
  activeTab = "Dashboard",
  setActiveTab,
  activePlan = null,
  setActivePlan,
  allPlans = [],
  setAllPlans,
  profile,
  setProfile,
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen
}: FloatingAssistantBotProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
  const setIsOpen = controlledSetIsOpen !== undefined ? controlledSetIsOpen : setLocalIsOpen;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello. Deadline Guardian is online. I'm ready. What would you like to work on today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [expression, setExpression] = useState<"idle" | "typing" | "smiling" | "thinking" | "warning" | "celebrating">("idle");
  const [overloaded, setOverloaded] = useState(false);
  const [highRiskCount, setHighRiskCount] = useState(0);

  // VOICE / SPEECH STATES
  const [isListening, setIsListening] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // VOICE PREFERENCES
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem("voice_enabled") !== "false");
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => localStorage.getItem("voice_wake_word") === "true");
  const [speechSpeed, setSpeechSpeed] = useState(() => parseFloat(localStorage.getItem("voice_speech_speed") || "1.0"));
  const [voiceVolume, setVoiceVolume] = useState(() => parseFloat(localStorage.getItem("voice_volume") || "1.0"));
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem("voice_selection") || "");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef("");
  
  // Continuous Conversation, Silence & Conversational Memory refs
  const silenceTimeoutRef = useRef<any>(null);
  const continuousConversationTimeoutRef = useRef<any>(null);
  const keepListeningRef = useRef<boolean>(false);
  const recentContextRef = useRef<{ subject?: string; examDate?: string }>({});

  // Dynamic Welcome Message depending on task counts
  useEffect(() => {
    const pendingTasksCount = tasks.filter(t => !t.completed).length;
    let welcomeText = "Hello. Deadline Guardian is online.";
    if (pendingTasksCount > 0) {
      welcomeText += ` You have ${pendingTasksCount} upcoming task${pendingTasksCount > 1 ? "s" : ""}. How can I assist you today?`;
    } else {
      welcomeText += " I'm ready. What would you like to work on today?";
    }
    welcomeText += "\n\nTap the microphone, or say \"Hey Guardian\" to wake me.";

    setMessages(prev =>
      prev.map(m => (m.id === "welcome" ? { ...m, text: welcomeText } : m))
    );
  }, [tasks]);

  // Load available voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices.filter(v => v.lang.startsWith("en")));
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Save voice configurations to local buffers
  useEffect(() => {
    localStorage.setItem("voice_enabled", voiceEnabled ? "true" : "false");
    localStorage.setItem("voice_wake_word", wakeWordEnabled ? "true" : "false");
    localStorage.setItem("voice_speech_speed", speechSpeed.toString());
    localStorage.setItem("voice_volume", voiceVolume.toString());
    localStorage.setItem("voice_selection", selectedVoice);
  }, [voiceEnabled, wakeWordEnabled, speechSpeed, voiceVolume, selectedVoice]);

  // Register global triggers from FAB or external views
  useEffect(() => {
    const handleVoiceTrigger = () => {
      setIsOpen(true);
      setTimeout(() => {
        startSpeechRecognition();
      }, 350);
    };
    window.addEventListener("assistant-voice-trigger", handleVoiceTrigger);
    return () => {
      window.removeEventListener("assistant-voice-trigger", handleVoiceTrigger);
    };
  }, [isListening]);

  // Audio Synthesizer chimes
  const playChime = (type: "activate" | "deactivate" | "success" | "error") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "activate") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === "deactivate") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(392.00, now); // G4
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.12); // C4
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "error") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn("AudioContext chime disabled in browser sandbox:", e);
    }
  };

  // Natural speech out using synthesis
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !voiceEnabled) {
      if (onEndCallback) {
        setTimeout(onEndCallback, 1000);
      }
      return;
    }
    window.speechSynthesis.cancel();

    const cleanMarkdown = text.replace(/[*#_~`\[\]()]+/g, " ");
    const utterance = new SpeechSynthesisUtterance(cleanMarkdown);
    utterance.rate = speechSpeed;
    utterance.volume = voiceVolume;

    if (selectedVoice) {
      const foundVoice = availableVoices.find(v => v.name === selectedVoice);
      if (foundVoice) utterance.voice = foundVoice;
    }
    
    if (onEndCallback) {
      utterance.onend = () => {
        onEndCallback();
      };
      utterance.onerror = () => {
        onEndCallback();
      };
    }
    window.speechSynthesis.speak(utterance);
  };

  // Match voice command
  const matchVoiceCommand = async (transcript: string) => {
    const query = transcript.toLowerCase().trim();
    let speechResponse = "";
    let actionSuccess = false;

    console.log("Processing command intent matching:", query);

    // Stop words
    const stopPhrases = [
      "stop listening", 
      "goodbye", 
      "cancel", 
      "that's all", 
      "that is all", 
      "no thank you", 
      "no thanks", 
      "exit conversation", 
      "done for now"
    ];

    // Navigation Phrases
    const openDashboardPhrases = ["open dashboard", "go to dashboard", "view dashboard", "show dashboard", "dashboard tab"];
    const openCalendarPhrases = ["open calendar", "show calendar", "go to calendar", "view calendar", "display calendar", "check calendar"];
    const openPlannerPhrases = ["open planner", "show planner", "go to planner", "view planner", "display planner", "open study plan", "ai planner", "go to ai planner"];
    const openAnalyticsPhrases = ["open analytics", "show analytics", "go to analytics", "view analytics", "display analytics", "open metrics", "view statistics", "show charts"];

    // Focus / Pomodoro Phrases
    const startFocusPhrases = ["start focus", "begin focus", "open focus", "enter focus", "focus mode on", "start timer", "start pomodoro", "resume pomodoro", "resume timer", "focus now"];
    const pauseFocusPhrases = ["pause focus", "pause timer", "pause pomodoro", "stop pomodoro", "stop timer", "stop focus", "reset pomodoro", "reset timer", "pause focus mode", "stop focus mode"];
    const resumeFocusPhrases = ["resume timer", "resume focus", "resume pomodoro"];

    // Schedule query phrases
    const todayTasksPhrases = ["today's tasks", "tasks today", "schedule today", "what to do today", "today schedule", "show today's tasks", "what should i study now", "what should i do today"];
    const tomorrowTasksPhrases = ["tomorrow's tasks", "tasks tomorrow", "schedule tomorrow", "what to do tomorrow", "tomorrow schedule", "show tomorrow's tasks", "what should i study tomorrow"];
    const deadlinePhrases = ["next deadline", "upcoming deadline", "what are my deadlines", "read deadlines", "show deadlines", "when is my next exam", "when is my exam", "due date"];

    // Action phrases
    const studyPlanPhrases = ["generate study plan", "create study plan", "make study plan", "build study plan", "generate roadmap", "create roadmap", "generate plan"];
    const summarizeProgressPhrases = ["summarize my progress", "explain my progress", "how am i doing", "summarize progress", "my current progress", "am i on track", "check progress"];
    const createGoalPhrases = ["create a goal", "create goal", "add goal", "add a goal", "new goal"];
    const addNotePhrases = ["add note", "create note", "save note", "write note", "new note"];
    const createTaskPhrases = ["create task", "add task", "schedule task", "add a task", "new task", "study task"];
    const deleteTaskPhrases = ["delete task", "remove task", "cancel task", "erase task", "discard task"];
    const completeTaskPhrases = ["complete task", "mark task complete", "finish task", "done with task", "checked off", "check off", "mark complete"];

    // Extract conversational memory context (Date or Subject)
    const dateRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i;
    const dateMatch = query.match(dateRegex);
    if (dateMatch) {
      recentContextRef.current.examDate = `${dateMatch[1]} ${dateMatch[2]}`;
    }

    const subjects = ["dsa", "computer science", "math", "physics", "chemistry", "coding", "database", "algorithms", "biology", "history", "economics", "algebra"];
    for (const sub of subjects) {
      if (query.includes(sub)) {
        recentContextRef.current.subject = sub.toUpperCase();
      }
    }

    // 1. STOP COMMAND
    if (stopPhrases.some(p => query.includes(p))) {
      keepListeningRef.current = false;
      speechResponse = "Done. I've stopped listening. Let me know if you need anything else.";
      actionSuccess = true;
    }
    // 2. OPEN DASHBOARD
    else if (openDashboardPhrases.some(p => query.includes(p))) {
      if (setActiveTab) {
        setActiveTab("Dashboard");
        speechResponse = "Done. I've opened your study cockpit.";
        actionSuccess = true;
      }
    }
    // 3. OPEN CALENDAR
    else if (openCalendarPhrases.some(p => query.includes(p))) {
      if (setActiveTab) {
        setActiveTab("Calendar");
        speechResponse = "Done. Let's inspect your upcoming week.";
        actionSuccess = true;
      }
    }
    // 4. OPEN PLANNER
    else if (openPlannerPhrases.some(p => query.includes(p))) {
      if (setActiveTab) {
        setActiveTab("AI Planner");
        speechResponse = "Done. Let's optimize your goals. Planner is active.";
        actionSuccess = true;
      }
    }
    // 5. OPEN ANALYTICS
    else if (openAnalyticsPhrases.some(p => query.includes(p))) {
      if (setActiveTab) {
        setActiveTab("Analytics");
        speechResponse = "Done. Analytics and progression metrics are online. You're doing great.";
        actionSuccess = true;
      }
    }
    // 6. RESUME FOCUS TIMER
    else if (resumeFocusPhrases.some(p => query.includes(p))) {
      window.dispatchEvent(new CustomEvent("pomodoro-command", { detail: "start" }));
      speechResponse = "Done. Focus timer is back online. Let's get back to it.";
      actionSuccess = true;
    }
    // 7. PAUSE FOCUS TIMER
    else if (pauseFocusPhrases.some(p => query.includes(p))) {
      window.dispatchEvent(new CustomEvent("pomodoro-command", { detail: "pause" }));
      speechResponse = "Done. Focus timer is paused. Take a breath.";
      actionSuccess = true;
    }
    // 8. START FOCUS MODE / TIMER
    else if (startFocusPhrases.some(p => query.includes(p))) {
      window.dispatchEvent(new CustomEvent("focus-mode-command", { detail: "open" }));
      window.dispatchEvent(new CustomEvent("pomodoro-command", { detail: "start" }));
      speechResponse = "Done. Focus unit is now online. Let's lock in.";
      actionSuccess = true;
    }
    // 9. EXPLAIN TODAY'S TASKS
    else if (todayTasksPhrases.some(p => query.includes(p))) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayTasks = tasks.filter(t => t.dueDate === todayStr && !t.completed);
      if (todayTasks.length > 0) {
        speechResponse = `Done. For today, you have: ${todayTasks.map(t => t.title).join(", ")}. Let's check them off.`;
      } else {
        speechResponse = "Your slate is clean today. All targets are clear.";
      }
      actionSuccess = true;
    }
    // 10. SHOW TOMORROW'S TASKS
    else if (tomorrowTasksPhrases.some(p => query.includes(p))) {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      const tomStr = tom.toISOString().split("T")[0];
      const tomTasks = tasks.filter(t => t.dueDate === tomStr && !t.completed);
      if (tomTasks.length > 0) {
        speechResponse = `Done. For tomorrow, you have: ${tomTasks.map(t => t.title).join(", ")}.`;
      } else {
        speechResponse = "No scheduled milestones tomorrow. You have full command of your time.";
      }
      actionSuccess = true;
    }
    // 11. WHAT'S MY NEXT DEADLINE?
    else if (deadlinePhrases.some(p => query.includes(p))) {
      const incomplete = tasks.filter(t => !t.completed).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
      if (incomplete.length > 0) {
        const nextTask = incomplete[0];
        speechResponse = `Your closest upcoming milestone is "${nextTask.title}", due on ${nextTask.dueDate}. You're on track.`;
      } else {
        speechResponse = "You have no upcoming deadlines scheduled. Excellent work.";
      }
      actionSuccess = true;
    }
    // 12. CREATE GOAL
    else if (createGoalPhrases.some(p => query.includes(p))) {
      if (setActiveTab) {
        setActiveTab("AI Planner");
        speechResponse = "Done. I've loaded the study planner. What objective are we aiming for?";
        actionSuccess = true;
      }
    }
    // 13. CREATE TASK
    else if (createTaskPhrases.some(p => query.includes(p))) {
      let title = query
        .replace(/create task|add task|schedule task|add a task|new task|study task/gi, "")
        .trim();
      
      let dueDate = new Date().toISOString().split("T")[0];
      let dateStr = "today";
      
      if (query.includes("tomorrow")) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split("T")[0];
        dateStr = "tomorrow";
      } else if (query.includes("friday")) {
        const today = new Date();
        const currentDay = today.getDay();
        const distance = (5 - currentDay + 7) % 7 || 7;
        today.setDate(today.getDate() + distance);
        dueDate = today.toISOString().split("T")[0];
        dateStr = "Friday";
      } else if (query.includes("next week")) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        dueDate = nextWeek.toISOString().split("T")[0];
        dateStr = "next week";
      } else if (dateMatch) {
        const monthName = dateMatch[1];
        const dayNum = parseInt(dateMatch[2], 10);
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const monthIdx = months.indexOf(monthName.toLowerCase());
        const targetDate = new Date();
        targetDate.setMonth(monthIdx);
        targetDate.setDate(dayNum);
        if (targetDate < new Date()) {
          targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
        dueDate = targetDate.toISOString().split("T")[0];
        dateStr = `${monthName} ${dayNum}`;
      } else if (recentContextRef.current.examDate) {
        const memDate = recentContextRef.current.examDate;
        const matchMem = memDate.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
        if (matchMem) {
          const monthName = matchMem[1];
          const dayNum = parseInt(matchMem[2], 10);
          const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
          const monthIdx = months.indexOf(monthName.toLowerCase());
          const targetDate = new Date();
          targetDate.setMonth(monthIdx);
          targetDate.setDate(dayNum);
          if (targetDate < new Date()) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
          }
          dueDate = targetDate.toISOString().split("T")[0];
          dateStr = `${monthName} ${dayNum}`;
        }
      }

      const cleanTitle = title
        .replace(/tomorrow|friday|next week|today|by\s+\w+/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      const finalTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : "";

      if (finalTitle && setTasks) {
        const newTask: Task = {
          id: `task-voice-${Date.now()}`,
          title: finalTitle,
          description: "Created via Jarvis voice assistant command.",
          dueDate: dueDate,
          category: "Coding",
          priority: "Medium",
          completed: false,
          durationHours: 2.0
        };
        setTasks(prev => [newTask, ...prev]);
        speechResponse = `Done. I've taken care of it. "${finalTitle}" scheduled for ${dateStr}.`;
        actionSuccess = true;
      } else {
        speechResponse = "Please say the task name clearly, for example: Add DSA practice task.";
      }
    }
    // 14. DELETE TASK
    else if (deleteTaskPhrases.some(p => query.includes(p))) {
      const taskTitle = query.replace(/delete task|remove task|cancel task|erase task|discard task/gi, "").trim();
      if (taskTitle && setTasks) {
        const match = tasks.find(t => t.title.toLowerCase().includes(taskTitle));
        if (match) {
          setTasks(prev => prev.filter(t => t.id !== match.id));
          speechResponse = `Done. I've removed the task "${match.title}".`;
          actionSuccess = true;
        } else {
          speechResponse = `I couldn't find any task matching "${taskTitle}".`;
        }
      } else {
        speechResponse = "Please specify which task you want to remove.";
      }
    }
    // 15. MARK TASK COMPLETE
    else if (completeTaskPhrases.some(p => query.includes(p))) {
      const taskTitle = query.replace(/complete task|mark task complete|finish task|done with task|checked off|check off|mark complete/gi, "").replace(/task/gi, "").trim();
      if (taskTitle && setTasks) {
        const match = tasks.find(t => t.title.toLowerCase().includes(taskTitle));
        if (match) {
          setTasks(prev => prev.map(t => t.id === match.id ? { ...t, completed: true } : t));
          speechResponse = `Done. Marked "${match.title}" as completed. You're on track.`;
          actionSuccess = true;
        } else {
          speechResponse = `I couldn't find any task matching "${taskTitle}".`;
        }
      } else {
        speechResponse = "Please specify which task you've completed.";
      }
    }
    // 16. GENERATE STUDY PLAN
    else if (studyPlanPhrases.some(p => query.includes(p))) {
      if (setActiveTab) {
        setActiveTab("AI Planner");
        const memorySub = recentContextRef.current.subject;
        const memoryDate = recentContextRef.current.examDate;
        if (memorySub || memoryDate) {
          speechResponse = `Done. Let's get started creating a study plan for ${memorySub || "your targets"}${memoryDate ? " due on " + memoryDate : ""}.`;
        } else {
          speechResponse = "Done. I've loaded the study planner. Let's outline your academic roadmap.";
        }
        actionSuccess = true;
      }
    }
    // 17. SUMMARIZE PROGRESS
    else if (summarizeProgressPhrases.some(p => query.includes(p))) {
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const streak = profile?.streak || 0;
      speechResponse = `Done. You've completed ${completed} out of ${total} tasks, representing a ${pct}% completion rate. Your current focus streak is at ${streak} days. You're on track.`;
      actionSuccess = true;
    }
    // 18. ADD NOTE
    else if (addNotePhrases.some(p => query.includes(p))) {
      const noteText = query.replace(/add note|create note|save note|write note|new note/gi, "").trim();
      if (noteText) {
        const existingNotes = JSON.parse(localStorage.getItem("deadline_guardian_notes") || "[]");
        const newNote = {
          id: `note-${Date.now()}`,
          content: noteText,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem("deadline_guardian_notes", JSON.stringify([newNote, ...existingNotes]));
        window.dispatchEvent(new CustomEvent("notes-updated"));
        speechResponse = `Done. Saved note: "${noteText}" to your scratchpad.`;
        actionSuccess = true;
      } else {
        speechResponse = "Please specify what you want to write in the note.";
      }
    }
    // 19. CONVERSATIONAL MEMORY STATEMENT (e.g., "My exam is July 20")
    else if (query.includes("exam is") || query.includes("test is") || query.includes("deadline is")) {
      const memoryParts = [];
      if (recentContextRef.current.subject) memoryParts.push(`for ${recentContextRef.current.subject}`);
      if (recentContextRef.current.examDate) memoryParts.push(`on ${recentContextRef.current.examDate}`);
      
      if (memoryParts.length > 0) {
        speechResponse = `Understood. I've noted your target ${memoryParts.join(" ")}. I am ready to schedule study sessions or create a roadmap.`;
        actionSuccess = true;
      }
    }

    // 20. GENERAL CONVERSATION FALLBACK (Passed to Gemini API)
    if (!speechResponse) {
      try {
        setIsLoading(true);
        const historyPayload = messages.map(msg => ({ sender: msg.sender, text: msg.text }));
        
        // Enrich message with conversational memory context
        let enrichedMessage = transcript;
        if (recentContextRef.current.subject || recentContextRef.current.examDate) {
          const contextStr = `[Context: User's target subject is ${recentContextRef.current.subject || "unknown"} and target exam date is ${recentContextRef.current.examDate || "unknown"}] `;
          enrichedMessage = contextStr + transcript;
        }

        const data = await sendChatMessage(enrichedMessage, historyPayload);
        if (data && data.success) {
          speechResponse = data.reply || "I'm ready. What would you like to focus on next?";
        } else {
          speechResponse = "Understood. Let me know how I can help streamline your study goals.";
        }
      } catch (e) {
          console.error("Gemini Voice Error:", e);

          speechResponse =
            "I couldn't connect to Gemini. Please check the server logs.";

          setMessages(prev => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              sender: "system",
              text: String(e),
              timestamp: new Date(),
            },
          ]);
        } finally {
        setIsLoading(false);
      }
      actionSuccess = true;
    }

    if (speechResponse) {
      if (actionSuccess) {
        playChime("success");
      } else {
        playChime("error");
      }
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-bot`,
        sender: "bot",
        text: speechResponse,
        timestamp: new Date()
      }]);
      
      // Speak the response and keep listening for continuous conversational flow unless stop phrased
      speakText(speechResponse, () => {
        if (keepListeningRef.current && isOpen && !isListening) {
          setTimeout(() => {
            if (keepListeningRef.current && !isListening) {
              startSpeechRecognition();
            }
          }, 300);
        }
      });
    }
  };

  // Start Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Try Google Chrome or Safari.");
      return;
    }

    if (isListening) {
      keepListeningRef.current = false;
      stopSpeechRecognition();
      return;
    }

    // Temporarily pause continuous background wake-word listening
    if (wakeWordRecognitionRef.current) {
      try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = "en-IN";

    // Set initial continuous session state to true
    keepListeningRef.current = true;

    rec.onstart = () => {
      setIsListening(true);
      setLiveTranscription("");
      latestTranscriptRef.current = "";
      playChime("activate");
      setExpression("typing");

      // Inactivity timeout: if user says absolutely nothing for 8 seconds, stop listening
      if (continuousConversationTimeoutRef.current) {
        clearTimeout(continuousConversationTimeoutRef.current);
      }
      continuousConversationTimeoutRef.current = setTimeout(() => {
        if (!latestTranscriptRef.current.trim()) {
          keepListeningRef.current = false;
          stopSpeechRecognition();
        }
      }, 8000);
    };

     rec.onresult = (event: any) => {
      // Clear inactivity timeout since user spoke
      if (continuousConversationTimeoutRef.current) {
        clearTimeout(continuousConversationTimeoutRef.current);
        continuousConversationTimeoutRef.current = null;
      }

      // Clear any previous silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const combined = finalTranscript || interimTranscript;
      setLiveTranscription(combined);

      if (combined.trim()) {
        latestTranscriptRef.current = combined.trim();
      }

      // Silence detection: if user stops speaking for 1.5 seconds, auto-stop and execute command!
      silenceTimeoutRef.current = setTimeout(() => {
        if (latestTranscriptRef.current.trim()) {
          rec.stop();
        }
      }, 1500);
    };

    rec.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);

      setIsListening(false);
      recognitionRef.current = null;
      playChime("error");
      setExpression("idle");

      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (continuousConversationTimeoutRef.current) clearTimeout(continuousConversationTimeoutRef.current);

      if (event.error === "not-allowed") {
        alert("Microphone permission denied. Please allow microphone access in your browser settings to use voice commands.");
        keepListeningRef.current = false;
        return;
      }

      if (event.error === "no-speech") {
        console.warn("No speech detected.");
      }

      setTimeout(() => {
        if (wakeWordEnabled && !isListening) {
          startWakeWordListening();
        }
      }, 800);
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      setExpression("idle");
      playChime("deactivate");

      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (continuousConversationTimeoutRef.current) clearTimeout(continuousConversationTimeoutRef.current);

      const finalTrans = latestTranscriptRef.current.trim();

      if (finalTrans.length > 0) {
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}-user`,
            sender: "user",
            text: finalTrans,
            timestamp: new Date()
          }
        ]);

        matchVoiceCommand(finalTrans);
      } else {
        // Silent closure, restore background wake-word listening
        setTimeout(() => {
          if (wakeWordEnabled && !isListening) {
            startWakeWordListening();
          }
        }, 800);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSpeechRecognition = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (continuousConversationTimeoutRef.current) {
      clearTimeout(continuousConversationTimeoutRef.current);
      continuousConversationTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    playChime("deactivate");
  };

  // Background continuous wake-word listening ("Hey Guardian" / "Hey Deadline")
  const startWakeWordListening = () => {
    if (!wakeWordEnabled) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (wakeWordRecognitionRef.current) {
      try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
    }

    const wakeRec = new SpeechRecognition();
    wakeRec.continuous = true;
    wakeRec.interimResults = false;
    wakeRec.lang = "en-IN";

    wakeRec.onresult = (e: any) => {
      const results = e.results;
      const lastResult = results[results.length - 1][0].transcript.toLowerCase();
      
      if (
        lastResult.includes("hey guardian") || 
        lastResult.includes("hey deadline") || 
        lastResult.includes("guardian") || 
        lastResult.includes("deadline")
      ) {
        console.log("Wake word triggered!");
        try { wakeRec.stop(); } catch (err) {}
        setIsOpen(true);
        setTimeout(() => {
          startSpeechRecognition();
        }, 500);
      }
    };

    wakeRec.onend = () => {
      if (wakeWordEnabled && !isListening) {
        setTimeout(() => {
          if (
            wakeWordEnabled &&
            !recognitionRef.current
          ) {
            try {
              wakeRec.start();
            } catch {}
          }
        }, 1500);
      }
    };

    wakeWordRecognitionRef.current = wakeRec;
    try {
      wakeRec.start();
    } catch (err) {
      console.warn("Failed to boot continuous wake-word: ", err);
    }
  };

  // Toggle Wake-word
  useEffect(() => {
    if (wakeWordEnabled) {
      startWakeWordListening();
    } else {
      if (wakeWordRecognitionRef.current) {
        try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
      }
    }
    return () => {
      if (wakeWordRecognitionRef.current) {
        try { wakeWordRecognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [wakeWordEnabled, isListening]);

  // Handle standard text submit
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsgText = input.trim();
    setInput("");
    
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: userMsgText,
      timestamp: new Date()
    }]);

    matchVoiceCommand(userMsgText);
  };

  // Trigger typing & thinking states as the user inputs characters
  useEffect(() => {
    if (input.trim().length > 0) {
      setExpression("typing");
      const delay = setTimeout(() => {
        setExpression("thinking");
      }, 700);
      return () => clearTimeout(delay);
    } else {
      setExpression("idle");
    }
  }, [input]);

  // Track completed tasks to smile/celebrate dynamically
  const prevCompletedCount = useRef(0);
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount > prevCompletedCount.current && prevCompletedCount.current > 0) {
      setExpression("smiling");
      const systemMsg: Message = {
        id: `msg-completed-notif-${Date.now()}`,
        sender: "bot",
        text: "🎉 Splendid progress! You checked off a study milestone. My internal algorithms are celebrating! Keep pushing towards your target deadline!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMsg]);
      speakText(systemMsg.text);
      const backToIdle = setTimeout(() => {
        setExpression("idle");
      }, 4500);
      return () => clearTimeout(backToIdle);
    }
    prevCompletedCount.current = completedCount;
  }, [tasks]);

  // Track high-risk overdue parameters
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const overdue = tasks.filter(t => !t.completed && t.dueDate < today).length;
    const highPriorityCount = tasks.filter(t => !t.completed && t.priority === "High").length;
    
    setHighRiskCount(overdue + highPriorityCount);
    
    if (overdue > 0) {
      setExpression("warning");
    } else {
      setExpression("idle");
    }

    const activeTasksCount = tasks.filter(t => !t.completed).length;
    setOverloaded(activeTasksCount > 5);
  }, [tasks]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const selectSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div id="floating-bot-root" className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end gap-3.5">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="bot-window"
            id="bot-chat-window"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="w-80 sm:w-[410px] h-[520px] bg-[#0c0f2a]/95 border border-[#1e244b] rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-md relative"
          >
            
            {/* HEADER AREA */}
            <div className="bg-gradient-to-r from-[#12163b] to-[#1a1f4d] p-4 border-b border-[#1e244b] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9.5 h-9.5 rounded-xl bg-[#090b1e] border border-[#1e244b] flex items-center justify-center shrink-0">
                  {expression === "typing" && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
                  {expression === "thinking" && <Brain className="w-5 h-5 text-pink-400 animate-pulse" />}
                  {expression === "smiling" && <Smile className="w-5 h-5 text-emerald-400" />}
                  {expression === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />}
                  {expression === "celebrating" && <Gift className="w-5 h-5 text-purple-400" />}
                  {expression === "idle" && <Bot className="w-5 h-5 text-cyan-400" />}
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold font-display flex items-center gap-1.5 leading-none">
                    Guardian AI
                    {isListening && <span className="text-[9px] text-rose-400 animate-pulse font-mono flex items-center gap-1">● MIC</span>}
                  </h4>
                  <span className="text-[9px] text-[#22d3ee] font-mono leading-none tracking-widest uppercase">
                    Jarvis Voice Assistant Connected
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${showVoiceSettings ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-300" : "text-gray-400 hover:text-white border-transparent hover:bg-white/5"}`}
                  title="Voice Settings"
                >
                  <Settings className="w-4.5 h-4.5" />
                </button>
                <button
                  id="close-chat-btn"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* INTEGRATED VOICE PREFERENCES SETTINGS PANEL */}
            <AnimatePresence>
              {showVoiceSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-[#12163b]/95 border-b border-[#1e244b] p-4 space-y-3 text-xs overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1e244b]/40">
                    <span className="font-bold text-white uppercase tracking-wider text-[10px]">Jarvis Voice Configurations</span>
                    <button onClick={() => setShowVoiceSettings(false)} className="text-gray-400 hover:text-white text-[10px] underline">Close</button>
                  </div>

                  {/* Toggle voice speech */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Enable Assistant Voice (TTS)</span>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`w-11 h-6 rounded-full transition-all relative border ${voiceEnabled ? "bg-cyan-500/20 border-cyan-400" : "bg-slate-800 border-slate-600"}`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${voiceEnabled ? "right-1" : "left-1"}`} />
                    </button>
                  </div>

                  {/* Wake word toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Continuous Wake Word ("Hey Guardian")</span>
                    <button
                      onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                      className={`w-11 h-6 rounded-full transition-all relative border ${wakeWordEnabled ? "bg-indigo-500/20 border-indigo-400" : "bg-slate-800 border-slate-600"}`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${wakeWordEnabled ? "right-1" : "left-1"}`} />
                    </button>
                  </div>

                  {/* Speech speed */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-gray-400 text-[10px]">
                      <span>Speech Pace rate</span>
                      <span className="font-mono">{speechSpeed}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.1" 
                      value={speechSpeed} 
                      onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400" 
                    />
                  </div>

                  {/* Voice volume */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-gray-400 text-[10px]">
                      <span>Voice Volume</span>
                      <span className="font-mono">{Math.round(voiceVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.0" 
                      max="1.0" 
                      step="0.1" 
                      value={voiceVolume} 
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400" 
                    />
                  </div>

                  {/* Voice selection dropdown */}
                  {availableVoices.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-gray-400 text-[10px]">Selected TTS Voice</span>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-[#090b1e] border border-[#1e244b] text-white py-1 px-2 rounded-lg text-[10px]"
                      >
                        <option value="">System Default Voice</option>
                        {availableVoices.map(v => (
                          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* MESSAGE HISTORIES AND TRANSCRIPT BUBBLE */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#07091a]/40 relative">
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "bot" && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 self-start text-cyan-400">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  
                  <div className="max-w-[80%] space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none"
                          : "bg-[#151a4a]/70 border border-[#1e244b]/60 text-gray-200 rounded-tl-none font-light"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="block text-[8px] text-gray-500 text-right pr-1 font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2.5 justify-start items-center">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono italic animate-pulse">
                    Guardian AI thinking...
                  </span>
                </div>
              )}

              {/* LIVE TRANSCRIPTION SUB-WINDOW ON MIC ACTIVE */}
              {isListening && (
                <div className="sticky bottom-0 bg-[#0c0f2a]/95 border border-rose-500/30 p-3 rounded-2xl space-y-2.5 shadow-2xl animate-pulse">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5" /> Speak command now...
                    </span>
                    {/* CSS Waveform representation */}
                    <div className="flex gap-0.5 items-end h-3">
                      <span className="w-0.5 bg-rose-400 rounded-full h-full animate-[bounce_0.6s_infinite_alternate]" />
                      <span className="w-0.5 bg-rose-500 rounded-full h-2/3 animate-[bounce_0.6s_infinite_alternate_0.15s]" />
                      <span className="w-0.5 bg-rose-400 rounded-full h-4/5 animate-[bounce_0.6s_infinite_alternate_0.3s]" />
                      <span className="w-0.5 bg-pink-500 rounded-full h-1/2 animate-[bounce_0.6s_infinite_alternate_0.05s]" />
                    </div>
                  </div>
                  <p className="text-xs text-white italic font-medium">
                    {liveTranscription || "(Listening for your voice...)"}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* SUGGESTED COMMANDS CAROUSEL */}
            <div className="px-4 pt-2 pb-1.5 flex gap-1.5 overflow-x-auto select-none no-scrollbar border-t border-[#1e244b]/20 bg-[#07091a]/40 shrink-0">
              {highRiskCount > 0 && (
                <button
                  onClick={() => selectSuggestion("Why is my risk high? ⚠️")}
                  className="text-[9px] whitespace-nowrap bg-rose-950/20 border border-rose-500/30 text-rose-300 hover:text-white hover:bg-rose-500/25 px-2.5 py-1 rounded-full transition-all cursor-pointer font-bold"
                >
                  ⚠️ Why is risk high?
                </button>
              )}
              <button
                onClick={() => selectSuggestion("What should I do today? 🌱")}
                className="text-[9px] whitespace-nowrap bg-[#12163b]/50 border border-[#1e244b]/40 text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                🌱 Do Today
              </button>
              <button
                onClick={() => selectSuggestion("Explain my schedule 🗓️")}
                className="text-[9px] whitespace-nowrap bg-[#12163b]/50 border border-[#1e244b]/40 text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                🗓️ Explain Schedule
              </button>
              <button
                onClick={() => selectSuggestion("What are my deadlines? ⏰")}
                className="text-[9px] whitespace-nowrap bg-[#12163b]/50 border border-[#1e244b]/40 text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                ⏰ Read Deadlines
              </button>
              <button
                onClick={() => selectSuggestion("Start Pomodoro ⏱️")}
                className="text-[9px] whitespace-nowrap bg-[#12163b]/50 border border-[#1e244b]/40 text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                ⏱️ Start Pomodoro
              </button>
            </div>

            {/* MESSAGE ACTION BUTTONS INPUT */}
            <form
              onSubmit={handleSend}
              className="p-3 bg-gradient-to-t from-[#090b1e] to-[#0c0f2a] border-t border-[#1e244b] flex gap-2 items-center shrink-0"
            >
              
              {/* Floating micro mic button inside chat window input bar */}
              <button
                type="button"
                onClick={startSpeechRecognition}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${isListening ? "bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse" : "bg-[#12163b]/50 border-[#1e244b] text-gray-400 hover:text-cyan-400"}`}
                title="Speak to Assistant"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask or say command..."
                disabled={isLoading}
                className="flex-1 bg-[#12163b]/40 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-500 outline-none transition-all "
              />
              <button
                type="submit"
                id="send-msg-btn"
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl disabled:opacity-40 shrink-0 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
