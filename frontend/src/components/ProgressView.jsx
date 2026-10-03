import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Layers,
  BrainCircuit,
  BookOpen,
  Calendar,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Flame,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

export default function ProgressView({ onNavigateTab }) {
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getProgressAnalytics();
      setProgress(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load progress analytics');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#0a0a0f] py-10 px-4 sm:px-8 text-slate-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-slate-400" />
              Progress Analytics
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Transparent, uninflated metrics tracked directly in your local SQLite database.
            </p>
          </div>
          <button
            onClick={loadProgress}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#141419] hover:bg-[#1a1a24] border border-slate-800/50 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {errorMsg}
          </div>
        )}

        {/* Bento Box KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#141419] p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-between hover:border-slate-700/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white tracking-tight">
                {progress?.materials_count ?? 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">Documents Loaded</div>
            </div>
          </div>

          <div className="bg-[#141419] p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-between hover:border-slate-700/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {progress?.cards_mastered ?? 0} Mastered
              </span>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white tracking-tight">
                {progress?.flashcards_count ?? 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">Active Flashcards</div>
            </div>
          </div>

          <div className="bg-[#141419] p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-between hover:border-slate-700/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-medium bg-slate-800/50 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700/50">
                {progress?.quizzes_taken ?? 0} Taken
              </span>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white tracking-tight">
                {progress?.average_quiz_accuracy ?? 0}%
              </div>
              <div className="text-sm text-slate-500 mt-1">Quiz Accuracy</div>
            </div>
          </div>

          <div className="bg-[#141419] p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-between hover:border-slate-700/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white tracking-tight flex items-baseline gap-1">
                {progress?.streak_days ?? 0}
                <span className="text-lg font-normal text-slate-500">
                  Day{progress?.streak_days !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-sm text-slate-500 mt-1">Active Streak</div>
            </div>
          </div>
        </div>

        {/* Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Next Steps */}
          <div className="bg-[#141419] rounded-2xl border border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 bg-[#1a1a24]/30">
              <h3 className="text-base font-medium text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Recommended Next Steps
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {(progress?.recommended_activities || [
                { title: 'Upload your first study material', tab: 'library', desc: 'Add lecture slides or textbook chapters.' },
                { title: 'Generate high-yield flashcards', tab: 'flashcards', desc: 'Build an active-recall deck with spaced repetition.' },
                { title: 'Take a diagnostic quiz', tab: 'quiz', desc: 'Identify possible misconceptions and test retention.' }
              ]).map((act, i) => (
                <div
                  key={i}
                  onClick={() => act.tab && onNavigateTab(act.tab)}
                  className="group flex items-start gap-4 p-4 rounded-xl bg-[#0a0a0f]/50 hover:bg-[#1a1a24] border border-transparent hover:border-slate-700/50 cursor-pointer transition-all"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {act.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-[#141419] rounded-2xl border border-slate-800/50 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800/50 bg-[#1a1a24]/30">
              <h3 className="text-base font-medium text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                Recent Activity
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {progress?.recent_activity && progress.recent_activity.length > 0 ? (
                <div className="divide-y divide-slate-800/50">
                  {progress.recent_activity.map((item, idx) => (
                    <div key={idx} className="p-5 hover:bg-[#1a1a24]/50 transition-colors flex items-start gap-4">
                      <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500/50 ring-4 ring-indigo-500/10 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{item.action}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail}</p>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                        {item.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                  <Activity className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">No recent activity recorded.</p>
                  <p className="text-xs mt-1 opacity-60">Start studying to see your history.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
