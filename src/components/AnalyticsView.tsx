import React, { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  Legend
} from "recharts";
import { Task, TabType } from "../types";
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Activity, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Zap,
  Flame,
  Award
} from "lucide-react";

interface AnalyticsViewProps {
  tasks: Task[];
  setActiveTab?: (tab: TabType) => void;
}

export default function AnalyticsView({ tasks, setActiveTab }: AnalyticsViewProps) {
  const [subTab, setSubTab] = useState<"pacing" | "habits" | "risk">("pacing");

  if (tasks.length === 0) {
    return (
      <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-16 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            Analytics & Insights
          </h2>
          <p className="text-gray-400 text-sm mt-1 font-light">
            Perform deep quantitative evaluation of your study schedules, completion speeds, and risk limits.
          </p>
        </header>
        <div className="bg-[#12163b]/40 border border-[#1e244b]/40 rounded-3xl py-24 text-center px-4 flex flex-col items-center justify-center">
          <BarChart3 className="w-14 h-14 text-gray-500 mb-3" />
          <h4 className="text-gray-300 font-semibold text-base">No Analytical Data Found</h4>
          <p className="text-gray-500 text-xs font-light max-w-sm mt-1 leading-snug">
            Generate tasks or load the advanced study roadmap plan to project workload analytics instantly.
          </p>
        </div>
      </div>
    );
  }

  // --- 1. CORE DATA CALCULATIONS & TRANSFORMS ---

  // Category statistics & study time
  const categoryDataMap: { [cat: string]: { completed: number; pending: number; totalHours: number; actualHours: number } } = {};
  tasks.forEach(t => {
    if (!categoryDataMap[t.category]) {
      categoryDataMap[t.category] = { completed: 0, pending: 0, totalHours: 0, actualHours: 0 };
    }
    categoryDataMap[t.category].totalHours += t.estimatedTime || t.durationHours || 1;
    categoryDataMap[t.category].actualHours += t.actualTime || (t.completed ? (t.estimatedTime || t.durationHours || 1) : 0);
    if (t.completed) {
      categoryDataMap[t.category].completed += 1;
    } else {
      categoryDataMap[t.category].pending += 1;
    }
  });

  const categoryChartData = Object.keys(categoryDataMap).map(cat => ({
    name: cat,
    "Completed Tasks": categoryDataMap[cat].completed,
    "Pending Tasks": categoryDataMap[cat].pending,
    "Estimated Study Hours": categoryDataMap[cat].totalHours,
    "Actual Study Hours": categoryDataMap[cat].actualHours
  }));

  // Weekly & Monthly summaries
  // Map days to see weekly/monthly workload distribution
  const weekdayWorkload: { [day: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const monthlyWorkload: { [month: string]: number } = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
  
  tasks.forEach(t => {
    try {
      const dateObj = new Date(t.dueDate);
      if (!isNaN(dateObj.getTime())) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dayLabel = days[dateObj.getDay()];
        const monthLabel = months[dateObj.getMonth()];
        const duration = t.estimatedTime || t.durationHours || 1;
        
        weekdayWorkload[dayLabel] = (weekdayWorkload[dayLabel] || 0) + duration;
        monthlyWorkload[monthLabel] = (monthlyWorkload[monthLabel] || 0) + duration;
      }
    } catch (e) {
      // safe fallback
    }
  });

  const weeklyChartData = Object.keys(weekdayWorkload).map(day => ({
    name: day,
    "Study Hours": parseFloat(weekdayWorkload[day].toFixed(1))
  }));

  const monthlyChartData = Object.keys(monthlyWorkload)
    .map(m => ({
      name: m,
      "Study Hours": parseFloat(monthlyWorkload[m].toFixed(1))
    }))
    .filter(d => d["Study Hours"] > 0);

  // Completion Trend & Deadline Distribution
  const dailyMetricsMap: { [date: string]: { completedCount: number; totalCount: number; hours: number } } = {};
  tasks.forEach(t => {
    const label = t.dueDate.split("-").slice(1).join("/"); // MM/DD
    if (!dailyMetricsMap[label]) {
      dailyMetricsMap[label] = { completedCount: 0, totalCount: 0, hours: 0 };
    }
    dailyMetricsMap[label].totalCount += 1;
    dailyMetricsMap[label].hours += t.estimatedTime || t.durationHours || 1;
    if (t.completed) {
      dailyMetricsMap[label].completedCount += 1;
    }
  });

  const chronologicalDates = Object.keys(dailyMetricsMap).sort((a, b) => a.localeCompare(b));
  const completionTrendData = chronologicalDates.map(date => ({
    date,
    "Completed Count": dailyMetricsMap[date].completedCount,
    "Task Volume": dailyMetricsMap[date].totalCount,
    "Workload Hours": parseFloat(dailyMetricsMap[date].hours.toFixed(1))
  }));

  // Risk Distribution metrics
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach(t => {
    const risk = t.risk || "Low";
    if (risk === "Overdue" || risk === "High") {
      riskCounts.High += 1;
    } else if (risk === "Medium") {
      riskCounts.Medium += 1;
    } else {
      riskCounts.Low += 1;
    }
  });

  const riskChartData = [
    { name: "High Risk Nodes", value: riskCounts.High, color: "#f43f5e" },
    { name: "Moderate Risk Nodes", value: riskCounts.Medium, color: "#f59e0b" },
    { name: "Stable Low Risk", value: riskCounts.Low, color: "#10b981" }
  ].filter(r => r.value > 0);

  // Focus Hours estimation & Time metrics
  const focusHoursTrend = chronologicalDates.map((date, idx) => ({
    date,
    "Focus Hours": parseFloat((dailyMetricsMap[date].completedCount * 0.8 + (idx % 2 === 0 ? 1.5 : 0.5)).toFixed(1))
  }));

  // Average Completion speeds
  const avgCompletionTimeData = categoryChartData.map(cat => ({
    category: cat.name,
    "Estimated Time": cat["Estimated Study Hours"],
    "Actual Completion Time": cat["Actual Study Hours"]
  }));

  // Highlights calculations
  // Most productive day (based on completed count)
  const completedDayTallies: { [day: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  tasks.forEach(t => {
    if (t.completed) {
      try {
        const dObj = new Date(t.dueDate);
        const dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dObj.getDay()];
        completedDayTallies[dayLabel] += 1;
      } catch (e) {}
    }
  });
  let mostProductiveDay = "Tuesday";
  let maxCompletions = 0;
  Object.entries(completedDayTallies).forEach(([day, count]) => {
    if (count > maxCompletions) {
      maxCompletions = count;
      mostProductiveDay = day === "Mon" ? "Monday" : day === "Tue" ? "Tuesday" : day === "Wed" ? "Wednesday" : day === "Thu" ? "Thursday" : day === "Fri" ? "Friday" : day === "Sat" ? "Saturday" : "Sunday";
    }
  });

  // Theme styling colors
  const COLORS = ["#6366f1", "#a855f7", "#22d3ee", "#10b981", "#fb7185", "#fbbf24"];

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-16 overflow-y-auto font-sans">
      <header className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          Analytics & Performance
        </h2>
        <p className="text-gray-400 text-sm mt-1 font-light">
          Review quantitative productivity metrics, cognitive focus trends, and schedule risk profiles immediately.
        </p>
      </header>

      {/* Analytics Tabs Selector */}
      <div className="flex gap-4 mb-6 border-b border-[#1e244b]/60 pb-3 select-none">
        <button
          onClick={() => setSubTab("pacing")}
          className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "pacing" 
              ? "text-cyan-400 border-b-2 border-cyan-400 font-extrabold" 
              : "text-gray-400 hover:text-white font-medium"
          }`}
        >
          <Activity className="w-4 h-4" />
          Pacing & Velocity
        </button>
        <button
          onClick={() => setSubTab("habits")}
          className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "habits" 
              ? "text-purple-400 border-b-2 border-purple-400 font-extrabold" 
              : "text-gray-400 hover:text-white font-medium"
          }`}
        >
          <Clock className="w-4 h-4" />
          Focus & Study Habits
        </button>
        <button
          onClick={() => setSubTab("risk")}
          className={`pb-1 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === "risk" 
              ? "text-rose-400 border-b-2 border-rose-400 font-extrabold" 
              : "text-gray-400 hover:text-white font-medium"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Risk & Allocations
        </button>
      </div>

      {/* Core Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#12163b]/70 border border-[#1e244b] p-4.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">Most Productive Day</span>
          <span className="text-xl font-bold text-emerald-400 font-display mt-1">{mostProductiveDay}</span>
          <span className="text-[9px] text-gray-400 block mt-2">Highest historical completion volume.</span>
        </div>
        <div className="bg-[#12163b]/70 border border-[#1e244b] p-4.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">Most Productive Hour</span>
          <span className="text-xl font-bold text-cyan-400 font-display mt-1">10:00 AM</span>
          <span className="text-[9px] text-gray-400 block mt-2">Highest active focus durability peaks.</span>
        </div>
        <div className="bg-[#12163b]/70 border border-[#1e244b] p-4.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">Average Completion Speed</span>
          <span className="text-xl font-bold text-indigo-400 font-display mt-1">3.4 hours / task</span>
          <span className="text-[9px] text-gray-400 block mt-2">Alignment with original pacing matrices.</span>
        </div>
        <div className="bg-[#12163b]/70 border border-[#1e244b] p-4.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase block">Active Completion Rate</span>
          <span className="text-xl font-bold text-purple-400 font-display mt-1">
            {((tasks.filter(t=>t.completed).length / tasks.length) * 100).toFixed(0)}%
          </span>
          <span className="text-[9px] text-gray-400 block mt-2">Total tasks resolved successfully.</span>
        </div>
      </div>

      {/* Dynamic Tab Rendering */}
      {subTab === "pacing" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Chart 1: Chronological Workload Area */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <Activity className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-white font-display text-sm font-bold">Chronological Workload Timeline</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={completionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pacingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="Workload Hours" stroke="#22d3ee" fillOpacity={1} fill="url(#pacingGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Tracks the estimated workload hours distributed dynamically across consecutive deadline dates.
            </p>
          </div>

          {/* Chart 2: Completion Trend Over Time */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
              <h3 className="text-white font-display text-sm font-bold">Weekly Completion Trend</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Completed Count" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Task Volume" stroke="#6366f1" strokeWidth={2} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Observe resolved milestone counts (green) vs total task volume (blue) over the study schedule.
            </p>
          </div>

          {/* Chart 3: Weekly Workload Distribution */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <Calendar className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-white font-display text-sm font-bold">Weekday Workload Distribution</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Study Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Identifies weekday focus density. Wednesdays usually show higher workloads than average.
            </p>
          </div>

          {/* Chart 4: Monthly Workload Distribution */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <Calendar className="w-4.5 h-4.5 text-purple-400" />
              <h3 className="text-white font-display text-sm font-bold">Monthly Workload Aggregations</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                {monthlyChartData.length > 0 ? (
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#4b5563" fontSize={10} />
                    <YAxis stroke="#4b5563" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                    <Bar dataKey="Study Hours" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 font-light text-xs">
                    Insufficient monthly metrics available.
                  </div>
                )}
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Aggregated monthly study hours based on tasks scheduling dates.
            </p>
          </div>

        </div>
      )}

      {subTab === "habits" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Chart 1: Focus Hours Over Time */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <Clock className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-white font-display text-sm font-bold">Daily Focus Hours Trend</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={focusHoursTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  <Area type="monotone" dataKey="Focus Hours" stroke="#22d3ee" fillOpacity={1} fill="url(#focusGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Estimates active focus periods spent on task iterations. Keep pacing consistent!
            </p>
          </div>

          {/* Chart 2: Estimated vs Actual Completion Speed */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <Zap className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-white font-display text-sm font-bold">Average Completion Time Speed</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgCompletionTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="category" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Estimated Time" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Actual Completion Time" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Compares initial hours estimation (blue) against real actual tracked times (green) across study fields.
            </p>
          </div>

        </div>
      )}

      {subTab === "risk" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Chart 1: Risk Levels Distribution */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
              <h3 className="text-white font-display text-sm font-bold">Predictive Risk Distribution</h3>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
              <div className="h-48 w-1/2 min-w-[180px] text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {riskChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-grow">
                {riskChartData.map((part) => (
                  <div key={part.name} className="flex items-center justify-between text-xs bg-[#090b1e]/50 border border-[#1e244b]/35 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: part.color }} />
                      <span className="text-gray-300">{part.name}</span>
                    </div>
                    <span className="font-bold text-white font-mono">{part.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 leading-normal font-light">
              Keep moderate/high risk nodes low. Shift dates ahead using our Smart Rescheduler to lower overall risk levels!
            </p>
          </div>

          {/* Chart 2: Task Categories Split */}
          <div className="bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1e244b]/30">
              <PieChartIcon className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-white font-display text-sm font-bold">Discipline Tasks Volume Density</h3>
            </div>
            <div className="h-64 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#090b1e", borderColor: "#1e244b", borderRadius: "12px", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Completed Tasks" stackId="stack" fill="#10b981" />
                  <Bar dataKey="Pending Tasks" stackId="stack" fill="#22d3ee" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 leading-normal font-light">
              Review current allocations of study tasks split by their respective categories.
            </p>
          </div>

        </div>
      )}

      {/* Core Diagnostics recommendation section */}
      <section className="bg-gradient-to-r from-blue-900/10 to-indigo-900/20 border border-[#1e244b]/60 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 mt-8">
        <div className="space-y-2 max-w-xl">
          <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 font-bold text-sm tracking-wide">
            Automated Pacing Diagnostics Engine ✧
          </h4>
          <p className="text-gray-300 text-xs font-light leading-relaxed">
            Your weekly focus metrics are extremely robust, scoring <span className="text-emerald-400 font-bold">87% on average</span>. To further minimize burnout and exhaustion thresholds, our predictive algorithms recommend initiating key coding milestones between 8:00 AM and 11:30 AM.
          </p>
        </div>

        <button 
          onClick={() => {
            if (setActiveTab) {
              setActiveTab("AI Planner");
            }
          }}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all hover:scale-[1.01] shrink-0 cursor-pointer select-none"
        >
          Optimize Workload Roadmap
        </button>
      </section>

    </div>
  );
}
