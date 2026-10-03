import React from 'react';
import { Upload, AlertCircle, Menu } from 'lucide-react';

const TAB_TITLES = {
  dashboard: 'Dashboard',
  library: 'My Library',
  tutor: 'AI Study Agent',
  notes: 'Smart Notes',
  flashcards: 'Flashcards',
  visuals: 'Visual Learning',
  quiz: 'Quiz Arena',
  map: 'Knowledge Map',
  progress: 'Learning Progress',
  settings: 'Settings',
};

export default function Header({
  activeTab,
  activeDoc,
  streakDays = 1,
  onUploadClick,
  errorMessage,
  onClearError,
  onMenuClick
}) {
  const title = TAB_TITLES[activeTab] || 'StudyVerse';

  return (
    <header className="border-b border-slate-800/40 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-20 px-8 py-5">
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/40 text-rose-300 px-4 py-2.5 rounded-xl text-sm flex items-center justify-between mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={onClearError} className="text-rose-400 hover:text-rose-200 transition-colors ml-4 text-lg leading-none">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden text-slate-400 hover:text-white p-1 -ml-1 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {activeDoc && (
            <span className="hidden md:inline text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800/50 truncate max-w-[250px] shadow-sm">
              {activeDoc.name}
            </span>
          )}

          <button
            onClick={onUploadClick}
            className="btn btn-primary text-sm py-2 px-5 flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}
