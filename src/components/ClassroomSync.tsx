import React, { useState, useEffect } from "react";
import { BookOpen, GraduationCap, Calendar, Sparkles, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { googleSignIn } from "../utils/workspace";
import { Task } from "../types";

interface ClassroomSyncProps {
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
  setGoogleUser: (user: any | null) => void;
  onSelectAssignment: (title: string, dueDate: string, description: string) => void;
  onDirectCreateTask: (title: string, dueDate: string, description: string) => void;
  onImportAllAssignments: (assignments: { title: string; dueDate: string; description: string }[]) => void;
}

interface Course {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
}

interface CourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  alternateLink?: string;
}

export default function ClassroomSync({
  googleToken,
  setGoogleToken,
  setGoogleUser,
  onSelectAssignment,
  onDirectCreateTask,
  onImportAllAssignments
}: ClassroomSyncProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [courseWorks, setCourseWorks] = useState<CourseWork[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses when token is available
  useEffect(() => {
    if (googleToken) {
      loadCourses();
    } else {
      setCourses([]);
      setSelectedCourseId("");
      setCourseWorks([]);
    }
  }, [googleToken]);

  // Fetch assignments when course selection changes
  useEffect(() => {
    if (googleToken && selectedCourseId) {
      loadAssignments(selectedCourseId);
    } else {
      setCourseWorks([]);
    }
  }, [selectedCourseId, googleToken]);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    setError(null);
    try {
      const res = await fetch("https://classroom.googleapis.com/v1/courses", {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (!res.ok) {
        throw new Error(`Google Classroom API returned error status ${res.status}`);
      }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      console.error("Failed to load Google Classroom courses:", err);
      setError("Unable to retrieve Google Classroom courses. Make sure you have approved the classroom permission scopes.");
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadAssignments = async (courseId: string) => {
    setIsLoadingAssignments(true);
    setError(null);
    try {
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (!res.ok) {
        throw new Error(`Google Classroom API coursework endpoint returned status ${res.status}`);
      }
      const data = await res.json();
      setCourseWorks(data.courseWork || []);
    } catch (err: any) {
      console.error("Failed to load course coursework:", err);
      setError("Unable to load assignments for the selected course.");
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleConnect = async () => {
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleToken(result.accessToken);
        setGoogleUser(result.user);
      }
    } catch (err: any) {
      console.error("Failed to connect Google Account:", err);
      setError("Connection cancelled or Google OAuth failed.");
    }
  };

  const formatClassroomDate = (dueDateObj: any) => {
    if (!dueDateObj || !dueDateObj.year || !dueDateObj.month || !dueDateObj.day) return "";
    const y = dueDateObj.year;
    const m = dueDateObj.month < 10 ? `0${dueDateObj.month}` : dueDateObj.month;
    const d = dueDateObj.day < 10 ? `0${dueDateObj.day}` : dueDateObj.day;
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="bg-gradient-to-br from-[#11132e] to-[#0b0c1e] border border-[#1e244b]/80 rounded-2xl p-5 shadow-2xl font-sans text-left">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1e244b]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-display font-semibold text-sm">Google Classroom Planner</h4>
            <p className="text-gray-400 text-[11px]">Sync coursework & plan with Gemini AI</p>
          </div>
        </div>
        {googleToken && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
            Connected
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!googleToken ? (
        <div className="py-4 text-center">
          <p className="text-gray-400 text-xs leading-relaxed mb-4">
            Connect your Google Classroom account to import your coursework, assignments, and study tasks directly into your personalized planner.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-transform cursor-pointer"
          >
            Connect Google Classroom
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">Select Classroom Course</label>
            {isLoadingCourses ? (
              <div className="flex items-center justify-center py-2 bg-[#090b1e]/50 border border-[#1e244b] rounded-xl text-gray-400 text-xs gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Loading active classes...</span>
              </div>
            ) : courses.length === 0 ? (
              <p className="text-gray-500 text-xs py-2">No Google Classroom courses were found on your profile.</p>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-[#090b1e] border border-[#1e244b] text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="">-- Choose a Class --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id} className="text-black bg-white">
                    {course.name} {course.section ? `(${course.section})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCourseId && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-gray-400 text-[10px] uppercase font-bold tracking-wider">Coursework & Assignments</label>
                {courseWorks.length > 0 && (
                  <button
                    onClick={() => {
                      const mapped = courseWorks.map(work => ({
                        title: work.title,
                        dueDate: formatClassroomDate(work.dueDate) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                        description: work.description || `Coursework imported directly from Google Classroom.`
                      }));
                      onImportAllAssignments(mapped);
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 cursor-pointer hover:bg-emerald-500/20 transition-all"
                  >
                    Import All Directly
                  </button>
                )}
              </div>
              {isLoadingAssignments ? (
                <div className="flex items-center justify-center py-6 bg-[#090b1e]/50 border border-[#1e244b] rounded-xl text-gray-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading course assignments...</span>
                </div>
              ) : courseWorks.length === 0 ? (
                <p className="text-gray-500 text-xs py-4 text-center border border-[#1e244b] border-dashed rounded-xl bg-[#090b1e]/30">
                  No active assignments found for this class.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {courseWorks.map((work) => {
                    const taskDate = formatClassroomDate(work.dueDate);
                    return (
                      <div
                        key={work.id}
                        className="p-3 bg-[#090b1e] hover:bg-[#11132e]/80 border border-[#1e244b]/80 rounded-xl flex items-start justify-between gap-3 transition-colors group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <h5 className="text-white text-xs font-semibold truncate group-hover:text-emerald-300 transition-colors">
                            {work.title}
                          </h5>
                          {taskDate && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Calendar className="w-3 h-3 text-emerald-400" />
                              <span>Due: {taskDate}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => onDirectCreateTask(
                              work.title,
                              taskDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                              work.description || `Coursework imported directly from Google Classroom.`
                            )}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-emerald-300 rounded-lg text-[9px] font-medium flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            Add Task
                          </button>
                          <button
                            onClick={() => onSelectAssignment(
                              work.title,
                              taskDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                              work.description || `Coursework imported directly from Google Classroom.`
                            )}
                            className="px-2 py-1 bg-[#1e244b] hover:bg-indigo-600 hover:text-white border border-[#2d3775] text-indigo-300 rounded-lg text-[9px] font-medium flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                            AI Plan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
