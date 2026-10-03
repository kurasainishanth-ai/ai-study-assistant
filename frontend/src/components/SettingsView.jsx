import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Database, CheckCircle, FileCheck, RefreshCw, Clock, ShieldCheck, Zap } from 'lucide-react';
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
    <div className="min-h-full bg-[#0a0a0f] text-slate-300 py-10 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-400" />
              Settings
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Manage your workspace configuration and system health.
            </p>
          </div>
          <button
            onClick={checkHealth}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#141419] hover:bg-[#1a1a24] border border-slate-800/50 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        <div className="space-y-6">
          {/* Section: AI Configuration */}
          <div className="bg-[#141419] rounded-2xl border border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Google Gemini API</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Powered by google-genai SDK</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm text-slate-400">Configured Model</span>
                <span className="inline-flex items-center rounded-md bg-[#0a0a0f] border border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                  {health?.configured_model || health?.default_model || 'gemini-2.5-flash-lite'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm text-slate-400">API Key Status</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" /> Secure (.env)
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm text-slate-400">Client Exposure</span>
                <span className="text-sm text-emerald-400">None (Server Only)</span>
              </div>
            </div>
          </div>

          {/* Section: System Infrastructure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local Database */}
            <div className="bg-[#141419] rounded-2xl border border-slate-800/50 overflow-hidden">
              <div className="p-6 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Local Database</h3>
                    <p className="text-xs text-slate-500 mt-0.5">studyverse.db</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Engine</span>
                  <span className="text-slate-300 font-mono text-xs">SQLite 3</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Cascade Deletes</span>
                  <span className="text-emerald-400">Enabled</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Persistence</span>
                  <span className="text-slate-300">Zero Cloud Leakage</span>
                </div>
              </div>
            </div>

            {/* Document Extractors */}
            <div className="bg-[#141419] rounded-2xl border border-slate-800/50 overflow-hidden">
              <div className="p-6 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">Document Pipeline</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Extractors Status</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">PDF Engine</span>
                  <span className="text-slate-300 font-mono text-xs">PyMuPDF + pypdf</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">PowerPoint</span>
                  <span className="text-slate-300 font-mono text-xs">python-pptx</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Word</span>
                  <span className="text-slate-300 font-mono text-xs">python-docx</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Spaced Repetition Settings */}
          <div className="bg-[#141419] rounded-2xl border border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Spaced Repetition Schedule (SRS)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ebbinghaus forgetting curve standards</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0a0a0f] border border-slate-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Know It</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Interval extended by <strong className="text-slate-300">+3 days</strong>. Marked as mastered.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0a0a0f] border border-slate-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Review Again</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Interval set to <strong className="text-slate-300">+1 day</strong>. Scheduled for next session.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0a0a0f] border border-slate-800/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Difficult</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Interval reset to <strong className="text-slate-300">+6 hours</strong> for rapid re-exposure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
