import React from 'react';
import {
  LayoutDashboard,
  Library,
  Bot,
  FileText,
  Layers,
  Image,
  BrainCircuit,
  Network,
  TrendingUp,
  Settings,
  Sparkles,
  FileBox
} from 'lucide-react';

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

export default function Sidebar({
  activeTab,
  setActiveTab,
  materials = [],
  activeDocId,
  setActiveDocId,
  isHealthy = true,
  defaultModel = 'gemini-2.5-flash-lite'
}) {
  return (
    <aside style={{ width: '260px', minWidth: '260px' }} className="h-screen bg-[#111116] border-r border-slate-800/40 flex flex-col justify-between select-none shadow-xl z-30 relative">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-800/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">StudyVerse</span>
          </div>
        </div>

        {/* Document selector */}
        <div className="px-5 py-5 border-b border-slate-800/30 flex-shrink-0">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Active Material
          </div>
          {materials.length === 0 ? (
            <div
              onClick={() => setActiveTab('library')}
              className="text-sm text-slate-400 p-3 rounded-xl border border-dashed border-slate-700/60 hover:border-violet-500/40 hover:bg-violet-900/10 hover:text-slate-300 cursor-pointer flex items-center gap-3 transition-all"
            >
              <FileBox className="w-4 h-4 text-violet-400" />
              <span>Upload document</span>
            </div>
          ) : (
            <select
              value={activeDocId || ''}
              onChange={(e) => setActiveDocId(e.target.value)}
              className="w-full bg-[#16161d] text-sm text-slate-200 border border-slate-700/50 rounded-xl px-3 py-2.5 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 cursor-pointer appearance-none transition-all shadow-inner"
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
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2">
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-300 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800/40 bg-[#0d0d12] text-xs text-slate-500 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)] ${isHealthy ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="font-medium">System Online</span>
        </div>
        <span className="font-mono text-[10px] text-slate-600 tracking-wider">v2.5</span>
      </div>
    </aside>
  );
}
