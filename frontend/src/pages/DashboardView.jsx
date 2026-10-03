import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-8 md:p-12 max-w-7xl mx-auto space-y-12 bg-[#0a0a0f] min-h-screen text-slate-300"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-6 relative z-10">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="space-y-6 max-w-3xl relative z-10">
          <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 px-4 py-1.5 rounded-full text-xs font-medium uppercase tracking-widest flex items-center gap-2 w-fit">
            <Sparkles className="w-4 h-4" /> AI-Powered Study Environment
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
            Elevate Your <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Learning Journey</span>
          </h1>
          
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
            Upload your course materials and let StudyVerse automatically generate smart notes, spaced-repetition flashcards, and diagnostic quizzes tailored to your syllabus.
          </p>
          
          <div className="pt-4 flex items-center gap-4">
            <Button 
              size="lg" 
              onClick={onUploadClick}
              className="bg-white text-black hover:bg-slate-200 shadow-lg shadow-white/10"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Material
            </Button>
            {materials.length > 0 && (
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => onNavigateTab('library')}
                className="border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View Library
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Feature Cards Grid (Bento style) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { id: 'notes', icon: FileText, label: 'Smart Notes', desc: 'Synthesize materials into cheat sheets and outlines.', color: 'from-purple-500/20 to-indigo-500/20', iconColor: 'text-purple-400' },
          { id: 'flashcards', icon: Layers, label: 'Flashcards', desc: 'Active recall training with spaced repetition.', color: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400' },
          { id: 'quiz', icon: BrainCircuit, label: 'Quiz Arena', desc: 'Targeted tests to isolate learning blind spots.', color: 'from-emerald-500/20 to-teal-500/20', iconColor: 'text-emerald-400' },
          { id: 'tutor', icon: Bot, label: 'AI Tutor', desc: 'Get explanations grounded in your documents.', color: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-400' },
        ].map(({ id, icon: Icon, label, desc, color, iconColor }) => (
          <Card 
            key={id}
            onClick={() => onNavigateTab(id)}
            className="cursor-pointer group hover:border-slate-600 transition-all duration-300 bg-[#141419] border-slate-800/80 hover:-translate-y-1 overflow-hidden relative"
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${color} transition-opacity duration-500 pointer-events-none`} />
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-[#0a0a0f] border border-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm relative z-10">
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <CardTitle className="text-xl text-white z-10 relative">{label}</CardTitle>
            </CardHeader>
            <CardContent className="z-10 relative">
              <p className="text-slate-400 mb-6">{desc}</p>
              <div className={`flex items-center text-sm font-medium ${iconColor} group-hover:translate-x-2 transition-transform`}>
                Explore <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Two Column Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Materials */}
        <Card className="lg:col-span-2 bg-[#141419] border-slate-800/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-white">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Recent Materials
            </CardTitle>
            {materials.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => onNavigateTab('library')} className="text-indigo-400 hover:text-indigo-300">
                View all <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <FileBox className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 mb-6">Your study library is empty.</p>
                <Button onClick={onUploadClick} className="bg-white text-black hover:bg-slate-200">
                  Upload your first document
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {materials.slice(0, 5).map((m) => {
                  const isActive = m.id === activeDocId;
                  return (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      key={m.id}
                      onClick={() => setActiveDocId(m.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                          : 'bg-[#0a0a0f] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${isActive ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-[#141419] border-slate-800 text-slate-400'}`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-base font-semibold text-white mb-1 line-clamp-1">{m.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                            <span className="uppercase tracking-wider">{m.type}</span>
                            <span>•</span>
                            <span>{m.size_kb} KB</span>
                            <span>•</span>
                            <span>{m.upload_time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setActiveDocId(m.id); onNavigateTab('notes'); }}
                          className="border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                          Notes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setActiveDocId(m.id); onNavigateTab('flashcards'); }}
                          className="border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                          Cards
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Snapshot */}
        <Card className="bg-[#141419] border-slate-800/80 flex flex-col relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white relative z-10">
              <Award className="w-5 h-5 text-emerald-400" />
              Learning Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow relative z-10">
            <div className="space-y-4 flex-grow">
              {[
                { label: 'Documents Processed', value: materials.length, color: 'text-white', icon: BookOpen },
                { label: 'Average Quiz Score', value: `${progress?.average_quiz_score ?? 0}%`, color: 'text-emerald-400', icon: BrainCircuit },
                { label: 'Flashcards Generated', value: progress?.total_flashcards ?? 0, color: 'text-purple-400', icon: Layers },
                { label: 'Quizzes Taken', value: progress?.total_quizzes ?? 0, color: 'text-cyan-400', icon: Award },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="bg-[#0a0a0f] p-4 rounded-xl border border-slate-800/50 flex items-center justify-between group hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
                    <span className="text-sm font-medium text-slate-400">{label}</span>
                  </div>
                  <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => onNavigateTab('progress')}
              className="w-full mt-8 border-slate-700 hover:bg-slate-800 text-white flex items-center justify-center gap-2 group"
            >
              View Full Analytics
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
