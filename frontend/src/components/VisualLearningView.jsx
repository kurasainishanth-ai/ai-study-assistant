import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  Eye,
  Paintbrush,
  HelpCircle,
  CheckCircle,
  FileImage,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from './MarkdownView';

export default function VisualLearningView({
  activeDoc,
  onNavigateTab
}) {
  const [activeTab, setActiveTab] = useState('explain'); // 'explain' or 'generate'
  const [diagramFile, setDiagramFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [diagramQuestion, setDiagramQuestion] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState(null);

  const [artPrompt, setArtPrompt] = useState('');
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [artResult, setArtResult] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleSelectDiagram = (file) => {
    if (!file) return;
    setDiagramFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExplanationResult(null);
  };

  const handleExplain = async () => {
    if (!activeDoc || !diagramFile) return;
    setIsExplaining(true);
    setErrorMsg(null);
    try {
      const res = await api.explainVisual(activeDoc.id, diagramFile, diagramQuestion);
      setExplanationResult(res.explanation);
    } catch (err) {
      setErrorMsg(err.message || 'Visual breakdown failed');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleGenerateArt = async () => {
    if (!artPrompt.trim()) return;
    setIsGeneratingArt(true);
    setErrorMsg(null);
    try {
      const res = await api.generateVisualArt(artPrompt);
      if (res.image_base64) {
        setArtResult(res.image_base64);
      } else {
        setErrorMsg('No image data returned from Imagen.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Image generation failed');
    } finally {
      setIsGeneratingArt(false);
    }
  };

  if (!activeDoc) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">No Document Selected</h3>
        <p className="text-xs text-slate-400">
          Please select or upload a study document to use Visual Learning.
        </p>
        <button onClick={() => onNavigateTab('library')} className="btn btn-primary text-xs">
          Go to My Library
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header and Sub-tabs */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-violet-400" />
              Multimodal Visual Learning Studio
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Grounded visual comprehension with Gemini Vision & AI concept art with Imagen.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('explain')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'explain'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Diagram Breakdown (Vision)</span>
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'generate'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Concept Art (Imagen 3)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Tab 1: Diagram Breakdown */}
      {activeTab === 'explain' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Uploader Column */}
          <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <FileImage className="w-4 h-4 text-cyan-400" />
                Upload Course Diagram or Chart
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Upload a figure from lecture slides or textbook for deep visual analysis.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSelectDiagram(e.target.files[0]);
                  }
                }}
              />

              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-64 flex items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    alt="Diagram Preview"
                    className="max-h-60 max-w-full object-contain rounded-lg"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded border border-slate-700 hover:bg-violet-600 transition"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500 bg-slate-900/40 transition"
                >
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-300">
                    Click to select diagram image
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">PNG, JPG, WebP</div>
                </div>
              )}

              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Specific Question (Optional):
                </label>
                <input
                  type="text"
                  value={diagramQuestion}
                  onChange={(e) => setDiagramQuestion(e.target.value)}
                  placeholder="e.g. What do the blue arrows represent? Or explain step 3"
                  className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl p-2.5 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <button
              onClick={handleExplain}
              disabled={!diagramFile || isExplaining}
              className="btn btn-primary text-xs py-2.5 w-full mt-4 flex items-center justify-center gap-2"
            >
              {isExplaining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing with Gemini Vision...</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Explain Diagram</span>
                </>
              )}
            </button>
          </div>

          {/* Breakdown Results Column */}
          <div className="glass-card p-6 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              AI Visual Breakdown
            </h3>

            {explanationResult ? (
              <div className="flex-1 overflow-y-auto max-h-[500px] bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <MarkdownView content={explanationResult} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">
                  Upload a diagram and click "Explain Diagram" to see a structured step-by-step breakdown.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Concept Art (Imagen 3) */}
      {activeTab === 'generate' && (
        <div className="glass-card p-6 space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              Describe the study concept you want to visualize:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={artPrompt}
                onChange={(e) => setArtPrompt(e.target.value)}
                placeholder="e.g. A 3D educational isometric diagram illustrating photosynthesis in plant cells"
                className="flex-1 bg-slate-950 text-xs text-white border border-slate-800 rounded-xl p-3 outline-none focus:border-violet-500"
              />
              <button
                onClick={handleGenerateArt}
                disabled={!artPrompt.trim() || isGeneratingArt}
                className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shrink-0"
              >
                {isGeneratingArt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Art</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Powered by Google Imagen 3. Generates high-fidelity visual study aids.
            </p>
          </div>

          {artResult && (
            <div className="max-w-xl mx-auto rounded-2xl overflow-hidden border border-violet-500/40 shadow-2xl p-2 bg-slate-950">
              <img
                src={`data:image/png;base64,${artResult}`}
                alt="Generated concept art"
                className="w-full h-auto rounded-xl object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
