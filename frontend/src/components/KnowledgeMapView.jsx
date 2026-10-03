import React, { useState, useEffect } from 'react';
import {
  Network,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export default function KnowledgeMapView({
  activeDoc,
  onNavigateTab
}) {
  const [mapData, setMapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (activeDoc) {
      loadKnowledgeMap(activeDoc.id);
    } else {
      setMapData(null);
      setSelectedNode(null);
    }
  }, [activeDoc]);

  const loadKnowledgeMap = async (docId) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getKnowledgeMap(docId);
      setMapData(data);
      if (data && data.topics && data.topics.length > 0) {
        setSelectedNode(data.topics[0]);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to extract knowledge map');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeDoc) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-[#0a0a0f]">
        <div className="max-w-md w-full text-center space-y-6 bg-[#141419] border border-slate-800/50 p-10 rounded-3xl">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto text-slate-500 border border-slate-700/50">
            <Network className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white tracking-tight">No Document Selected</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Select or upload a study document to build and visualize your Knowledge Map.
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

  const topics = mapData?.topics || [];

  return (
    <div className="min-h-full bg-[#0a0a0f] py-8 px-4 sm:px-8 text-slate-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/50">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Network className="w-6 h-6 text-indigo-400" />
              Knowledge Map
            </h2>
            <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
              Hierarchical concepts grounded in 
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141419] border border-slate-800 text-slate-200 text-xs font-medium">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                {activeDoc.name}
              </span>
            </p>
          </div>

          <button
            onClick={() => loadKnowledgeMap(activeDoc.id)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#141419] hover:bg-[#1a1a24] border border-slate-800/50 rounded-lg text-sm font-medium text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate Map
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="bg-[#141419] border border-slate-800/50 rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <h4 className="text-base font-medium text-white">Synthesizing Relationships...</h4>
            <p className="text-sm text-slate-400 max-w-sm">
              Analyzing prerequisites, core themes, and mastery states from your material.
            </p>
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-[#141419] border border-slate-800/50 rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-4">
            <Network className="w-12 h-12 text-slate-600" />
            <h4 className="text-base font-medium text-white">No Knowledge Graph Available</h4>
            <p className="text-sm text-slate-400 max-w-sm">
              Click "Regenerate Map" to extract topic dependencies and conceptual branches.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Topic Grid */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-[#141419] border border-slate-800/50 rounded-2xl flex-1 flex flex-col overflow-hidden h-[600px]">
                <div className="p-4 border-b border-slate-800/50 bg-[#1a1a24]/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Concepts Identified: {topics.length}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Click a node to inspect
                  </span>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topics.map((node) => {
                      const isSelected = selectedNode?.name === node.name;
                      const isReviewNeeded = node.status === 'review_needed';

                      return (
                        <div
                          key={node.name}
                          onClick={() => setSelectedNode(node)}
                          className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col ${
                            isSelected
                              ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                              : 'bg-[#0a0a0f] border-slate-800/80 hover:border-slate-700 hover:bg-[#1a1a24]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-sm font-medium text-slate-200 leading-snug">
                              {node.name}
                            </h4>
                            <span
                              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                isReviewNeeded 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isReviewNeeded ? 'Review Needed' : 'Grounded'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed flex-1">
                            {node.summary || 'Core concept extracted from course document.'}
                          </p>

                          {node.dependencies && node.dependencies.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-start gap-2">
                              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">Builds on</span>
                              <div className="flex flex-wrap gap-1.5">
                                {node.dependencies.slice(0, 2).map((dep, idx) => (
                                  <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                    {dep}
                                  </span>
                                ))}
                                {node.dependencies.length > 2 && (
                                  <span className="text-[10px] text-slate-500">+{node.dependencies.length - 2} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Inspector */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="bg-[#141419] border border-slate-800/50 rounded-2xl flex-1 flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-800/50 bg-[#1a1a24]/50">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Inspector Panel
                  </h3>
                </div>

                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                  {selectedNode ? (
                    <div className="space-y-6 flex-1">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-medium mb-3">
                          <Network className="w-3.5 h-3.5" /> Topic
                        </div>
                        <h3 className="text-xl font-semibold text-white leading-tight mb-2">
                          {selectedNode.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Status:</span>
                          <span className={`font-medium ${selectedNode.status === 'review_needed' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {selectedNode.status === 'review_needed' ? 'Target for Review' : 'Concept Grounded'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Summary</h4>
                        <div className="bg-[#0a0a0f] border border-slate-800/50 p-4 rounded-xl">
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {selectedNode.summary || 'Detailed summary extracted from material.'}
                          </p>
                        </div>
                      </div>

                      {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Prerequisites</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedNode.dependencies.map((dep, dIdx) => (
                              <span key={dIdx} className="px-2.5 py-1 bg-[#0a0a0f] border border-slate-700/50 text-slate-300 text-xs rounded-lg">
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedNode.citation && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Source</h4>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 text-slate-300 text-xs rounded-lg font-mono">
                            📍 {selectedNode.citation}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                      <Network className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm">Select a topic node from the map to view its properties and relationships.</p>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-800/50">
                    <button
                      onClick={() => onNavigateTab('quiz')}
                      className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      disabled={!selectedNode}
                    >
                      Test Topic Knowledge
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
