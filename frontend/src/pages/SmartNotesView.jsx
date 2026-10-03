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
  AlertTriangle,
  Clock,
  LayoutTemplate
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from '../components/MarkdownView';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { motion } from 'framer-motion';

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-transparent text-slate-300 p-8"
      >
        <div className="w-20 h-20 rounded-3xl bg-[#141419] border border-slate-800/50 flex items-center justify-center mb-6 shadow-xl">
          <BookOpen className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight">No Document Selected</h3>
        <p className="text-sm text-slate-400 mb-8 max-w-sm text-center leading-relaxed">
          Please select or upload a study document in your library to generate AI Smart Notes.
        </p>
        <Button onClick={() => onNavigateTab('library')} variant="primary" size="lg">
          Go to My Library
        </Button>
      </motion.div>
    );
  }

  const currentNote = notes.find((n) => n.id === activeNoteId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col md:flex-row gap-8 bg-transparent text-slate-300 font-sans"
    >
      {/* Sidebar: Generator Options & Note List */}
      <Card className="w-full md:w-[360px] lg:w-[420px] flex flex-col h-full overflow-hidden border-slate-800/50 bg-[#141419]/90 backdrop-blur-md shadow-2xl rounded-3xl">
        <CardHeader className="border-b border-slate-800/50 p-6">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2 mb-1 tracking-tight">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Generate Smart Notes
          </CardTitle>
          <p className="text-sm text-slate-400 truncate">
            Source: <span className="text-slate-200 font-medium">{activeDoc.name}</span>
          </p>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          {/* Style Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-4 uppercase tracking-wider flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" /> Select Format
            </label>
            <div className="grid grid-cols-1 gap-3">
              {STYLES.map((style) => {
                const isSelected = selectedStyle === style.key;
                return (
                  <div
                    key={style.key}
                    onClick={() => !isGenerating && setSelectedStyle(style.key)}
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'bg-[#0a0a0f] border-slate-800/80 hover:border-slate-600 hover:bg-[#111116] text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-semibold flex justify-between items-center mb-1">
                      <span>{style.title}</span>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">{style.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
             <label className="text-xs font-semibold text-slate-400 block mb-3 uppercase tracking-wider">
               Custom Instructions (Optional)
             </label>
             <textarea
               disabled={isGenerating}
               value={customInstructions}
               onChange={(e) => setCustomInstructions(e.target.value)}
               placeholder="e.g. Focus heavily on definitions and formulas..."
               rows={3}
               className="w-full bg-[#0a0a0f] text-sm text-slate-200 border border-slate-800 rounded-2xl p-4 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50 resize-none shadow-inner transition-colors placeholder:text-slate-600"
             />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 text-base shadow-lg"
            variant="primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating Note...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Smart Notes
              </>
            )}
          </Button>
          
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-sm leading-relaxed flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Error
              </div>
              <p>{errorMsg}</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area: Reader & Tabs */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent rounded-3xl shadow-2xl">
        
        {/* Note Tabs */}
        {notes.length > 0 ? (
          <div className="flex-none p-4 bg-[#141419]/80 backdrop-blur-md border border-slate-800/50 rounded-t-3xl overflow-x-auto flex items-center gap-3 scrollbar-hide">
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
                     px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 border
                     ${isActive 
                       ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
                       : 'bg-[#0a0a0f] text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-[#111116] hover:border-slate-700'
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
           <div className="flex-none p-6 bg-[#141419]/80 backdrop-blur-md border border-slate-800/50 rounded-t-3xl flex items-center justify-center h-[72px]">
             <span className="text-sm text-slate-500 italic">No notes generated yet for this document</span>
           </div>
        )}

        {/* Note Viewer */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0f]/90 backdrop-blur-sm border-x border-b border-slate-800/50 rounded-b-3xl p-6 md:p-10 flex justify-center custom-scrollbar">
          {currentNote ? (
            <motion.div 
              key={currentNote.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl flex flex-col"
            >
               {/* Note Header */}
               <div className="flex flex-wrap items-end justify-between gap-6 mb-10 pb-6 border-b border-slate-800/50">
                 <div>
                   <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">{currentNote.style_title}</h1>
                   <div className="flex items-center gap-3">
                     <Badge variant="outline" className="text-slate-400 border-slate-700 bg-[#141419]">
                       <Clock className="w-3.5 h-3.5 mr-1" />
                       Generated {currentNote.created_at}
                     </Badge>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   {isEditing ? (
                     <Button
                       onClick={() => handleSaveEdit(currentNote.id)}
                       className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30"
                       variant="outline"
                     >
                       <Check className="w-4 h-4 mr-2" /> Save
                     </Button>
                   ) : (
                     <Button
                       onClick={() => {
                         setEditContent(currentNote.content);
                         setIsEditing(true);
                       }}
                       variant="secondary"
                     >
                       <Edit3 className="w-4 h-4 mr-2" /> Edit
                     </Button>
                   )}
                   <Button
                     onClick={() => handleCopy(currentNote.content)}
                     variant="secondary"
                   >
                     {copied ? <Check className="w-4 h-4 text-emerald-400 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                     {copied ? 'Copied' : 'Copy'}
                   </Button>
                   <Button
                     onClick={() => handleDownload(currentNote)}
                     variant="secondary"
                   >
                     <Download className="w-4 h-4 mr-2" /> Export
                   </Button>
                   <Button
                     onClick={() => handleDeleteNote(currentNote.id)}
                     variant="ghost"
                     className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 px-3"
                   >
                     <Trash2 className="w-5 h-5" />
                   </Button>
                 </div>
               </div>

               {/* Note Content */}
               <div className="bg-[#141419] rounded-3xl p-8 md:p-12 border border-slate-800/80 shadow-2xl">
                 {isEditing ? (
                   <div className="flex flex-col gap-6">
                     <textarea
                       value={editContent}
                       onChange={(e) => setEditContent(e.target.value)}
                       className="w-full min-h-[500px] bg-[#0a0a0f] text-slate-300 font-mono text-sm p-6 rounded-2xl outline-none border border-slate-700 focus:border-purple-500/50 resize-y leading-relaxed shadow-inner"
                     />
                     <div className="flex justify-end gap-4">
                       <Button
                         onClick={() => setIsEditing(false)}
                         variant="ghost"
                       >
                         Cancel
                       </Button>
                       <Button
                         onClick={() => handleSaveEdit(currentNote.id)}
                         variant="primary"
                       >
                         Save Changes
                       </Button>
                     </div>
                   </div>
                 ) : (
                   <div className="prose prose-invert prose-lg max-w-none prose-p:leading-relaxed prose-headings:text-white prose-headings:font-bold prose-a:text-purple-400 prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-slate-800/50 text-slate-200">
                     <MarkdownView content={currentNote.content} />
                   </div>
                 )}
               </div>
               <div className="h-16" />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full max-w-md text-center text-slate-400 mt-20">
               <div className="w-24 h-24 rounded-full bg-[#141419] border border-slate-800/50 flex items-center justify-center mb-6 shadow-lg">
                 <FileText className="w-10 h-10 text-slate-500" />
               </div>
               <h3 className="text-xl font-semibold text-white mb-3">Ready for Smart Notes</h3>
               <p className="text-base leading-relaxed">
                 Select a format from the sidebar and click Generate to create an AI-powered summary tailored to your learning style.
               </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
