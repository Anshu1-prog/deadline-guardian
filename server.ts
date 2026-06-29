import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const memory = new Map<string, any[]>();

const isProduction = process.env.NODE_ENV === "production";
const PORT = 3000;

// Lazy initialize Gemini client safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or uses placeholder");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Fallback smart dynamic planner in case the API key is not yet configured or fails
function getMockGeneratedPlan(objective: string, deadlineStr: string, skillLevel: string = "Intermediate", commitment: string = "Moderate (3-4 hrs)", academicTone: string = "Friendly Advisor") {
  // Test comment
  const norm = objective.trim() || "Achieve Success";
  const deadline = deadlineStr || "2026-06-30";

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
  const targetDate = new Date(deadline);
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
    ]
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Config endpoint to verify key configuration status
  app.get("/api/config", (req, res) => {
    const hasGemini = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({
      success: true,
      hasGemini,
      isProduction
    });
  });

  // API Routes
  app.post("/api/generate", async (req, res) => {
  const response = await client.models.generateContent({
  model: "models/gemini-2.5-flash",
  contents: prompt,
  config: {
    temperature: 0.3,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        planName: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              durationHours: { type: Type.NUMBER },
              dayOffset: { type: Type.INTEGER }
            },
            required: ["title", "description", "durationHours", "dayOffset"]
          }
        },
        estimatedTotalHours: { type: Type.NUMBER },
        milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
        difficultyAnalysis: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING },
            reason: { type: Type.STRING }
          }
        },
        dailySchedule: { type: Type.ARRAY },
        weeklySchedule: { type: Type.ARRAY },
        revisionSchedule: { type: Type.ARRAY },
        bufferDays: { type: Type.INTEGER },
        progressCheckpoints: { type: Type.ARRAY }
      },
      required: [
        "planName",
        "steps",
        "estimatedTotalHours",
        "milestones",
        "difficultyAnalysis",
        "dailySchedule",
        "weeklySchedule",
        "revisionSchedule",
        "bufferDays",
        "progressCheckpoints"
      ]
    }
  }
});

// ✅ FIX 1: correct extraction
const responseText = response.text();

if (!responseText) {
  throw new Error("Empty response from Gemini");
}

// remove markdown fences safely
let cleanedText = responseText.trim();

if (cleanedText.startsWith("```")) {
  cleanedText = cleanedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

// parse JSON safely
const parsedPlan = JSON.parse(cleanedText);

// ✅ IMPORTANT: RETURN SUCCESS (THIS WAS MISSING)
return res.json({
  success: true,
  plan: parsedPlan
});
  });

  // Multiturn chat bot endpoint utilizing gemini-3.5-flash
 app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body;

  const lowerMsg = message.toLowerCase();

const isPlannerRequest =
  lowerMsg.includes("plan") ||
  lowerMsg.includes("schedule") ||
  lowerMsg.includes("roadmap") ||
  lowerMsg.includes("study") ||
  lowerMsg.includes("revise") ||
  lowerMsg.includes("routine");

  if (!message) {
    return res.status(400).json({ error: "Missing message parameter" });
  }

  try {
    const client = getGeminiClient();

    const userId = req.ip; // identifies user

const previousHistory = memory.get(userId) || [];

const contents = previousHistory.map((msg: any) => ({
  role: msg.sender === "user" ? "user" : "model",
  parts: [{ text: msg.text }]
}));

contents.push({
  role: "user",
  parts: [{ text: message }]
});
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const MODELS = [
      "models/gemini-2.5-flash",
      "models/gemini-2.0-flash",
      "models/gemini-flash-latest"
    ];

    let response: any = null;

    for (const model of MODELS) {
      try {
        response = await client.models.generateContent({
          model,
          contents,
          config: {
  systemInstruction: isPlannerRequest
  ? `You are Deadline Guardian Planner AI.

You MUST return ONLY valid JSON.

Format:
{
  "planName": string,
  "totalDurationDays": number,
  "dailyPlan": [
    {
      "day": number,
      "tasks": string[],
      "focus": string
    }
  ],
  "milestones": string[],
  "revisionPlan": string[]
}

Rules:
- No markdown
- No explanation
- Only JSON output`
  : `You are Deadline Guardian Chatbot. Be friendly and concise.`
}
        });

        // ==============================
// STEP 3.2: SAFE RESPONSE PARSING
// ==============================

if (!response) {
  throw new Error("No response from Gemini");
}

let text = "";

// Case 1: modern SDK (most reliable)
if (typeof response.text === "function") {
  text = response.text();
}

// Case 2: fallback structure
if (!text) {
  text =
    response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";
}

// Debug if still empty
if (!text) {
  console.log("FULL GEMINI RESPONSE:", JSON.stringify(response, null, 2));
  throw new Error("Empty Gemini response");
}
return res.json({
  success: true,
  reply: text
});

        break; // success → stop loop
      } catch (err) {
        console.log("Failed model:", model);
      }
    }

    if (!response) {
      return res.status(503).json({
        success: false,
        reply: "All models are busy. Try again later."
      });
    }

    // ✅ CORRECT TEXT EXTRACTION (IMPORTANT FIX)
    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const updatedHistory = [
  ...previousHistory,
  { sender: "user", text: message },
  { sender: "model", text }
];

memory.set(userId, updatedHistory.slice(-20)); // keep last 20 messages

    return res.json({
      success: true,
      reply: text || "Empty response from Gemini"
    });

  } catch (error: any) {
    console.warn("API error:", error?.message || error);

    return res.status(500).json({
      success: false,
      reply: "",
      error: "Gemini failed"
    });
  }
});

  // Serve static assets or use Vite middleware
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Deadline Guardian Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot Deadline Guardian custom server:", err);
});
