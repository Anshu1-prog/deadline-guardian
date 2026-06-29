export interface ConfigResponse {
  success: boolean;
  hasGemini: boolean;
  isProduction: boolean;
}

export interface GeneratePlanResponse {
  success: boolean;
  source: string;
  plan: any;
  note?: string;
  errorMessage?: string;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/config");
  if (!res.ok) {
    throw new Error(`Config request failed with status ${res.status}`);
  }
  return res.json();
}

export async function generatePlan(
  objective: string,
  deadline: string,
  skillLevel = "Intermediate",
  commitment = "Moderate (3-4 hrs)",
  academicTone = "Friendly Advisor"
): Promise<GeneratePlanResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objective,
      deadline,
      skillLevel,
      commitment,
      academicTone
    })
  });
  if (!res.ok) {
    throw new Error(`Plan generation failed with status ${res.status}`);
  }
  return res.json();
}

export async function sendChatMessage(
  message: string,
  history: { sender: string; text: string }[] = []
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history
    })
  });
  if (!res.ok) {
    throw new Error(`Chat request failed with status ${res.status}`);
  }
  return res.json();
}

export interface InsightsResponse {
  success: boolean;
  insights?: {
    overloadRisk: {
      score: number;
      level: string;
      reason: string;
      recommendation: string;
    };
    burnout: {
      score: number;
      level: string;
      reason: string;
      recommendation: string;
    };
    consistency: {
      streak: number;
      message: string;
      recommendation: string;
    };
    productivity: {
      peakTime: string;
      reason: string;
    };
    scheduling: {
      weakDay: string;
      reason: string;
    };
    overloadBuffer: {
      message: string;
    };
  };
  error?: string;
  message?: string;
}

export async function fetchInsights(
  tasks: any[],
  name: string,
  streak: number
): Promise<InsightsResponse> {
  const query = new URLSearchParams({
    tasks: JSON.stringify(tasks),
    name,
    streak: streak.toString()
  });
  const res = await fetch(`/api/insights?${query.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Insights failed with status ${res.status}`);
  }
  return res.json();
}
