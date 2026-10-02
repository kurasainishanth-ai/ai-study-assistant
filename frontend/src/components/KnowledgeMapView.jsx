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
  RefreshCw
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
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Network className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">No Document Selected</h3>
        <p className="text-xs text-slate-400">
          Please select or upload a study document to build your Knowledge Map.
        </p>
        <button onClick={() => onNavigateTab('library')} className="btn btn-primary text-xs">
          Go to My Library
        </button>
      </div>
    );
  }

  const topics = mapData?.topics || [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-violet-400" />
            Knowledge Map & Dependency Graph
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hierarchical concept nodes grounded in <span className="text-slate-200 font-medium">{activeDoc.name}</span>
          </p>
        </div>

        <button
          onClick={() => loadKnowledgeMap(activeDoc.id)}
          disabled={isLoading}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Regenerate Map</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="glass-card p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-white">Synthesizing Topic Relationships...</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Gemini is analyzing prerequisites, core themes, and mastery states from your material.
          </p>
        </div>
      ) : topics.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Network className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">No Knowledge Graph Available</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Regenerate Map" to extract topic dependencies and conceptual branches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nodes Visualizer Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Concepts Identified: {topics.length}</span>
                <span className="text-[11px] text-slate-500">Click a node to inspect details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topics.map((node) => {
                  const isSelected = selectedNode?.name === node.name;
                  const isReviewNeeded = node.status === 'review_needed';

                  return (
                    <div
                      key={node.name}
                      onClick={() => setSelectedNode(node)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-violet-950/40 border-violet-500 shadow-md shadow-violet-500/20'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            {node.name}
                          </span>
                          <span
                            className={`badge text-[9px] ${
                              isReviewNeeded ? 'badge-amber' : 'badge-emerald'
                            }`}
                          >
                            {isReviewNeeded ? 'Review Needed' : 'Grounded'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {node.summary || 'Core concept extracted from course document.'}
                        </p>
                      </div>

                      {node.dependencies && node.dependencies.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1 text-[10px] text-slate-500 truncate">
                          <span>Builds upon: </span>
                          <span className="text-cyan-400 truncate">
                            {node.dependencies.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Node Inspector Panel */}
          <div className="glass-card p-6 flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="border-b border-slate-800/80 pb-3">
                  <span className="badge badge-purple text-[10px] mb-2">Topic Inspector</span>
                  <h3 className="text-base font-bold text-white">{selectedNode.name}</h3>
                  <div className="text-xs text-slate-400 mt-1">
                    Status:{' '}
                    <span className="font-semibold text-emerald-400">
                      {selectedNode.status === 'review_needed' ? 'Target for Review' : 'Concept Grounded'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Concept Summary:</div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {selectedNode.summary || 'Detailed summary extracted from material.'}
                  </p>
                </div>

                {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">Prerequisites / Connections:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.dependencies.map((dep, dIdx) => (
                        <span key={dIdx} className="badge badge-cyan text-[10px]">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNode.citation && (
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold">Source Location: </span>
                    <span className="citation-pill text-[10px]">📍 {selectedNode.citation}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">
                <p className="text-xs">Select any topic node to inspect its details and prerequisites.</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => onNavigateTab('quiz')}
                className="btn btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <span>Test Topic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
