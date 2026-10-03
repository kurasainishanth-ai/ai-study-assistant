import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon, Sparkles, Upload, Loader2, Eye, Paintbrush, FileImage
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from '../components/MarkdownView';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export default function VisualLearningView({
  activeDoc,
  onNavigateTab
}) {
  const [activeTab, setActiveTab] = useState('explain');
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (!activeDoc) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <motion.div 
          initial="hidden" animate="visible" variants={containerVariants}
          className="max-w-md w-full"
        >
          <Card className="text-center p-8 border-slate-800/50 bg-slate-900/50">
            <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-500 mb-6">
              <ImageIcon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight mb-2">No Document Selected</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Select or upload a study document to enable the Multimodal Visual Learning Studio.
            </p>
            <Button 
              onClick={() => onNavigateTab('library')} 
              className="w-full"
            >
              Go to My Library
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-full text-slate-300">
      <motion.div 
        initial="hidden" animate="visible" variants={containerVariants}
        className="space-y-8"
      >
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/50">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-indigo-400" />
              Visual Learning Studio
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Grounded visual comprehension with Gemini Vision & AI concept art with Imagen.
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800/50">
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
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileImage className="w-5 h-5 text-indigo-400" />
                    Upload Diagram
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <p className="text-sm text-slate-400 mb-6">
                    Upload a figure from lecture slides or a textbook.
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

                  <div className="flex-1 flex flex-col justify-center mb-6 min-h-[240px]">
                    {previewUrl ? (
                      <div className="group relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 h-full">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-64 max-w-full object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="secondary"
                            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-white/10"
                          >
                            Change Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700/50 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all h-full"
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
                      <Input
                        value={diagramQuestion}
                        onChange={(e) => setDiagramQuestion(e.target.value)}
                        placeholder="e.g. What do the blue arrows represent?"
                      />
                    </div>

                    <Button
                      onClick={handleExplain}
                      disabled={!diagramFile || isExplaining}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      {isExplaining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Explain Diagram
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Result */}
            <div className="lg:col-span-7">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardHeader className="bg-slate-900/50 border-b border-slate-800/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    AI Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col h-[500px] overflow-hidden">
                  {explanationResult ? (
                    <div className="p-6 overflow-y-auto prose prose-invert prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-200 h-full">
                      <MarkdownView content={explanationResult} />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-950/20">
                      <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm text-center max-w-xs leading-relaxed font-medium">
                        Upload a diagram and click "Explain Diagram" to get a structured step-by-step breakdown.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab Content: Generate */}
        {activeTab === 'generate' && (
          <Card className="p-6 sm:p-10 border-slate-800/50 bg-slate-900/30">
            <CardContent className="max-w-2xl mx-auto space-y-8 p-0">
              
              <div className="space-y-4 text-center">
                <h3 className="text-xl font-bold text-white">Generate Concept Art</h3>
                <p className="text-sm text-slate-400">
                  Powered by Google Imagen 3. Describe a study concept to visualize it.
                </p>
              </div>

              <div className="relative flex items-center">
                <Input
                  value={artPrompt}
                  onChange={(e) => setArtPrompt(e.target.value)}
                  placeholder="e.g. A 3D educational isometric diagram illustrating photosynthesis"
                  className="pr-36 py-6 text-base rounded-2xl"
                />
                <Button
                  onClick={handleGenerateArt}
                  disabled={!artPrompt.trim() || isGeneratingArt}
                  className="absolute right-2 top-2 bottom-2 rounded-xl flex items-center gap-2"
                >
                  {isGeneratingArt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paintbrush className="w-4 h-4" />
                  )}
                  {isGeneratingArt ? 'Rendering' : 'Generate'}
                </Button>
              </div>

              {artResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 shadow-2xl"
                >
                  <img
                    src={`data:image/png;base64,${artResult}`}
                    alt="Generated concept art"
                    className="w-full h-auto rounded-xl object-contain shadow-sm mx-auto"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

      </motion.div>
    </div>
  );
}
