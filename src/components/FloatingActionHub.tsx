import React, { useState } from "react";
import { Plus, MessageSquare, Mic, Sparkles, X, ListPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FloatingActionHubProps {
  onQuickAdd: () => void;
  onAskAI: () => void;
  onStartVoice: () => void;
}

export default function FloatingActionHub({ onQuickAdd, onAskAI, onStartVoice }: FloatingActionHubProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3.5 font-sans">
      {/* Main trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:shadow-[0_0_25px_rgba(79,70,229,0.7)] transition-all duration-300 hover:scale-105 cursor-pointer border border-white/20 relative z-50"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="sparkles"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6 text-cyan-200 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Expanded sub-buttons */}
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-3 mb-2">
            {/* Quick Add Task */}
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                onQuickAdd();
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-4.5 py-3 bg-[#12163b]/95 hover:bg-[#1a1f4d] text-white rounded-2xl shadow-xl border border-blue-500/30 hover:border-blue-400 transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-300 group-hover:text-cyan-200">
                Quick Add Task
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20">
                <ListPlus className="w-4 h-4" />
              </div>
            </motion.button>

            {/* Ask AI Copilot */}
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              onClick={() => {
                onAskAI();
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-4.5 py-3 bg-[#12163b]/95 hover:bg-[#1a1f4d] text-white rounded-2xl shadow-xl border border-indigo-500/30 hover:border-indigo-400 transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-300 group-hover:text-indigo-200">
                Ask AI Copilot
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
            </motion.button>

            {/* Voice Assistant */}
            <motion.button
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.15, delay: 0.1 }}
              onClick={() => {
                onStartVoice();
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 px-4.5 py-3 bg-[#12163b]/95 hover:bg-[#1a1f4d] text-white rounded-2xl shadow-xl border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer group"
            >
              <span className="text-[10px] font-bold tracking-wider uppercase text-rose-300 group-hover:text-rose-200">
                Voice Assistant
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20">
                <Mic className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
