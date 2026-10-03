import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Cpu, Database, CheckCircle, FileCheck, RefreshCw, Clock, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

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

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full text-slate-300">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Settings className="w-8 h-8 text-indigo-400" />
              Settings & Infrastructure
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Manage your workspace configuration and monitor system health.
            </p>
          </div>
          <Button
            onClick={checkHealth}
            disabled={isLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                  </div>
                  Google Gemini API
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Configured Model</span>
                  <Badge variant="outline" className="text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
                    {health?.configured_model || health?.default_model || 'gemini-2.5-flash-lite'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">API Key Status</span>
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                    <CheckCircle className="w-4 h-4" /> Secure (.env)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Client Exposure</span>
                  <span className="text-sm text-emerald-400 font-medium">None (Server Only)</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  Local Database
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Engine</span>
                  <span className="text-sm text-slate-300 font-mono">SQLite 3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Cascade Deletes</span>
                  <span className="text-sm text-emerald-400 font-medium">Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Persistence</span>
                  <span className="text-sm text-slate-300">Zero Cloud Leakage</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  Document Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">PDF Engine</span>
                  <span className="text-sm text-slate-300 font-mono">PyMuPDF + pypdf</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">PowerPoint</span>
                  <span className="text-sm text-slate-300 font-mono">python-pptx</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Word</span>
                  <span className="text-sm text-slate-300 font-mono">python-docx</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="border-b border-slate-800/50 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  Spaced Repetition (SRS)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <CheckCircle className="w-5 h-5 text-emerald-400" />
                     <div>
                       <div className="text-sm font-medium text-white">Know It</div>
                       <div className="text-xs text-slate-500">Interval +3 days</div>
                     </div>
                   </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <Clock className="w-5 h-5 text-amber-400" />
                     <div>
                       <div className="text-sm font-medium text-white">Review Again</div>
                       <div className="text-xs text-slate-500">Interval +1 day</div>
                     </div>
                   </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <Zap className="w-5 h-5 text-rose-400" />
                     <div>
                       <div className="text-sm font-medium text-white">Difficult</div>
                       <div className="text-xs text-slate-500">Interval +6 hours</div>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
