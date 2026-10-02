import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Download,
  Edit3,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  BookOpen,
  Zap,
  HelpCircle,
  Columns,
  GraduationCap,
  AlertTriangle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from './MarkdownView';

const STYLES = [
  { key: 'quick', title: 'Quick Overview', desc: 'Fast high-level summary and big picture' },
  { key: 'bullet', title: 'Bullet Points & Key Takeaways', desc: 'Core facts, key findings, and takeaways' },
  { key: 'key_concepts', title: 'Key Concepts & Principles', desc: 'Core theory with intuitive analogies' },
  { key: 'definitions', title: 'Definitions & Glossary', desc: 'Alphabetical terms, definitions, and context' },
  { key: 'formula_sheet', title: 'Exam Cheat Sheet & Formulas', desc: 'Formulas, equations, rules, and memory hacks' },
  { key: 'exam_revision', title: 'High-Yield Cram Guide', desc: 'Likely exam traps, edge cases, and must-knows' },
  { key: 'beginner', title: 'Beginner-Friendly (ELI5)', desc: 'Simplified plain-English explanation' },
  { key: 'chapter_wise', title: 'Structured Outline', desc: 'Hierarchical breakdown by topics & sections' },
  { key: 'comparisons', title: 'Compare & Contrast Matrix', desc: 'Key differences, tradeoffs, and contrasts' },
  { key: 'questions', title: 'Self-Test Study Questions', desc: 'Questions with hints to test your retention' },
  { key: 'comprehensive', title: 'Comprehensive Deep Dive', desc: 'Exhaustive textbook-style academic analysis' },
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
  const [errorType, setErrorType] = useState(null); // 'rate_limit', 'quota_exhausted', 'high_demand', 'generic'

  // Fetch saved notes whenever active document changes
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
      if (data && data.length > 0) {
        setActiveNoteId(data[0].id);
      } else {
        setActiveNoteId(null);
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
      if (
        rawMsg.includes('QUOTA_EXHAUSTED') ||
        rawMsg.toLowerCase().includes('daily quota') ||
        rawMsg.toLowerCase().includes('requests per day')
      ) {
        setErrorType('quota_exhausted');
        setErrorMsg(
          'Your Google Gemini API daily request quota has been exhausted. Please wait until your daily quota resets in Google AI Studio or switch to a paid API key.'
        );
      } else if (
        rawMsg.includes('RATE_LIMIT') ||
        rawMsg.includes('429') ||
        rawMsg.toLowerCase().includes('rate limit')
      ) {
        setErrorType('rate_limit');
        setErrorMsg(
          'Gemini temporary rate limit reached (requests per minute). Your study material and selected format are preserved below. Please wait a few seconds and click Retry.'
        );
      } else if (
        rawMsg.includes('HIGH_DEMAND') ||
        rawMsg.includes('503') ||
        rawMsg.toLowerCase().includes('high demand')
      ) {
        setErrorType('high_demand');
        setErrorMsg(
          'Gemini servers are experiencing temporary peak demand (HTTP 503). Your material and settings are preserved. Please wait a moment and try again.'
        );
      } else if (rawMsg.includes('409') || rawMsg.toLowerCase().includes('already currently in progress')) {
        setErrorType('in_progress');
        setErrorMsg(
          'A note generation request is already currently in progress. Please wait for it to complete.'
        );
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
      await loadNotes(activeDoc.id);
    } catch (err) {
      setErrorMsg(err.message || 'Delete note failed');
    }
  };

  if (!activeDoc) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">No Document Selected</h3>
        <p className="text-xs text-slate-400">
          Please select or upload a study document in your library to generate AI Smart Notes.
        </p>
        <button
          onClick={() => onNavigateTab('library')}
          className="btn btn-primary text-xs"
        >
          Go to My Library
        </button>
      </div>
    );
  }

  const currentNote = notes.find((n) => n.id === activeNoteId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Generator Form */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Generate Smart Notes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Source: <span className="text-slate-200 font-medium">{activeDoc.name}</span>
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-violet-600/30"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Notes</span>
              </>
            )}
          </button>
        </div>

        {/* 11 Style Selector Grid */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Select Study Format (11 Formats):
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {STYLES.map((style) => {
              const isSelected = selectedStyle === style.key;
              return (
                <div
                  key={style.key}
                  onClick={() => !isGenerating && setSelectedStyle(style.key)}
                  className={`p-3 rounded-xl border transition-all ${
                    isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'bg-violet-950/40 border-violet-500 shadow-sm shadow-violet-500/20'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{style.title}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-violet-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {style.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Instructions (Optional) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Custom Instructions (Optional):
          </label>
          <input
            type="text"
            disabled={isGenerating}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Focus on definitions, simplify for midterms, or highlight real-world applications"
            className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-violet-500 disabled:opacity-60"
          />
        </div>

        {/* User-Friendly Differentiated Error & Rate Limit Banners */}
        {errorMsg && (
          <div>
            {errorType === 'rate_limit' && (
              <div className="bg-amber-950/40 border border-amber-700/60 p-4 rounded-xl space-y-2.5 text-xs text-amber-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Gemini API Temporary Rate Limit Reached</span>
                  </div>
                  <span className="badge badge-amber text-[9px]">Rate Limit (HTTP 429)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {errorMsg}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-amber-800/40 text-[11px]">
                  <span className="text-slate-400">
                    Active selection preserved: <strong className="text-slate-200">{STYLES.find(s => s.key === selectedStyle)?.title || selectedStyle}</strong>
                  </span>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-300 border-amber-700 hover:bg-amber-900/40"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Generate Notes</span>
                  </button>
                </div>
              </div>
            )}

            {errorType === 'quota_exhausted' && (
              <div className="bg-rose-950/50 border border-rose-800/80 p-4 rounded-xl space-y-2 text-xs text-rose-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Daily Quota Exhausted</span>
                  </div>
                  <span className="badge badge-rose text-[9px]">Quota Limit (HTTP 429)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {errorMsg}
                </p>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-rose-900/40">
                  Tip: Google AI Studio free tier limits reset every 24 hours. Your material and selection remain saved in StudyVerse.
                </div>
              </div>
            )}

            {errorType === 'high_demand' && (
              <div className="bg-violet-950/40 border border-violet-700/60 p-4 rounded-xl space-y-2 text-xs text-violet-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-violet-300">
                    <AlertTriangle className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>Gemini Peak Demand (HTTP 503)</span>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {errorMsg}
                </p>
              </div>
            )}

            {errorType === 'in_progress' && (
              <div className="bg-cyan-950/40 border border-cyan-700/60 p-3 rounded-xl text-xs text-cyan-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {(!errorType || errorType === 'generic') && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn btn-secondary text-xs py-1 px-2.5 ml-3 shrink-0"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes Display Area */}
      <div className="space-y-4">
        {/* Saved Notes Tabs */}
        {notes.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-2">
              Saved Notes ({notes.length}):
            </span>
            {notes.map((n) => {
              const isActive = n.id === activeNoteId;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setActiveNoteId(n.id);
                    setIsEditing(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{n.style_title || n.style_key}</span>
                  <span className="text-[10px] opacity-70">({n.created_at})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Note Content Viewer */}
        {currentNote ? (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentNote.style_title}</span>
                  <span className="badge badge-purple text-[10px]">Saved in SQLite</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generated {currentNote.created_at} for {currentNote.doc_name}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(currentNote.content)}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Copy formatted markdown to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => handleDownload(currentNote)}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Download as .md file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>

                {isEditing ? (
                  <button
                    onClick={() => handleSaveEdit(currentNote.id)}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Edits</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditContent(currentNote.content);
                      setIsEditing(true);
                    }}
                    className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteNote(currentNote.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Note Body */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={18}
                  className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-violet-500/60 rounded-xl p-4 outline-none leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(currentNote.id)}
                    className="btn btn-primary text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
                <MarkdownView content={currentNote.content} />
              </div>
            )}
          </div>
        ) : (
          !isGenerating && (
            <div className="glass-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-300">No Notes Generated Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose one of the 11 study formats above and click "Generate Notes" to produce AI-synthesized notes with Gemini.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
