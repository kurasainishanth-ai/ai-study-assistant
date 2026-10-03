import React from 'react';
import { 
  LayoutDashboard, Library, Bot, FileText, Layers, 
  Image, BrainCircuit, Network, TrendingUp, Settings, 
  Sparkles, FileBox 
} from 'lucide-react';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library', label: 'My Library', icon: Library },
  { id: 'tutor', label: 'AI Study Agent', icon: Bot },
  { id: 'notes', label: 'Smart Notes', icon: FileText },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'visuals', label: 'Visual Learning', icon: Image },
  { id: 'quiz', label: 'Quiz Arena', icon: BrainCircuit },
  { id: 'map', label: 'Knowledge Map', icon: Network },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  materials = [],
  activeDocId,
  setActiveDocId
}) {
  return (
    <aside className="h-full w-[260px] bg-[#0a0f1c] border-r border-slate-800/50 flex flex-col shadow-2xl relative z-40">
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-vibrant flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">StudyVerse</span>
          </div>
        </div>

        {/* Document selector */}
        <div className="px-5 py-5 border-b border-slate-800/50 flex-shrink-0">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Active Material
          </div>
          {materials.length === 0 ? (
            <div
              onClick={() => setActiveTab('library')}
              className="text-sm text-slate-400 p-3 rounded-xl border border-dashed border-slate-700/60 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-slate-200 cursor-pointer flex items-center gap-3 transition-all"
            >
              <FileBox className="w-4 h-4 text-violet-400" />
              <span>Upload document</span>
            </div>
          ) : (
            <select
              value={activeDocId || ''}
              onChange={(e) => setActiveDocId(e.target.value)}
              className="w-full bg-[#050814] text-sm text-slate-200 border border-slate-700/50 rounded-xl px-3 py-3 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 cursor-pointer appearance-none transition-all shadow-inner font-medium"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.length > 25 ? `${m.name.slice(0, 23)}…` : m.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-violet-600/10 text-violet-400"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full" />
                )}
                <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-400")} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
