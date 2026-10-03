import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Loader2,
  Eye,
  Paintbrush,
  FileImage,
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
      <div className="h-full flex items-center justify-center p-8 bg-[#0a0a0f]">
        <div className="max-w-md w-full text-center space-y-6 bg-[#141419] border border-slate-800/50 p-10 rounded-3xl">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-500 border border-slate-700/50">
            <ImageIcon className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white tracking-tight">No Document Selected</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Select or upload a study document to enable the Multimodal Visual Learning Studio.
            </p>
          </div>
          <button 
            onClick={() => onNavigateTab('library')} 
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Go to My Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0f] py-8 px-4 sm:px-8 text-slate-300">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/50">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Visual Learning Studio
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Grounded visual comprehension with Gemini Vision & AI concept art with Imagen.
            </p>
          </div>

          <div className="flex items-center p-1 bg-[#141419] rounded-xl border border-slate-800/50">
            <button
              onClick={() => setActiveTab('explain')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'explain'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              Diagram Breakdown
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'generate'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              Concept Art
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Tab Content: Explain */}
        {activeTab === 'explain' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Upload */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#141419] rounded-2xl border border-slate-800/50 p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-base font-medium text-white flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-indigo-400" />
                    Upload Diagram
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Upload a figure from lecture slides or a textbook.
                  </p>
                </div>

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

                <div className="flex-1 flex flex-col justify-center mb-6">
                  {previewUrl ? (
                    <div className="group relative rounded-xl overflow-hidden bg-[#0a0a0f] border border-slate-800 flex items-center justify-center p-2 min-h-[240px]">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-64 max-w-full object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
                        >
                          Change Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700/50 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all min-h-[240px]"
                    >
                      <Upload className="w-8 h-8 text-slate-500 mb-3" />
                      <div className="text-sm font-medium text-slate-300">
                        Click to select image
                      </div>
                      <div className="text-xs text-slate-500 mt-1">PNG, JPG, WebP</div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">
                      Specific Question (Optional)
                    </label>
                    <input
                      type="text"
                      value={diagramQuestion}
                      onChange={(e) => setDiagramQuestion(e.target.value)}
                      placeholder="e.g. What do the blue arrows represent?"
                      className="w-full bg-[#0a0a0f] text-sm text-white border border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-slate-600"
                    />
                  </div>

                  <button
                    onClick={handleExplain}
                    disabled={!diagramFile || isExplaining}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isExplaining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing with Gemini Vision...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Explain Diagram
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Result */}
            <div className="lg:col-span-7">
              <div className="bg-[#141419] rounded-2xl border border-slate-800/50 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-800/50 bg-[#141419]/80 backdrop-blur">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI Breakdown
                  </h3>
                </div>
                
                {explanationResult ? (
                  <div className="p-6 flex-1 overflow-y-auto bg-[#0a0a0f]/50 prose prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-200">
                    <MarkdownView content={explanationResult} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 bg-[#0a0a0f]/20">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm text-center max-w-xs leading-relaxed">
                      Upload a diagram and click "Explain Diagram" to get a structured step-by-step breakdown.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Generate */}
        {activeTab === 'generate' && (
          <div className="bg-[#141419] rounded-2xl border border-slate-800/50 p-6 sm:p-10">
            <div className="max-w-2xl mx-auto space-y-8">
              
              <div className="space-y-4 text-center">
                <h3 className="text-lg font-medium text-white">Generate Concept Art</h3>
                <p className="text-sm text-slate-400">
                  Powered by Google Imagen 3. Describe a study concept to visualize it.
                </p>
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={artPrompt}
                  onChange={(e) => setArtPrompt(e.target.value)}
                  placeholder="e.g. A 3D educational isometric diagram illustrating photosynthesis"
                  className="w-full bg-[#0a0a0f] text-sm text-white border border-slate-800 rounded-2xl pl-5 pr-36 py-4 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-slate-600 shadow-sm"
                />
                <button
                  onClick={handleGenerateArt}
                  disabled={!artPrompt.trim() || isGeneratingArt}
                  className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isGeneratingArt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paintbrush className="w-4 h-4" />
                  )}
                  {isGeneratingArt ? 'Rendering' : 'Generate'}
                </button>
              </div>

              {artResult && (
                <div className="mt-8 rounded-2xl overflow-hidden border border-slate-800 bg-[#0a0a0f] p-4 shadow-2xl">
                  <img
                    src={`data:image/png;base64,${artResult}`}
                    alt="Generated concept art"
                    className="w-full h-auto rounded-xl object-contain shadow-sm mx-auto"
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
