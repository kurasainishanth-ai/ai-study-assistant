import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Download,
  Edit3,
  Check,
  Trash2,
  Loader2,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  Clock,
  LayoutTemplate
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from './MarkdownView';

const STYLES = [
  { key: 'quick', title: 'Quick Overview', desc: 'Fast high-level summary and big picture' },
  { key: 'bullet', title: 'Bullet Points', desc: 'Core facts, key findings, and takeaways' },
  { key: 'key_concepts', title: 'Key Concepts', desc: 'Core theory with intuitive analogies' },
  { key: 'definitions', title: 'Definitions', desc: 'Alphabetical terms, definitions, and context' },
  { key: 'formula_sheet', title: 'Formulas', desc: 'Formulas, equations, rules, and memory hacks' },
  { key: 'exam_revision', title: 'Exam Revision', desc: 'Likely exam traps, edge cases, and must-knows' },
  { key: 'beginner', title: 'ELI5 (Beginner)', desc: 'Simplified plain-English explanation' },
  { key: 'chapter_wise', title: 'Structured Outline', desc: 'Hierarchical breakdown by topics & sections' },
  { key: 'comparisons', title: 'Comparisons', desc: 'Key differences, tradeoffs, and contrasts' },
  { key: 'questions', title: 'Study Questions', desc: 'Questions with hints to test your retention' },
  { key: 'comprehensive', title: 'Comprehensive', desc: 'Exhaustive textbook-style academic analysis' },
];

export default function SmartNotesView({
  activeDoc,
  onNavigateTab
}) {
  const [selectedStyle, setSelectedStyle] = useState('bullet');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [errorType, setErrorType] = useState(null);

  useEffect(() => {
    if (activeDoc) {
      loadNotes(activeDoc.id);
    } else {
      setNotes([]);
      setActiveNoteId(null);
    }
  }, [activeDoc]);

  const loadNotes = async (docId) => {
    try {
      const data = await api.getNotes(docId);
      setNotes(data || []);
      if (data && data.length > 0 && !activeNoteId) {
        setActiveNoteId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleGenerate = async () => {
    if (!activeDoc || isGenerating) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setErrorType(null);
    try {
      const res = await api.generateNotes(activeDoc.id, selectedStyle, customInstructions);
      if (res.success) {
        await loadNotes(activeDoc.id);
        setActiveNoteId(res.id);
      }
    } catch (err) {
      const rawMsg = err.message || 'Note generation failed';
      if (rawMsg.includes('QUOTA_EXHAUSTED') || rawMsg.toLowerCase().includes('daily quota')) {
        setErrorType('quota_exhausted');
        setErrorMsg('Your API daily request quota has been exhausted. Please wait until it resets.');
      } else if (rawMsg.includes('RATE_LIMIT') || rawMsg.includes('429')) {
        setErrorType('rate_limit');
        setErrorMsg('Temporary rate limit reached. Please wait a few seconds and try again.');
      } else if (rawMsg.includes('HIGH_DEMAND') || rawMsg.includes('503')) {
        setErrorType('high_demand');
        setErrorMsg('Servers are experiencing peak demand. Please wait a moment and try again.');
      } else if (rawMsg.includes('409') || rawMsg.toLowerCase().includes('in progress')) {
        setErrorType('in_progress');
        setErrorMsg('A generation request is already in progress. Please wait.');
      } else {
        setErrorType('generic');
        setErrorMsg(rawMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (note) => {
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.doc_name || 'StudyVerse'}_${note.style_key}_notes.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveEdit = async (noteId) => {
    try {
      await api.updateNote(noteId, editContent);
      setIsEditing(false);
      await loadNotes(activeDoc.id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this saved note?')) return;
    try {
      await api.deleteNote(noteId);
      const remaining = notes.filter(n => n.id !== noteId);
      if (remaining.length > 0) setActiveNoteId(remaining[0].id);
      else setActiveNoteId(null);
      await loadNotes(activeDoc.id);
    } catch (err) {
      setErrorMsg(err.message || 'Delete note failed');
    }
  };

  if (!activeDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0a0f] text-slate-300 p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#141419] border border-slate-800/50 flex items-center justify-center mb-6 shadow-sm">
          <BookOpen className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No Document Selected</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-sm text-center leading-relaxed">
          Please select or upload a study document in your library to generate AI Smart Notes.
        </p>
        <button 
          onClick={() => onNavigateTab('library')} 
          className="px-6 py-2.5 bg-white text-black font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm shadow-sm"
        >
          Go to My Library
        </button>
      </div>
    );
  }

  const currentNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] bg-[#0a0a0f] text-slate-300 font-sans">
      
      {/* Sidebar: Generator Options & Note List */}
      <div className="w-full md:w-[320px] lg:w-[380px] bg-[#141419] border-r border-slate-800/50 flex flex-col h-full overflow-y-auto">
        <div className="p-5 border-b border-slate-800/50 sticky top-0 bg-[#141419]/90 backdrop-blur z-10">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Generate Smart Notes
          </h2>
          <p className="text-xs text-slate-400 truncate">
            Source: <span className="text-slate-200">{activeDoc.name}</span>
          </p>
        </div>

        <div className="p-5 space-y-6">
          {/* Style Selector */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-3 uppercase tracking-wider flex items-center gap-2">
              <LayoutTemplate className="w-3.5 h-3.5" /> Select Format
            </label>
            <div className="grid grid-cols-1 gap-2">
              {STYLES.map((style) => {
                const isSelected = selectedStyle === style.key;
                return (
                  <div
                    key={style.key}
                    onClick={() => !isGenerating && setSelectedStyle(style.key)}
                    className={`p-3 rounded-xl border transition-all ${
                      isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-[#2a2a35] border-purple-500/50 text-white shadow-sm'
                        : 'bg-transparent border-slate-800/50 hover:bg-[#1a1a24] text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-medium flex justify-between items-center">
                      <span>{style.title}</span>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{style.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
             <label className="text-xs font-medium text-slate-400 block mb-2 uppercase tracking-wider">
               Custom Instructions (Optional)
             </label>
             <textarea
               disabled={isGenerating}
               value={customInstructions}
               onChange={(e) => setCustomInstructions(e.target.value)}
               placeholder="e.g. Focus on definitions..."
               rows={2}
               className="w-full bg-[#0a0a0f] text-sm text-slate-200 border border-slate-800/50 rounded-xl px-3 py-2.5 outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 disabled:opacity-50 resize-none shadow-inner"
             />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-white text-black font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Notes</span>
              </>
            )}
          </button>
          
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs leading-relaxed flex flex-col gap-2">
              <div className="flex items-center justify-between font-medium text-red-300">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Error
                </div>
              </div>
              <p>{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Reader & Tabs */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0f]">
        
        {/* Note Tabs */}
        {notes.length > 0 ? (
          <div className="flex-none p-4 border-b border-slate-800/50 bg-[#141419]/50 overflow-x-auto flex items-center gap-2 scrollbar-hide">
             {notes.map((n) => {
               const isActive = n.id === activeNoteId;
               return (
                 <button
                   key={n.id}
                   onClick={() => {
                     setActiveNoteId(n.id);
                     setIsEditing(false);
                   }}
                   className={`
                     px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border
                     ${isActive 
                       ? 'bg-[#2a2a35] text-white border-slate-700 shadow-sm' 
                       : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#1a1a24] hover:border-slate-800/50'
                     }
                   `}
                 >
                   <FileText className="w-4 h-4" />
                   {n.style_title || n.style_key}
                 </button>
               );
             })}
          </div>
        ) : (
           <div className="flex-none p-4 border-b border-slate-800/50 bg-[#141419]/50 flex items-center h-[65px]">
             <span className="text-sm text-slate-500 italic">No notes generated yet</span>
           </div>
        )}

        {/* Note Viewer */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center">
          {currentNote ? (
            <div className="w-full max-w-4xl flex flex-col">
               {/* Note Header */}
               <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                 <div>
                   <h1 className="text-2xl font-semibold text-white mb-1">{currentNote.style_title}</h1>
                   <div className="text-sm text-slate-400 flex items-center gap-2">
                     <Clock className="w-3.5 h-3.5" />
                     Generated {currentNote.created_at}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {isEditing ? (
                     <button
                       onClick={() => handleSaveEdit(currentNote.id)}
                       className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                     >
                       <Check className="w-4 h-4" /> Save
                     </button>
                   ) : (
                     <button
                       onClick={() => {
                         setEditContent(currentNote.content);
                         setIsEditing(true);
                       }}
                       className="px-3 py-1.5 bg-[#141419] hover:bg-[#2a2a35] text-slate-300 rounded-lg text-sm flex items-center gap-1.5 transition-colors border border-slate-800/50 shadow-sm"
                     >
                       <Edit3 className="w-4 h-4" /> Edit
                     </button>
                   )}
                   <button
                     onClick={() => handleCopy(currentNote.content)}
                     className="px-3 py-1.5 bg-[#141419] hover:bg-[#2a2a35] text-slate-300 rounded-lg text-sm flex items-center gap-1.5 transition-colors border border-slate-800/50 shadow-sm"
                   >
                     {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                     {copied ? 'Copied' : 'Copy'}
                   </button>
                   <button
                     onClick={() => handleDownload(currentNote)}
                     className="px-3 py-1.5 bg-[#141419] hover:bg-[#2a2a35] text-slate-300 rounded-lg text-sm flex items-center gap-1.5 transition-colors border border-slate-800/50 shadow-sm"
                   >
                     <Download className="w-4 h-4" /> Export
                   </button>
                   <button
                     onClick={() => handleDeleteNote(currentNote.id)}
                     className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>

               {/* Note Content */}
               <div className="bg-[#141419]/30 rounded-2xl p-6 md:p-8 border border-slate-800/50 shadow-sm">
                 {isEditing ? (
                   <div className="flex flex-col gap-4">
                     <textarea
                       value={editContent}
                       onChange={(e) => setEditContent(e.target.value)}
                       className="w-full h-[500px] bg-[#0a0a0f] text-slate-300 font-mono text-sm p-4 rounded-xl outline-none border border-slate-800/50 focus:border-slate-600 resize-none leading-relaxed shadow-inner"
                     />
                     <div className="flex justify-end gap-3">
                       <button
                         onClick={() => setIsEditing(false)}
                         className="px-4 py-2 bg-[#141419] text-slate-300 hover:bg-[#2a2a35] rounded-lg text-sm transition-colors border border-slate-800/50"
                       >
                         Cancel
                       </button>
                       <button
                         onClick={() => handleSaveEdit(currentNote.id)}
                         className="px-4 py-2 bg-white text-black hover:bg-slate-200 font-medium rounded-lg text-sm transition-colors shadow-sm"
                       >
                         Save Changes
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-white prose-a:text-purple-400 prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-slate-800/50 text-slate-200">
                     <MarkdownView content={currentNote.content} />
                   </div>
                 )}
               </div>
               <div className="h-12" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full max-w-md text-center text-slate-400">
               <FileText className="w-12 h-12 text-slate-600 mb-4" />
               <h3 className="text-lg font-medium text-white mb-2">Ready to take notes</h3>
               <p className="text-sm leading-relaxed">
                 Select a format from the sidebar and click Generate to create AI-powered smart notes from your document.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
