import React, { useState, useEffect } from "react";
import { 
  FileText, 
  X, 
  Sparkles, 
  Save, 
  Cloud, 
  FileSpreadsheet, 
  Loader2, 
  Plus, 
  RefreshCw,
  Notebook,
  ExternalLink,
  Check,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createGoogleDoc, createGoogleSheet, listGoogleDocsAndSheets } from "../utils/workspace";

interface FloatingNotesButtonProps {
  googleToken: string | null;
}

interface LocalNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export default function FloatingNotesButton({ googleToken }: FloatingNotesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("My Study Session Note");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  // Local Notes Manifest & Selector States
  const [localNotes, setLocalNotes] = useState<LocalNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");

  // 1. Initialize local notes list on mount
  useEffect(() => {
    const raw = localStorage.getItem("deadline_guardian_local_notes_list");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LocalNote[];
        if (parsed.length > 0) {
          setLocalNotes(parsed);
          
          // Try to load last active note id
          const savedActiveId = localStorage.getItem("deadline_guardian_active_local_note_id");
          const activeNote = parsed.find(n => n.id === savedActiveId) || parsed[0];
          setSelectedNoteId(activeNote.id);
          setNoteTitle(activeNote.title);
          setNoteContent(activeNote.content);
        } else {
          setupDefaultNote();
        }
      } catch (e) {
        console.error("Failed to parse local notes manifest:", e);
        setupDefaultNote();
      }
    } else {
      // Migrate legacy single note if exists
      const legacyNote = localStorage.getItem("deadline_guardian_personal_note");
      const legacyTitle = localStorage.getItem("deadline_guardian_personal_note_title");
      
      const defaultNote: LocalNote = {
        id: "legacy-1",
        title: legacyTitle || "My Study Session Note",
        content: legacyNote || "# Study Session Notes\n\n- Key reference equations:\n- Task outlines:\n- Reminders & Links:",
        updatedAt: new Date().toLocaleString()
      };
      setLocalNotes([defaultNote]);
      setSelectedNoteId("legacy-1");
      setNoteTitle(defaultNote.title);
      setNoteContent(defaultNote.content);
      localStorage.setItem("deadline_guardian_local_notes_list", JSON.stringify([defaultNote]));
      localStorage.setItem("deadline_guardian_active_local_note_id", "legacy-1");
    }
  }, []);

  const setupDefaultNote = () => {
    const defaultNote: LocalNote = {
      id: "default-1",
      title: "My Study Session Note",
      content: "# Study Session Notes\n\n- Key reference equations:\n- Task outlines:\n- Reminders & Links:",
      updatedAt: new Date().toLocaleString()
    };
    setLocalNotes([defaultNote]);
    setSelectedNoteId("default-1");
    setNoteTitle(defaultNote.title);
    setNoteContent(defaultNote.content);
    localStorage.setItem("deadline_guardian_local_notes_list", JSON.stringify([defaultNote]));
    localStorage.setItem("deadline_guardian_active_local_note_id", "default-1");
  };

  // 2. Fetch recent Google Doc and Spreadsheet files if authenticated and notes drawer is opened
  useEffect(() => {
    if (isOpen && googleToken) {
      fetchRecentFiles();
    }
  }, [isOpen, googleToken]);

  const fetchRecentFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listGoogleDocsAndSheets(googleToken!);
      setRecentFiles(files || []);
    } catch (err: any) {
      console.warn("Failed to load Google Drive files in Notes drawer:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // 3. Select / Open a locally saved note
  const handleOpenLocalNote = (noteId: string) => {
    const target = localNotes.find(n => n.id === noteId);
    if (target) {
      // Auto-save currently active note before switching to make experience seamless
      const updatedList = localNotes.map(n => {
        if (n.id === selectedNoteId) {
          return {
            ...n,
            title: noteTitle,
            content: noteContent,
            updatedAt: new Date().toLocaleString()
          };
        }
        return n;
      });
      setLocalNotes(updatedList);
      localStorage.setItem("deadline_guardian_local_notes_list", JSON.stringify(updatedList));

      // Switch to new note
      setSelectedNoteId(noteId);
      setNoteTitle(target.title);
      setNoteContent(target.content);
      localStorage.setItem("deadline_guardian_active_local_note_id", noteId);
      setLastSaved("");
    }
  };

  // 4. Create a new local note
  const handleCreateNewLocalNote = () => {
    // Auto-save currently active note
    const updatedList = localNotes.map(n => {
      if (n.id === selectedNoteId) {
        return {
          ...n,
          title: noteTitle,
          content: noteContent,
          updatedAt: new Date().toLocaleString()
        };
      }
      return n;
    });

    const newId = `note-${Date.now()}`;
    const newNote: LocalNote = {
      id: newId,
      title: "New Study Note",
      content: "# New Study Notes\n\n- Add key pointers or bookmarks here...",
      updatedAt: new Date().toLocaleString()
    };

    const finalNotes = [...updatedList, newNote];
    setLocalNotes(finalNotes);
    setSelectedNoteId(newId);
    setNoteTitle(newNote.title);
    setNoteContent(newNote.content);
    
    localStorage.setItem("deadline_guardian_local_notes_list", JSON.stringify(finalNotes));
    localStorage.setItem("deadline_guardian_active_local_note_id", newId);
    setLastSaved("");
  };

  // 5. Delete a local note
  const handleDeleteLocalNote = (noteId: string) => {
    if (localNotes.length <= 1) return; // Retain at least 1 note
    
    const remaining = localNotes.filter(n => n.id !== noteId);
    setLocalNotes(remaining);
    
    // Select the first remaining note
    const nextNote = remaining[0];
    setSelectedNoteId(nextNote.id);
    setNoteTitle(nextNote.title);
    setNoteContent(nextNote.content);

    localStorage.setItem("deadline_guardian_local_notes_list", JSON.stringify(remaining));
    localStorage.setItem("deadline_guardian_active_local_note_id", nextNote.id);
    setLastSaved("");
  };

  // 6. Save active note locally
  const handleSaveLocal = () => {
    setIsSaving(true);
    
    const updatedNotes = localNotes.map(n => {
      if (n.id === selectedNoteId) {
        return {
          ...n,
          title: noteTitle,
          content: noteContent,
          updatedAt: new Date().toLocaleString()
        };
      }
      return n;
    });

    setLocalNotes(updatedNotes);
    localStorage.setItem("deadline_guardian_local_notes_list", JSON.stringify(updatedNotes));
    localStorage.setItem("deadline_guardian_active_local_note_id", selectedNoteId);
    
    // Also store active state in fallback legacy keys
    localStorage.setItem("deadline_guardian_personal_note", noteContent);
    localStorage.setItem("deadline_guardian_personal_note_title", noteTitle);

    const now = new Date();
    setLastSaved(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    setTimeout(() => {
      setIsSaving(false);
    }, 600);
  };

  const handleCreateDoc = async () => {
    if (!googleToken) return;
    setIsSyncing(true);
    setSyncStatus("idle");
    setSyncError("");

    try {
      const doc = await createGoogleDoc(googleToken, noteTitle, noteContent);
      setSyncStatus("success");
      fetchRecentFiles();
      window.open(doc.webViewLink, "_blank");
    } catch (err: any) {
      setSyncStatus("error");
      setSyncError(err?.message || "Failed to sync to Google Docs");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!googleToken) return;
    setIsSyncing(true);
    setSyncStatus("idle");
    setSyncError("");

    const lines = noteContent.split("\n").map(l => [l]);
    const initialRows = [
      ["Note Subject:", noteTitle],
      ["Generated Timestamp:", new Date().toLocaleString()],
      [],
      ["Notes Content Lines:"],
      ...lines
    ];

    try {
      const sheet = await createGoogleSheet(googleToken, `${noteTitle} (Tracker)`, initialRows);
      setSyncStatus("success");
      fetchRecentFiles();
      window.open(sheet.webViewLink, "_blank");
    } catch (err: any) {
      setSyncStatus("error");
      setSyncError(err?.message || "Failed to sync to Google Sheets");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="floating-notes-root" className="fixed bottom-6 right-64 z-50 font-sans">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            key="notes-trigger"
            id="notes-toggle-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-3.5 bg-[#12163b] hover:bg-[#1a1f4d] text-white rounded-2xl shadow-xl shadow-indigo-950/40 border border-[#1e244b] cursor-pointer group"
          >
            <Notebook className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
            <span className="text-[11px] font-bold tracking-wider uppercase">
              My Notes
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="notes-drawer"
            id="notes-drawer-panel"
            initial={{ opacity: 0, x: 150, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 150, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-96 h-[580px] bg-[#0c0f2a] border border-[#1e244b] rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-md"
          >
            {/* Header Block */}
            <div className="bg-gradient-to-r from-[#12163b] to-[#1a1f4d] p-4 border-b border-[#1e244b] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Notebook className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="text-white text-xs font-bold font-display leading-none">
                    Personal Study Notebook
                  </h4>
                  <span className="text-[9px] text-[#22d3ee] font-mono leading-none tracking-widest uppercase">
                    Workspace Integrated
                  </span>
                </div>
              </div>
              
              <button
                id="close-notes-drawer-btn"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Editor Pane */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#07091a]/40">
              
              {/* Local Notes Select List */}
              <div className="p-3 bg-[#12163b]/30 rounded-2xl border border-[#1e244b]/50">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-[#8692d0]">
                    My Locally Saved Notes
                  </label>
                  <button
                    onClick={handleCreateNewLocalNote}
                    className="flex items-center gap-0.5 text-[#22d3ee] hover:text-cyan-300 text-[9px] font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Create New Note</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedNoteId}
                    onChange={(e) => handleOpenLocalNote(e.target.value)}
                    className="flex-1 bg-[#12163b]/70 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white outline-none transition-all cursor-pointer"
                  >
                    {localNotes.map(n => (
                      <option key={n.id} value={n.id} className="bg-[#0c0f2a] text-white text-xs">
                        {n.title || "Untitled Note"}
                      </option>
                    ))}
                  </select>
                  
                  {localNotes.length > 1 && (
                    <button
                      onClick={() => handleDeleteLocalNote(selectedNoteId)}
                      className="p-2 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl text-xs transition-colors cursor-pointer"
                      title="Delete this local note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Note Title Input */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#8692d0] block mb-1">
                  Note Subject Title
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g., Exam Prep Outline"
                  className="w-full bg-[#12163b]/40 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>

              {/* Note Textarea */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#8692d0] block mb-1">
                  Content Body
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Type study references, equations, or bookmarks..."
                  className="w-full h-28 bg-[#12163b]/40 border border-[#1e244b] focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-white placeholder-gray-500 outline-none transition-all resize-none custom-scrollbar font-mono leading-relaxed"
                />
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[8px] text-gray-500 font-mono">
                    {noteContent.length} chars | {noteContent.split(/\s+/).filter(Boolean).length} words
                  </span>
                  
                  <button
                    onClick={handleSaveLocal}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        <span>Save Locally {lastSaved && `(${lastSaved})`}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Workspace Action Deck */}
              <div className="pt-2 border-t border-[#1e244b]/60">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8692d0] block mb-2">
                  Google Workspace Exporters
                </span>

                {!googleToken ? (
                  <div className="p-3 bg-[#12163b]/40 border border-yellow-500/10 rounded-xl text-center">
                    <p className="text-[10px] text-gray-400 font-light leading-relaxed">
                      💡 Authorize Google Account in <strong>Settings</strong> or <strong>My Tasks</strong> to export directly to Google Docs & Google Sheets!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9px] text-gray-400 font-light leading-normal">
                      Export this note directly to a cloud document. The file will be opened automatically.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCreateDoc}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-1.5 py-2 text-[10px] bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/25 text-blue-400 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-40"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Google Doc</span>
                      </button>

                      <button
                        onClick={handleCreateSheet}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-1.5 py-2 text-[10px] bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/25 text-emerald-400 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-40"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Google Sheet</span>
                      </button>
                    </div>

                    {isSyncing && (
                      <div className="flex items-center gap-1.5 justify-center py-1">
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                        <span className="text-[9px] text-indigo-300 italic">Creating secure cloud asset...</span>
                      </div>
                    )}

                    {syncStatus === "success" && (
                      <div className="text-center text-emerald-400 text-[9px] font-mono py-1 animate-pulse">
                        ✔ Success! Note successfully synced and opened.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Files Browser from Google Drive */}
              {googleToken && (
                <div className="pt-2 border-t border-[#1e244b]/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8692d0]">
                      Your Drive Note Files
                    </span>
                    <button
                      onClick={fetchRecentFiles}
                      className="p-1 hover:bg-[#12163b] rounded-lg text-gray-400 hover:text-white transition-all"
                      title="Reload Files"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isLoadingFiles ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-4 text-center">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mx-auto" />
                      <span className="text-[8px] text-gray-500 block mt-1">Fetching documents list...</span>
                    </div>
                  ) : recentFiles.length === 0 ? (
                    <div className="py-3 text-center text-gray-500 text-[9px] font-light">
                      No matching Google files in this study workspace yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {recentFiles.map((f) => {
                        const isDoc = f.mimeType?.includes("document");
                        return (
                          <a
                            key={f.id}
                            href={f.webViewLink}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            rel="noopener noreferrer"
                            className="p-2 bg-[#12163b]/30 hover:bg-[#12163b]/70 border border-[#1e244b]/30 hover:border-indigo-500/40 rounded-xl flex items-center justify-between transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {isDoc ? (
                                <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              ) : (
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className="text-white text-[10px] truncate leading-tight font-light">
                                {f.name}
                              </span>
                            </div>
                            <ExternalLink className="w-2.5 h-2.5 text-gray-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
