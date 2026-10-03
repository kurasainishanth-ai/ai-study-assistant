import React from 'react';
import { Upload, Menu } from 'lucide-react';
import { Button } from '../components/ui/Button';

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

export function Header({
  activeTab,
  activeDoc,
  onUploadClick,
  onMenuClick
}) {
  const title = TAB_TITLES[activeTab] || 'StudyVerse';

  return (
    <header className="border-b border-slate-800/50 bg-[#050814]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {activeDoc && (
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-300 bg-[#0a0f1c] px-4 py-2 rounded-full border border-slate-800/60 shadow-inner max-w-[300px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="truncate">{activeDoc.name}</span>
          </div>
        )}

        <Button variant="vibrant" size="sm" onClick={onUploadClick} className="gap-2 rounded-full px-5">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Material</span>
        </Button>
      </div>
    </header>
  );
}
