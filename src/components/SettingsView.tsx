import React, { useState } from "react";
import { 
  User, 
  Target, 
  Clock, 
  Trash2, 
  RefreshCw, 
  Save, 
  Check, 
  ShieldAlert,
  Info,
  Calendar,
  Mail,
  ArrowRight,
  LogOut
} from "lucide-react";
import { UserProfile, Task, AIPlan } from "../types";
import { INITIAL_TASKS, INITIAL_PLAN, INITIAL_PROFILE } from "../utils/dataStore";
import { googleSignIn, logout } from "../utils/workspace";

interface SettingsViewProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setActivePlan: React.Dispatch<React.SetStateAction<AIPlan | null>>;
  setAllPlans: React.Dispatch<React.SetStateAction<AIPlan[]>>;
  googleToken: string | null;
  setGoogleToken: React.Dispatch<React.SetStateAction<string | null>>;
  googleUser: any | null;
  setGoogleUser: React.Dispatch<React.SetStateAction<any | null>>;
}

export default function SettingsView({
  profile,
  setProfile,
  setTasks,
  setActivePlan,
  setAllPlans,
  googleToken,
  setGoogleToken,
  googleUser,
  setGoogleUser
}: SettingsViewProps) {
  const [name, setName] = useState(profile.name);
  const [focusGoal, setFocusGoal] = useState(profile.focusScore || 85);
  const [dailyHours, setDailyHours] = useState(profile.dailyWorkHours || 6);
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Save changes
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(prev => ({
      ...prev,
      name,
      focusScore: Number(focusGoal),
      dailyWorkHours: Number(dailyHours)
    }));
    setShowSaveFeedback(true);
    setTimeout(() => {
      setShowSaveFeedback(false);
    }, 1500);
  };

  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Erase all localStorage state and reset tasks to empty list
  const handleWipeData = () => {
    setTasks([]);
    setActivePlan(null);
    setAllPlans([]);
    setProfile({
      name: "User",
      avatarSeed: "avatar",
      streak: 0,
      focusScore: 50,
      dailyWorkHours: 6,
      joinedDate: new Date().toISOString().split("T")[0]
    });
    setConfirmWipeOpen(false);
    triggerToast("App database records wiped. You are starting from a clean slate.");
  };

  // Reload standard default items to showcase app features
  const handleLoadDemo = () => {
    setTasks(INITIAL_TASKS);
    setActivePlan(INITIAL_PLAN);
    setAllPlans([INITIAL_PLAN]);
    setProfile(INITIAL_PROFILE);
    setName(INITIAL_PROFILE.name);
    setFocusGoal(INITIAL_PROFILE.focusScore);
    setDailyHours(INITIAL_PROFILE.dailyWorkHours);
    setConfirmDemoOpen(false);
    triggerToast("Showcase demo datasets successfully loaded.");
  };

  return (
    <div className="flex-1 p-8 text-white min-h-screen bg-[#090b1e]/95 pb-16 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          Application Settings
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Customize user attributes, baseline performance goals, and manage storage cache datasets.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Google Workspace authentication management panel */}
        <div className="lg:col-span-12 bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <Mail className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-display text-lg font-bold">Google Calendar & Gmail Integrations</h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Authenticate your Google account securely to sync tasks as Calendar schedules and distribute instant reminder notifications through Gmail. Your access token is protected and retained only in secure volatile program memory.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            {isAuthLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#090b1e]/50 px-4 py-3 border border-[#1e244b]/50 rounded-2xl">
                <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-cyan-400 animate-spin" />
                <span>Authorizing workspace...</span>
              </div>
            ) : googleUser ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#090b1e]/60 p-4 border border-[#1e244b]/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img referrerPolicy="no-referrer" src={googleUser.photoURL} alt={googleUser.displayName || "Google User"} className="w-10 h-10 rounded-full border border-indigo-500/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">
                      {(googleUser.displayName || "G").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h5 className="text-xs font-bold text-white font-sans">{googleUser.displayName || "Google Account"}</h5>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{googleUser.email}</p>
                  </div>
                </div>
                <div className="h-px sm:h-8 w-full sm:w-px bg-[#1e244b]/65 my-1 sm:my-0" />
                <button
                  type="button"
                  onClick={async () => {
                    setIsAuthLoading(true);
                    try {
                      await logout();
                      setGoogleUser(null);
                      setGoogleToken(null);
                      triggerToast("Disconnected from Google Workspace.");
                    } catch (e: any) {
                      triggerToast(`Disconnect failed: ${e?.message || e}`);
                    } finally {
                      setIsAuthLoading(false);
                    }
                  }}
                  className="px-4 py-2 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 font-semibold text-xs border border-rose-500/30 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setIsAuthLoading(true);
                  try {
                    const result = await googleSignIn();
                    if (result) {
                      setGoogleUser(result.user);
                      setGoogleToken(result.accessToken);
                      triggerToast(`Workspace connected! Welcome, ${result.user.displayName || "scholar"}.`);
                    }
                  } catch (e: any) {
                    triggerToast(`OAuth error: ${e?.message || "Failed to authenticate"}`);
                  } finally {
                    setIsAuthLoading(false);
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 bg-white text-slate-900 font-bold hover:bg-gray-100 rounded-xl flex items-center justify-center gap-2.5 shadow-lg border border-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.9-2.7 3.41-4.51 6.76-4.51z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.43c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.87 3.38-8.5z" />
                  <path fill="#FBBC05" d="M5.24 14.51c-.24-.72-.37-1.49-.37-2.28s.13-1.56.37-2.28L1.39 6.96C.5 8.75 0 10.74 0 12.82s.5 4.07 1.39 5.86l3.85-2.99z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.9 1.09-3.35 0-5.86-1.81-6.76-4.51L1.39 16.83C3.37 20.74 7.35 23 12 23z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Left Form Panel: Profile Credentials and Goals */}
        <div className="lg:col-span-7 bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl h-fit">
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[#1e244b]/40">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="text-white font-display text-base font-bold">Workspace Configuration</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            
            {/* User nickname name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Display Profile Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. User or Alex"
                  className="w-full bg-[#090b1e]/80 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-3 px-4 pl-11 text-white placeholder-gray-500 text-sm outline-none transition-all shadow-inner"
                />
                <User className="w-4.5 h-4.5 text-gray-500 absolute left-4 top-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Target Focus Goal Score (0-100) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Baseline Focus Target (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="10"
                    max="100"
                    value={focusGoal}
                    onChange={(e) => setFocusGoal(Number(e.target.value))}
                    className="w-full bg-[#090b1e]/80 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-3 px-4 pl-11 text-white text-sm outline-none transition-all"
                  />
                  <Target className="w-4.5 h-4.5 text-gray-500 absolute left-4 top-3.5" />
                </div>
              </div>

              {/* Standard workplace daily rate hours */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest pl-1">Daily Cap work Capacity (Hrs)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    max="16"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(Number(e.target.value))}
                    className="w-full bg-[#090b1e]/80 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-3 px-4 pl-11 text-white text-sm outline-none transition-all"
                  />
                  <Clock className="w-4.5 h-4.5 text-gray-500 absolute left-4 top-3.5" />
                </div>
              </div>
            </div>

            {/* Quick Informational note */}
            <div className="p-3.5 bg-[#090b1e]/40 rounded-xl border border-[#1e244b]/30 flex items-start gap-2.5 text-[11px] text-gray-400 select-none">
              <Info className="w-4.5 h-4.5 text-[#10b981] shrink-0 mt-0.5" />
              <p className="font-light leading-normal">
                Baseline stats provide thresholds. Focus Targets trigger warnings if compliance ratios drop below target focus values.
              </p>
            </div>

            {/* Submit save button */}
            <div className="flex justify-between items-center pt-3 border-t border-[#1e244b]/40">
              <span className="text-xs text-gray-500">Settings save directly into local caching buffers.</span>
              
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] transition-all text-white font-semibold text-xs rounded-xl flex items-center gap-2 border border-white/5 cursor-pointer shadow-md"
              >
                {showSaveFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3.5]" />
                    <span>Settings Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-cyan-300" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Right Form Panel: Storage Cache management */}
        <div className="lg:col-span-5 bg-[#12163b]/70 border border-[#1e244b] p-6 rounded-3xl shadow-xl h-fit space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1e244b]/40">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h3 className="text-white font-display text-base font-bold">Storage Administration</h3>
          </div>

          <div className="space-y-4">
            {/* Show Demo dataset loader */}
            <div className="p-4 bg-[#151a4a]/30 border border-[#1e244b]/40 rounded-2.5xl space-y-3 relative group">
              <h4 className="text-white text-xs font-bold font-sans tracking-wide">Load Demo Dataset</h4>
              <p className="text-gray-400 text-[10px] font-light leading-relaxed">
                Overwrite your current data trees and repopulate standard schedules, AI generated plans, and profiles matching the exact aesthetic density representation in screenshots instantly.
              </p>
              
              <button
                type="button"
                onClick={() => setConfirmDemoOpen(true)}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.01] transition-transform text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                <span>Showcase Showcase Data</span>
              </button>
            </div>

            {/* Clear Database record */}
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2.5xl space-y-3 relative group">
              <h4 className="text-rose-400 text-xs font-bold font-sans tracking-wide">Storage Record erasure</h4>
              <p className="text-gray-400 text-[10px] font-light leading-relaxed">
                Completely erase all custom parameters, active schedules, and historical completions from localStorage caches. Starting fresh prompts a blank application layout state.
              </p>
              
              <button
                type="button"
                onClick={() => setConfirmWipeOpen(true)}
                className="w-full py-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Wipe Database Records</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* POPUP MODAL DIALOGS: Safe, isolated, stylish replacement for raw window.confirm/alert prompts */}
      {confirmDemoOpen && (
        <div className="fixed inset-0 bg-[#090b1e]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#12163b] border border-[#1e244b] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 bg-indigo-500/15 rounded-2xl flex items-center justify-center text-cyan-400 border border-indigo-500/20">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h4 className="text-white font-display font-bold text-base">Load Showcase Data?</h4>
              <p className="text-gray-400 text-xs font-light mt-1.5 leading-relaxed">
                This will overwrite your currently configured tasks, metrics logs, and custom profiles back to demo values.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDemoOpen(false)}
                className="flex-1 py-2.5 bg-[#090b1e] hover:bg-[#090b1e]/80 border border-[#1e244b] text-gray-400 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLoadDemo}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Proceed Load
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmWipeOpen && (
        <div className="fixed inset-0 bg-[#090b1e]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#12163b] border border-[#1e244b] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/15">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-rose-400 font-display font-bold text-base">Wipe Application Memory?</h4>
              <p className="text-gray-400 text-xs font-light mt-1.5 leading-relaxed">
                This action is destructive and irreversible. All historical plans and checklist records will be deleted.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setConfirmWipeOpen(false)}
                className="flex-1 py-2.5 bg-[#090b1e] hover:bg-[#090b1e]/80 border border-[#1e244b] text-gray-400 hover:text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeData}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Proceed Erase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION STATUS TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-slate-900 border-2 border-emerald-500/30 text-white text-xs font-sans font-medium px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-bounce">
          <span className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
