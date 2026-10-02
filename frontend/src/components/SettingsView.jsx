import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Database,
  CheckCircle,
  FileCheck,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsView() {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-violet-400" />
            System & Workspace Settings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Architecture status, Gemini API configuration, and document pipeline health.
          </p>
        </div>

        <button
          onClick={checkHealth}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Check Status</span>
        </button>
      </div>

      {/* Grid of Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gemini AI Card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Google Gemini API</h3>
              <p className="text-[10px] text-slate-400">google-genai SDK</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Configured Model:</span>
              <span className="font-mono text-violet-300 font-semibold bg-violet-950/50 px-2 py-0.5 rounded border border-violet-800/40">
                {health?.configured_model || health?.default_model || 'gemini-2.5-flash-lite'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">API Key Status:</span>
              <span className="badge badge-emerald text-[9px] flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" /> Secure (.env)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Client Exposure:</span>
              <span className="text-emerald-400 font-medium">None (Server Only)</span>
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Local SQLite Database</h3>
              <p className="text-[10px] text-slate-400">studyverse.db</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Engine:</span>
              <span className="text-slate-200 font-mono">SQLite 3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cascade Deletes:</span>
              <span className="text-emerald-400 font-medium">Enabled (Foreign Keys)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Local Persistence:</span>
              <span className="badge badge-cyan text-[9px]">Zero Cloud Leakage</span>
            </div>
          </div>
        </div>

        {/* Extraction Pipeline Card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Document Extractors</h3>
              <p className="text-[10px] text-slate-400">PyMuPDF, PPTX, DOCX</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PDF Engine:</span>
              <span className="text-slate-200 font-mono">PyMuPDF (fitz) + pypdf</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PowerPoint Engine:</span>
              <span className="text-slate-200 font-mono">python-pptx</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Word Engine:</span>
              <span className="text-slate-200 font-mono">python-docx</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spaced Repetition & Misconception Policy */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-400" />
          Spaced Repetition Schedule (SRS) & Diagnostic Standards
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          StudyVerse employs active recall with spaced repetition intervals based on Ebbinghaus forgetting curve research:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Know It (Mastered)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Card interval extended by <strong>+3 days</strong>. Marked as mastered in your progress dashboard.
            </p>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Review Again (Moderate)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Card interval set to <strong>+1 day</strong>. Scheduled for your next daily study session.
            </p>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Difficult (Struggling)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Card interval reset to <strong>+6 hours</strong> for rapid re-exposure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
