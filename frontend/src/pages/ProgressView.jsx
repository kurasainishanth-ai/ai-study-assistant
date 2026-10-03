import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Award, Layers, BookOpen, Calendar, AlertCircle, Sparkles, ArrowRight, RefreshCw, Flame, Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, opacity: 1, 
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const flashcardData = [
    { name: 'Mastered', value: progress?.cards_mastered || 0, color: '#10b981' },
    { name: 'Learning', value: Math.max((progress?.flashcards_count || 0) - (progress?.cards_mastered || 0), 0), color: '#6366f1' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full text-slate-300">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-400" />
              Progress Analytics
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Transparent, uninflated metrics tracked directly in your local SQLite database.
            </p>
          </div>
          <Button
            onClick={loadProgress}
            disabled={isLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {errorMsg}
          </div>
        )}

        {/* Bento Box KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-6 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    {progress?.materials_count ?? 0}
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Documents Loaded</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-6 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-indigo-400" />
                  </div>
                  <Badge variant="outline" className="text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
                    {progress?.cards_mastered ?? 0} Mastered
                  </Badge>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    {progress?.flashcards_count ?? 0}
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Active Flashcards</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-6 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-emerald-400" />
                  </div>
                  <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800/50">
                    {progress?.quizzes_taken ?? 0} Taken
                  </Badge>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    {progress?.average_quiz_accuracy ?? 0}%
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Quiz Accuracy</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardContent className="pt-6 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white tracking-tight flex items-baseline gap-1">
                    {progress?.streak_days ?? 0}
                    <span className="text-lg font-normal text-slate-500">
                      Day{progress?.streak_days !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1 font-medium">Active Streak</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Dashboard Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="space-y-3">
                  {(progress?.recommended_activities || [
                    { title: 'Upload your first study material', tab: 'library', desc: 'Add lecture slides or textbook chapters.' },
                    { title: 'Generate high-yield flashcards', tab: 'flashcards', desc: 'Build an active-recall deck with spaced repetition.' },
                    { title: 'Take a diagnostic quiz', tab: 'quiz', desc: 'Identify possible misconceptions and test retention.' }
                  ]).map((act, i) => (
                    <div
                      key={i}
                      onClick={() => act.tab && onNavigateTab(act.tab)}
                      className="group flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                          {act.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{act.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 mt-4 space-y-4">
                  {progress?.recent_activity && progress.recent_activity.length > 0 ? (
                    progress.recent_activity.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 group">
                        <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500/50 ring-4 ring-indigo-500/10 shrink-0 group-hover:bg-indigo-400 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{item.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">{item.detail}</p>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap pt-0.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                          {item.timestamp}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                      <Activity className="w-8 h-8 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No recent activity recorded.</p>
                      <p className="text-xs mt-1 opacity-60">Start studying to see your history.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
