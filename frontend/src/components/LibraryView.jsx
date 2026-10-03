import React, { useState, useRef } from 'react';
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-10">
      {/* Massive Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative overflow-hidden border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 min-h-[320px] ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01]'
            : 'border-slate-800 bg-[#141419]/50 hover:border-slate-600 hover:bg-[#141419]'
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

        <div className="max-w-lg mx-auto text-center space-y-6 px-6 z-10">
          <div className="w-20 h-20 rounded-3xl bg-[#0a0a0f] border border-slate-800/80 flex items-center justify-center mx-auto shadow-2xl transition-transform hover:scale-105">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-white tracking-tight">
              {isUploading ? 'Extracting knowledge...' : 'Drop your study materials here'}
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Upload course notes, lecture slides, textbooks or images. We'll instantly process them for your AI tutor.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs font-medium text-slate-500">
            <span className="px-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-slate-800">PDF</span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-slate-800">PowerPoint</span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-slate-800">Word</span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-slate-800">Images</span>
            <span className="px-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-slate-800">Text & Markdown</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold text-sm py-3 px-8 rounded-xl transition-all shadow-md w-full sm:w-auto"
            >
              Browse Files
            </button>
            <span className="text-sm text-slate-600 font-medium">or</span>
            <button
              onClick={handleLoadSample}
              disabled={isUploading}
              className="bg-[#0a0a0f] hover:bg-[#111116] border border-slate-800/80 disabled:opacity-50 text-slate-300 font-semibold text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Load Sample Note</span>
            </button>
          </div>
        </div>
        
        {/* Decorative background gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[150%] bg-indigo-500/10 blur-3xl rounded-full" />
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[120%] bg-violet-500/10 blur-3xl rounded-full" />
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Materials Bento Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Your Library
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {materials.length} document{materials.length === 1 ? '' : 's'} ready for study
            </p>
          </div>
        </div>

        {materials.length === 0 ? (
          <div className="bg-[#141419] border border-slate-800/50 rounded-3xl p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-[#0a0a0f] border border-slate-800/50 flex items-center justify-center mx-auto text-slate-600">
              <FileText className="w-8 h-8" />
            </div>
            <h4 className="text-base font-medium text-white tracking-tight">Your library is empty</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Upload your first document above to start generating smart notes, flashcards, and quizzes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((m) => {
              const isActive = m.id === activeDocId;
              const isEditing = editingDocId === m.id;

              return (
                <div
                  key={m.id}
                  className={`bg-[#141419] border rounded-2xl p-5 flex flex-col justify-between transition-all group ${
                    isActive ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.05)]' : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-[#0a0a0f] border-slate-800 text-slate-400 group-hover:text-slate-300'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isActive && (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
                            Active
                          </span>
                        )}
                        {m.status === 'Ready' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                            <CheckCircle className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                            {m.status || 'Processing'}
                          </span>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mb-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="w-full bg-[#0a0a0f] border border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRename(m.id)}
                            className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-xs py-2 rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDocId(null)}
                            className="flex-1 bg-[#0a0a0f] hover:bg-[#111116] border border-slate-800 text-slate-300 font-medium text-xs py-2 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 leading-tight pr-2">
                        {m.name}
                      </h3>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>{m.type}</span>
                      <span>{m.size_kb} KB</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setInspectMaterial(m)}
                          className="w-8 h-8 rounded-lg bg-[#0a0a0f] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                          title="Inspect Extracted Text"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDocId(m.id);
                            setRenameValue(m.name);
                          }}
                          className="w-8 h-8 rounded-lg bg-[#0a0a0f] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                          title="Rename Document"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          className="w-8 h-8 rounded-lg bg-[#0a0a0f] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {!isActive && (
                        <button
                          onClick={() => setActiveDocId(m.id)}
                          className="bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs py-1.5 px-4 rounded-lg transition-colors shadow-sm"
                        >
                          Study This
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Extracted Content Verification Drawer/Modal */}
      {inspectMaterial && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141419] border border-slate-800/80 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-[#0a0a0f]/30">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2.5 tracking-tight">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  Text Extraction View
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  This is the raw knowledge the AI tutor sees.
                </p>
              </div>
              <button
                onClick={() => setInspectMaterial(null)}
                className="w-10 h-10 rounded-full bg-[#0a0a0f] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Characters</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {inspectMaterial.content ? inspectMaterial.content.length.toLocaleString() : 0}
                  </div>
                </div>
                <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Format</div>
                  <div className="text-lg font-bold text-indigo-400 truncate">
                    {inspectMaterial.type}
                  </div>
                </div>
                <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/80 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="text-lg font-bold text-emerald-400">
                    Verified
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-white mb-3 block">
                  Parsed Text Content
                </label>
                <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 max-h-[40vh] overflow-y-auto font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {inspectMaterial.content || 'No text extracted.'}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800/80 bg-[#0a0a0f]/30 flex items-center justify-between">
              <button
                onClick={() => setInspectMaterial(null)}
                className="bg-[#0a0a0f] hover:bg-[#111116] border border-slate-800 text-slate-300 font-medium text-sm py-2.5 px-6 rounded-xl transition-colors"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  setActiveDocId(inspectMaterial.id);
                  setInspectMaterial(null);
                  onNavigateTab('notes');
                }}
                className="bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Generate Notes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
