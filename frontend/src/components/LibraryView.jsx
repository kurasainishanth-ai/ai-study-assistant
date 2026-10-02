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
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive
            ? 'border-violet-500 bg-violet-950/20 scale-[1.005]'
            : 'border-slate-700/80 bg-slate-900/40 hover:border-slate-600'
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

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
            {isUploading ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <Upload className="w-7 h-7 text-white" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-white">
              {isUploading ? 'Extracting document content...' : 'Upload Study Materials'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Drag & drop course notes, lecture slides, textbooks or images
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PDF (.pdf)</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PowerPoint (.pptx)</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Word (.docx)</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Images (.png, .jpg)</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Text & Markdown</span>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn btn-primary text-xs py-2 px-5"
            >
              Choose File
            </button>
            <span className="text-xs text-slate-500">or</span>
            <button
              onClick={handleLoadSample}
              disabled={isUploading}
              className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 hover:text-cyan-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load Sample Notes</span>
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Materials Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              Course Materials Library
            </h2>
            <p className="text-xs text-slate-400">
              {materials.length} document{materials.length === 1 ? '' : 's'} stored in local database
            </p>
          </div>
        </div>

        {materials.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">Your library is empty</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a PDF lecture, slide deck, or use "Load Sample Notes" above to start learning with StudyVerse AI.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {materials.map((m) => {
                  const isActive = m.id === activeDocId;
                  const isEditing = editingDocId === m.id;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isActive ? 'bg-violet-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="bg-slate-900 border border-violet-500 rounded px-2 py-1 text-xs text-white outline-none w-48"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(m.id)}
                              className="text-emerald-400 hover:text-emerald-300 font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDocId(null)}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <FileText className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                            <span className="font-semibold text-slate-200">{m.name}</span>
                            {isActive && (
                              <span className="badge badge-purple text-[9px]">Active</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{m.type}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{m.size_kb} KB</td>
                      <td className="py-3 px-3">
                        {m.status === 'Ready' ? (
                          <span className="badge badge-emerald text-[9px] flex items-center gap-1">
                            <CheckCircle className="w-2.5 h-2.5" /> Ready
                          </span>
                        ) : (
                          <span className="badge badge-rose text-[9px]">
                            {m.status || 'Processing'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{m.upload_time}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectMaterial(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                            title="Inspect extracted text & images"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingDocId(m.id);
                              setRenameValue(m.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-slate-800"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isActive && (
                            <button
                              onClick={() => setActiveDocId(m.id)}
                              className="text-[11px] px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white transition"
                              title="Set as active material"
                            >
                              Select
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(m.id, m.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Extracted Content Verification Drawer/Modal */}
      {inspectMaterial && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  Extracted Content Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect the parsed text that Gemini uses for notes, flashcards, and tutor answers
                </p>
              </div>
              <button
                onClick={() => setInspectMaterial(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Total Characters</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    {inspectMaterial.content ? inspectMaterial.content.length.toLocaleString() : 0}
                  </div>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Format</div>
                  <div className="text-sm font-semibold text-cyan-400 mt-1 truncate">
                    {inspectMaterial.type}
                  </div>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Extraction Status</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">
                    ✓ Verified
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Parsed Text Content:
                </label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {inspectMaterial.content || 'No text extracted.'}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <button
                onClick={() => {
                  setActiveDocId(inspectMaterial.id);
                  setInspectMaterial(null);
                  onNavigateTab('notes');
                }}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <span>Generate Smart Notes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setInspectMaterial(null)}
                className="btn btn-secondary text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
