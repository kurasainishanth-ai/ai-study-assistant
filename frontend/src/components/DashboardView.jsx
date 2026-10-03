import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  BrainCircuit,
  FileText,
  Upload,
  ArrowRight,
  Award,
  Bot,
  FileBox,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardView({
  materials = [],
  activeDocId,
  setActiveDocId,
  onNavigateTab,
  onUploadClick
}) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.getProgressAnalytics().then(setProgress).catch(() => {});
  }, [materials]);

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-10">

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Study Environment</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Elevate Your <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Learning Journey</span>
          </h2>
          <p className="text-base text-slate-400 leading-relaxed max-w-xl">
            Upload your course materials and let StudyVerse automatically generate smart notes, spaced-repetition flashcards, and diagnostic quizzes tailored to your syllabus.
          </p>
          <div className="pt-4 flex items-center gap-4">
            <button
              onClick={onUploadClick}
              className="btn btn-primary text-sm py-3 px-6 shadow-lg shadow-violet-500/25"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Material
            </button>
            {materials.length > 0 && (
              <button
                onClick={() => onNavigateTab('library')}
                className="btn btn-secondary text-sm py-3 px-6"
              >
                <BookOpen className="w-4 h-4 text-cyan-400 mr-2" />
                View Library
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Cards Grid (Bento style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'notes', icon: FileText, label: 'Smart Notes', desc: 'Synthesize materials into cheat sheets and outlines.', color: 'violet' },
          { id: 'flashcards', icon: Layers, label: 'Flashcards', desc: 'Active recall training with spaced repetition.', color: 'indigo' },
          { id: 'quiz', icon: BrainCircuit, label: 'Quiz Arena', desc: 'Targeted tests to isolate learning blind spots.', color: 'emerald' },
          { id: 'tutor', icon: Bot, label: 'AI Tutor', desc: 'Get explanations grounded in your documents.', color: 'cyan' },
        ].map(({ id, icon: Icon, label, desc, color }) => (
          <div
            key={id}
            onClick={() => onNavigateTab(id)}
            className="glass-card p-6 md:p-8 cursor-pointer group flex flex-col items-start"
          >
            <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-${color}-500/20 transition-all duration-300`}>
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{label}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-grow">{desc}</p>
            <div className={`mt-auto flex items-center text-xs font-semibold text-${color}-400 group-hover:translate-x-1 transition-transform`}>
              Explore <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Recent Materials (Wider Column) */}
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-violet-400" />
              Recent Materials
            </h3>
            {materials.length > 0 && (
              <button
                onClick={() => onNavigateTab('library')}
                className="text-sm font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {materials.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
              <FileBox className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm mb-4">Your study library is empty.</p>
              <button onClick={onUploadClick} className="btn btn-secondary">
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.slice(0, 5).map((m) => {
                const isActive = m.id === activeDocId;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveDocId(m.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-violet-900/10 border-violet-500/50 shadow-md shadow-violet-900/10'
                        : 'bg-slate-900/20 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-400'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-white mb-1 line-clamp-1">
                          {m.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="uppercase tracking-wider font-mono">{m.type}</span>
                          <span>•</span>
                          <span>{m.size_kb} KB</span>
                          <span>•</span>
                          <span>{m.upload_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveDocId(m.id); onNavigateTab('notes'); }}
                        className="btn btn-secondary py-1.5 px-3 text-xs bg-slate-800/50 hover:bg-slate-700 hover:text-white"
                      >
                        Notes
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveDocId(m.id); onNavigateTab('flashcards'); }}
                        className="btn btn-secondary py-1.5 px-3 text-xs bg-slate-800/50 hover:bg-slate-700 hover:text-white"
                      >
                        Cards
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Snapshot (Narrower Column) */}
        <div className="glass-card p-8 flex flex-col">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5 mb-8">
            <Award className="w-5 h-5 text-emerald-400" />
            Learning Snapshot
          </h3>

          <div className="space-y-6 flex-grow">
            {[
              { label: 'Documents Processed', value: materials.length, color: 'text-white' },
              { label: 'Average Quiz Score', value: `${progress?.average_quiz_score ?? 0}%`, color: 'text-emerald-400' },
              { label: 'Flashcards Generated', value: progress?.total_flashcards ?? 0, color: 'text-violet-400' },
              { label: 'Quizzes Taken', value: progress?.total_quizzes ?? 0, color: 'text-cyan-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">{label}</span>
                <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={() => onNavigateTab('progress')}
              className="w-full btn btn-secondary py-3 flex items-center justify-center gap-2 group"
            >
              <span>View Full Analytics</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
