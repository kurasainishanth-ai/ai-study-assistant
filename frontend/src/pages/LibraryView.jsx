import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  FileCheck,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ArrowRight,
  Loader2,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

export default function LibraryView({
  materials = [],
  activeDocId,
  setActiveDocId,
  onRefreshMaterials,
  onNavigateTab
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [inspectMaterial, setInspectMaterial] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [actionError, setActionError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setActionError(null);
    try {
      const res = await api.uploadMaterial(file);
      if (res.success && res.material) {
        await onRefreshMaterials();
        setActiveDocId(res.material.id);
      }
    } catch (err) {
      setActionError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = async () => {
    setIsUploading(true);
    setActionError(null);
    try {
      const res = await api.loadSampleMaterial();
      if (res.success && res.material) {
        await onRefreshMaterials();
        setActiveDocId(res.material.id);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to load sample notes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRename = async (docId) => {
    if (!renameValue.trim()) return;
    try {
      await api.renameMaterial(docId, renameValue.trim());
      await onRefreshMaterials();
      setEditingDocId(null);
      setRenameValue('');
    } catch (err) {
      setActionError(err.message || 'Rename failed');
    }
  };

  const handleDelete = async (docId, name) => {
    if (!window.confirm(`Delete "${name}" and all its saved notes, flashcards, and chat history?`)) return;
    try {
      await api.deleteMaterial(docId);
      await onRefreshMaterials();
      if (activeDocId === docId) {
        const remaining = materials.filter((m) => m.id !== docId);
        setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      setActionError(err.message || 'Delete failed');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="visible" 
      className="p-8 md:p-12 max-w-7xl mx-auto space-y-12 bg-[#0a0a0f] min-h-screen"
    >
      {/* Massive Upload Dropzone */}
      <motion.div variants={itemVariants}>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative overflow-hidden border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all duration-300 min-h-[400px] ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
              : 'border-slate-800 bg-[#141419] hover:border-slate-600 hover:bg-[#1a1a24]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="max-w-2xl mx-auto text-center space-y-8 px-6 z-10">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-24 h-24 rounded-[2rem] bg-[#0a0a0f] border border-slate-800 flex items-center justify-center mx-auto shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin relative z-10" />
              ) : (
                <Upload className="w-10 h-10 text-indigo-400 relative z-10" />
              )}
            </motion.div>

            <div>
              <h3 className="text-3xl font-bold text-white tracking-tight mb-3">
                {isUploading ? 'Extracting knowledge...' : 'Drop your study materials here'}
              </h3>
              <p className="text-base text-slate-400 leading-relaxed max-w-lg mx-auto">
                Upload course notes, lecture slides, textbooks or images. We'll instantly process them for your AI tutor.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {['PDF', 'PowerPoint', 'Word', 'Images', 'Text & Markdown'].map((type) => (
                <Badge key={type} variant="secondary" className="bg-[#0a0a0f] text-slate-400 border-slate-800 px-4 py-2">
                  {type}
                </Badge>
              ))}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white text-black hover:bg-slate-200 w-full sm:w-auto text-base px-8 h-12"
              >
                Browse Files
              </Button>
              <span className="text-sm text-slate-600 font-medium">or</span>
              <Button
                size="lg"
                variant="outline"
                onClick={handleLoadSample}
                disabled={isUploading}
                className="border-slate-700 hover:bg-[#1a1a24] text-white w-full sm:w-auto text-base px-8 h-12 gap-2"
              >
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Load Sample Note
              </Button>
            </div>
          </div>
          
          {/* Decorative background gradients */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
            <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[150%] bg-indigo-500/20 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] -right-[10%] w-[60%] h-[120%] bg-purple-500/20 blur-[120px] rounded-full" />
          </div>
        </div>
      </motion.div>

      {actionError && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
        </motion.div>
      )}

      {/* Materials Bento Grid */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              Your Library
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {materials.length} document{materials.length === 1 ? '' : 's'} ready for study
            </p>
          </div>
        </div>

        {materials.length === 0 ? (
          <Card className="bg-[#141419] border-slate-800/50 p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-[2rem] bg-[#0a0a0f] border border-slate-800 flex items-center justify-center mb-6 text-slate-500">
              <FileText className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-semibold text-white tracking-tight mb-2">Your library is empty</h4>
            <p className="text-base text-slate-400 max-w-md leading-relaxed">
              Upload your first document above to start generating smart notes, flashcards, and quizzes.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {materials.map((m) => {
                const isActive = m.id === activeDocId;
                const isEditing = editingDocId === m.id;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={m.id}
                  >
                    <Card
                      className={`bg-[#141419] border flex flex-col h-full transition-all duration-300 hover:-translate-y-1 ${
                        isActive ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <CardContent className="p-6 flex flex-col h-full justify-between gap-6">
                        <div>
                          <div className="flex justify-between items-start mb-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isActive ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-[#0a0a0f] border-slate-800 text-slate-400'
                            }`}>
                              <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isActive && (
                                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Active</Badge>
                              )}
                              {m.status === 'Ready' ? (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                                  <CheckCircle className="w-3.5 h-3.5" /> Ready
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                                  {m.status || 'Processing'}
                                </span>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 mb-2">
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                autoFocus
                                className="bg-[#0a0a0f] border-indigo-500/50 focus-visible:ring-indigo-500/50"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleRename(m.id)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white">Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingDocId(null)} className="flex-1 border-slate-700">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 leading-tight">
                              {m.name}
                            </h3>
                          )}
                        </div>

                        <div className="pt-5 border-t border-slate-800/80 flex flex-col gap-5 mt-auto">
                          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                            <span className="bg-[#0a0a0f] px-2.5 py-1 rounded-md border border-slate-800">{m.type}</span>
                            <span>{m.size_kb} KB</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setInspectMaterial(m)}
                                className="w-9 h-9 bg-[#0a0a0f] border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50"
                                title="Inspect Extracted Text"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setEditingDocId(m.id);
                                  setRenameValue(m.name);
                                }}
                                className="w-9 h-9 bg-[#0a0a0f] border-slate-800 text-slate-400 hover:text-white hover:border-slate-600"
                                title="Rename Document"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(m.id, m.name)}
                                className="w-9 h-9 bg-[#0a0a0f] border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            {!isActive && (
                              <Button
                                size="sm"
                                onClick={() => setActiveDocId(m.id)}
                                className="bg-white text-black hover:bg-slate-200 shadow-lg shadow-white/5"
                              >
                                Study This
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Extracted Content Verification Drawer/Modal */}
      <AnimatePresence>
        {inspectMaterial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141419] border border-slate-800 rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-[#0a0a0f]/50">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                    <FileCheck className="w-7 h-7 text-emerald-400" />
                    Text Extraction View
                  </h3>
                  <p className="text-base text-slate-400 mt-2">
                    This is the raw knowledge the AI tutor sees.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setInspectMaterial(null)}
                  className="w-12 h-12 rounded-full bg-[#0a0a0f] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </Button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-[#0a0a0f] p-6 rounded-3xl border border-slate-800 text-center">
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Characters</div>
                    <div className="text-3xl font-bold text-white font-mono">
                      {inspectMaterial.content ? inspectMaterial.content.length.toLocaleString() : 0}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0f] p-6 rounded-3xl border border-slate-800 text-center">
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Format</div>
                    <div className="text-3xl font-bold text-indigo-400 truncate">
                      {inspectMaterial.type}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0f] p-6 rounded-3xl border border-slate-800 text-center">
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Status</div>
                    <div className="text-3xl font-bold text-emerald-400">
                      Verified
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-lg font-semibold text-white mb-4 block">
                    Parsed Text Content
                  </label>
                  <div className="bg-[#0a0a0f] p-8 rounded-3xl border border-slate-800 max-h-[50vh] overflow-y-auto font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                    {inspectMaterial.content || 'No text extracted.'}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-800 bg-[#0a0a0f]/50 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setInspectMaterial(null)}
                  className="border-slate-700 hover:bg-slate-800 text-white"
                >
                  Close Preview
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setActiveDocId(inspectMaterial.id);
                    setInspectMaterial(null);
                    onNavigateTab('notes');
                  }}
                  className="bg-white text-black hover:bg-slate-200"
                >
                  Generate Notes <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
