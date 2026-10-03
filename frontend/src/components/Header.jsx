import React from 'react';
import { Upload, AlertCircle } from 'lucide-react';

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
  onClearError
}) {
  const title = TAB_TITLES[activeTab] || 'StudyVerse';

  return (
    <header className="border-b border-slate-800/60 bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-20 px-6 py-3">
      {errorMessage && (
        <div className="bg-rose-950/60 border border-rose-800/60 text-rose-300 px-3 py-2 rounded-lg text-xs flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={onClearError} className="text-rose-400 hover:text-white font-bold ml-4 text-sm">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-2.5">
          {activeDoc && (
            <span className="hidden md:inline text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg truncate max-w-[200px]">
              {activeDoc.name}
            </span>
          )}

          <button
            onClick={onUploadClick}
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>
    </header>
  );
}
