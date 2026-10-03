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
    <aside style={{ width: '220px', minWidth: '220px' }} className="h-screen bg-[#0f172a] border-r border-slate-800/60 flex flex-col justify-between select-none">
      <div>
        {/* Brand */}
        <div className="px-5 py-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base text-white tracking-wide">StudyVerse</span>
          </div>
        </div>

        {/* Document selector */}
        <div className="px-4 py-3 border-b border-slate-800/40">
          {materials.length === 0 ? (
            <div
              onClick={() => setActiveTab('library')}
              className="text-xs text-slate-500 p-2 rounded-lg border border-dashed border-slate-700/60 hover:border-violet-500/40 hover:text-slate-400 cursor-pointer flex items-center gap-2 transition"
            >
              <FileBox className="w-3.5 h-3.5 text-violet-400" />
              <span>Upload a document</span>
            </div>
          ) : (
            <select
              value={activeDocId || ''}
              onChange={(e) => setActiveDocId(e.target.value)}
              className="w-full bg-[#151d30] text-xs text-slate-300 border border-slate-700/60 rounded-lg px-2.5 py-2 outline-none focus:border-violet-500/60 cursor-pointer"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.length > 28 ? `${m.name.slice(0, 26)}…` : m.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Nav items */}
        <nav className="px-3 py-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-220px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800/50 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span>Gemini API</span>
        </div>
        <span className="font-mono text-slate-600">{defaultModel.replace('gemini-', '').replace('models/', '')}</span>
      </div>
    </aside>
  );
}
