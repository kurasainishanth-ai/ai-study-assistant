import React from 'react';
import { Sparkles, FileText, Upload, Flame, AlertCircle } from 'lucide-react';

export default function Header({
  activeTab,
  activeDoc,
  streakDays = 1,
  onUploadClick,
  errorMessage,
  onClearError
}) {
  const getTabMetadata = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Learning Dashboard', desc: 'Welcome back to your personalized study workspace.' };
      case 'library':
        return { title: 'My Study Library', desc: 'Upload, manage, and verify extracted course materials across multiple formats.' };
      case 'tutor':
        return { title: 'AI Study Agent', desc: 'Document-grounded tutor answering questions with exact page and slide citations.' };
      case 'notes':
        return { title: 'Smart Notes Studio', desc: 'Transform materials into 11 specialized study formats with instant markdown export.' };
      case 'flashcards':
        return { title: 'Flashcard Studio', desc: 'Active recall flashcards with Spaced Repetition (SRS) mastery tracking.' };
      case 'visuals':
        return { title: 'Visual Learning', desc: 'Gemini vision breakdown of diagrams and Imagen concept art illustrations.' };
      case 'quiz':
        return { title: 'Quiz Arena & Misconception Detector', desc: 'Adaptive diagnostic quizzes that detect student misconceptions and recommend follow-ups.' };
      case 'map':
        return { title: 'Knowledge Map', desc: 'Grounded concept dependency graph and automated revision targets.' };
      case 'progress':
        return { title: 'Learning Progress & Analytics', desc: 'Genuine metrics on topic mastery, card reviews, and quiz accuracy.' };
      case 'settings':
        return { title: 'Workspace Settings', desc: 'API connectivity, model configuration, and database controls.' };
      default:
        return { title: 'StudyVerse AI', desc: 'Multimodal AI-powered learning environment.' };
    }
  };

  const meta = getTabMetadata();

  return (
    <header className="border-b border-slate-800/80 bg-[#0f172a]/70 backdrop-blur-md sticky top-0 z-20 px-8 py-4 flex flex-col gap-2">
      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2 rounded-lg text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onClearError}
            className="text-rose-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            {meta.title}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Material Pill */}
          {activeDoc ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-medium max-w-[180px] truncate">{activeDoc.name}</span>
              <span className="badge badge-purple text-[10px]">Active</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-xs text-slate-500">
              <span>No document selected</span>
            </div>
          )}

          {/* Study Streak Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs font-semibold text-amber-300">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{streakDays} Day Streak</span>
          </div>

          {/* Quick Upload Button */}
          <button
            onClick={onUploadClick}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md shadow-violet-600/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Material</span>
          </button>
        </div>
      </div>
    </header>
  );
}
