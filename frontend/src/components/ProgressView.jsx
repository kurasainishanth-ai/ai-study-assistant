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
  Flame
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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Learning Progress & Mastery Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent, uninflated metrics tracked directly in your local SQLite database.
          </p>
        </div>

        <button
          onClick={loadProgress}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Documents Loaded</span>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {progress?.materials_count ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">Stored in StudyVerse DB</div>
        </div>

        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Flashcards Active</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-violet-300 font-mono">
            {progress?.flashcards_count ?? 0}
          </div>
          <div className="text-[10px] text-slate-500">
            {progress?.cards_mastered ?? 0} Mastered · {progress?.cards_review_needed ?? 0} Due
          </div>
        </div>

        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Quiz Accuracy</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {progress?.average_quiz_accuracy ?? 0}%
          </div>
          <div className="text-[10px] text-slate-500">
            {progress?.quizzes_taken ?? 0} Diagnostic Quizzes Taken
          </div>
        </div>

        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Study Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            {progress?.streak_days ?? 1} Day{progress?.streak_days === 1 ? '' : 's'}
          </div>
          <div className="text-[10px] text-slate-500">Active learning streak</div>
        </div>
      </div>

      {/* Two Column Layout: Recommended Activities & Topic Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommended Activities */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Recommended Next Activities
          </h3>

          <div className="space-y-3">
            {(progress?.recommended_activities || [
              { title: 'Upload your first study material', tab: 'library', desc: 'Add lecture slides or textbook chapters.' },
              { title: 'Generate high-yield flashcards', tab: 'flashcards', desc: 'Build an active-recall deck with spaced repetition.' },
              { title: 'Take a diagnostic quiz', tab: 'quiz', desc: 'Identify possible misconceptions and test retention.' }
            ]).map((act, i) => (
              <div
                key={i}
                onClick={() => act.tab && onNavigateTab(act.tab)}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900 cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-violet-300 transition">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{act.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition" />
              </div>
            ))}
          </div>
        </div>

        {/* Topic Mastery & Activity Timeline */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            Recent Activity Log
          </h3>

          {progress?.recent_activity && progress.recent_activity.length > 0 ? (
            <div className="space-y-2.5">
              {progress.recent_activity.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-slate-200">{item.action}</div>
                      <div className="text-[10px] text-slate-500">{item.detail}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No activity logged yet. Start studying to record sessions!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
