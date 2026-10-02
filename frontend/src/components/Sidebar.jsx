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
  CheckCircle,
  FileBox
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library', label: 'My Library', icon: Library },
  { id: 'tutor', label: 'AI Study Agent', icon: Bot, badge: 'Grounded' },
  { id: 'notes', label: 'Smart Notes', icon: FileText, badge: '11 Styles' },
  { id: 'flashcards', label: 'Flashcard Studio', icon: Layers, badge: 'SRS' },
  { id: 'visuals', label: 'Visual Learning', icon: Image, badge: 'Multimodal' },
  { id: 'quiz', label: 'Quiz Arena', icon: BrainCircuit, badge: 'Adaptive' },
  { id: 'map', label: 'Knowledge Map', icon: Network },
  { id: 'progress', label: 'Learning Progress', icon: TrendingUp },
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
  const activeDoc = materials.find((m) => m.id === activeDocId);

  return (
    <aside style={{ width: '270px', minWidth: '270px' }} className="h-screen bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg text-white tracking-wide flex items-center gap-1.5">
                StudyVerse <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-mono">AI</span>
              </div>
              <div className="text-xs text-slate-400">Multimodal Learning</div>
            </div>
          </div>
        </div>

        {/* Active Material Quick Selector */}
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/50">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Active Study Material</span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {materials.length} loaded
            </span>
          </div>

          {materials.length === 0 ? (
            <div
              onClick={() => setActiveTab('library')}
              className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-dashed border-slate-700 hover:border-violet-500/50 hover:text-slate-300 cursor-pointer flex items-center gap-2 transition"
            >
              <FileBox className="w-4 h-4 text-violet-400" />
              <span>No materials yet. Upload one!</span>
            </div>
          ) : (
            <select
              value={activeDocId || ''}
              onChange={(e) => setActiveDocId(e.target.value)}
              className="w-full bg-[#151d30] text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-500 cursor-pointer"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.length > 26 ? `${m.name.slice(0, 24)}...` : m.name}
                </option>
              ))}
            </select>
          )}

          {activeDoc && (
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
              <span className="truncate max-w-[170px]">{activeDoc.type}</span>
              <span className="font-mono text-slate-500">{activeDoc.size_kb} KB</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/20 text-white border border-violet-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? 'bg-violet-500/40 text-violet-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info / Gemini Active Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-rose-500'}`} />
            <span>Gemini API</span>
          </div>
          <span className="text-[10px] font-mono text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded border border-violet-800/40">
            {defaultModel}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
          <span>FastAPI + SQLite</span>
          <span>v2.5</span>
        </div>
      </div>
    </aside>
  );
}
