import { useState, useEffect, useRef } from "react";

export function usePomodoro(showToast: (msg: string) => void) {
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(1500); // 25 mins default
  const [pomodoroDuration, setPomodoroDuration] = useState(1500);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<"focus" | "break">("focus");
  const pomodoroIntervalRef = useRef<any>(null);

  // Web Audio chime alarms
  const playTimerAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.frequency.setValueAtTime(880, now + 0.25);
      gain.gain.setValueAtTime(0.15, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Alarm audio context disabled in iframe preview:", e);
    }
  };

  // Pomodoro core ticker side-effect
  useEffect(() => {
    if (isPomodoroActive) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(pomodoroIntervalRef.current);
            setIsPomodoroActive(false);
            playTimerAlarm();
            if (pomodoroMode === "focus") {
              showToast("Focus session complete! Grab a quick drink or stretch.");
              setPomodoroMode("break");
              setPomodoroTimeLeft(300); // 5 mins break
              setPomodoroDuration(300);
            } else {
              showToast("Break concluded! Ready to target new milestones?");
              setPomodoroMode("focus");
              setPomodoroTimeLeft(1500); // 25 mins focus
              setPomodoroDuration(1500);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    }
    return () => {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    };
  }, [isPomodoroActive, pomodoroMode, showToast]);

  // Command binding cross-component event listeners
  useEffect(() => {
    const handleFocusCommand = (e: any) => {
      if (e.detail === "open") {
        setIsFocusModalOpen(true);
      }
    };
    const handlePomodoroCommand = (e: any) => {
      if (e.detail === "start") {
        setIsFocusModalOpen(true);
        setIsPomodoroActive(true);
      } else if (e.detail === "pause") {
        setIsPomodoroActive(false);
      } else if (e.detail === "stop") {
        setIsPomodoroActive(false);
        setPomodoroTimeLeft(1500);
        setPomodoroDuration(1500);
        setPomodoroMode("focus");
      }
    };

    window.addEventListener("focus-mode-command", handleFocusCommand);
    window.addEventListener("pomodoro-command", handlePomodoroCommand);
    return () => {
      window.removeEventListener("focus-mode-command", handleFocusCommand);
      window.removeEventListener("pomodoro-command", handlePomodoroCommand);
    };
  }, []);

  return {
    isFocusModalOpen,
    setIsFocusModalOpen,
    pomodoroTimeLeft,
    setPomodoroTimeLeft,
    pomodoroDuration,
    setPomodoroDuration,
    isPomodoroActive,
    setIsPomodoroActive,
    pomodoroMode,
    setPomodoroMode
  };
}
