import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Grid,
  CreditCard,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

export default function FlashcardsView({
  activeDoc,
  onNavigateTab
}) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [cardCount, setCardCount] = useState(8);
  const [difficulty, setDifficulty] = useState('mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  useEffect(() => {
    if (activeDoc) {
      loadCards(activeDoc.id);
    } else {
      setCards([]);
      setCurrentIndex(0);
    }
  }, [activeDoc]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'card' || cards.length === 0) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, viewMode, currentIndex]);

  const loadCards = async (docId) => {
    try {
      const data = await api.getFlashcards(docId);
      setCards(data || []);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    }
  };

  const handleGenerate = async () => {
    if (!activeDoc) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const generated = await api.generateFlashcards(activeDoc.id, cardCount, difficulty);
      await loadCards(activeDoc.id);
      showToast(`Generated ${generated.length || cardCount} grounded flashcards!`);
    } catch (err) {
      setErrorMsg(err.message || 'Flashcard generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (cardId, rating) => {
    try {
      await api.reviewFlashcard(cardId, rating);
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, review_status: rating } : c))
      );
      showToast(
        rating === 'know_it'
          ? '✓ Marked Mastered (+3 days)'
          : rating === 'review_again'
          ? '⏱ Scheduled for tomorrow'
          : '⚠️ Flagged Difficult (+6 hours)'
      );
      handleNext();
    } catch (err) {
      setErrorMsg(err.message || 'Review rating failed');
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await api.deleteFlashcard(cardId);
      await loadCards(activeDoc.id);
    } catch (err) {
      setErrorMsg(err.message || 'Delete card failed');
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  if (!activeDoc) {
    return (
      <div className="p-8 md:p-12 max-w-lg mx-auto text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-[#141419] border border-slate-800/50 flex items-center justify-center mx-auto text-slate-500 shadow-xl">
          <Layers className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-white tracking-tight">No Document Selected</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Please select or upload a study document to generate your intelligent flashcards.
        </p>
        <button onClick={() => onNavigateTab('library')} className="bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
          Go to My Library
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Control Box */}
      <div className="bg-[#141419] border border-slate-800/50 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-800/50 pb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2.5 tracking-tight">
              <Layers className="w-5 h-5 text-indigo-400" />
              Flashcard Studio
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Source: <span className="text-slate-300 font-medium">{activeDoc.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800/80 rounded-xl px-3 py-1.5">
              <span className="text-slate-400">Count:</span>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value={5}>5 Cards</option>
                <option value={8}>8 Cards</option>
                <option value={12}>12 Cards</option>
                <option value={16}>16 Cards</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800/80 rounded-xl px-3 py-1.5">
              <span className="text-slate-400">Level:</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Foundational</option>
                <option value="medium">Intermediate</option>
                <option value="hard">Advanced</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold text-sm py-2 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        {/* Toolbar */}
        {cards.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-300 bg-[#0a0a0f] px-3 py-1 rounded-lg border border-slate-800/50">
                {cards.length} Cards in Deck
              </span>
              <button
                onClick={handleShuffle}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800/50"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#0a0a0f] p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-lg text-sm transition-all ${
                  viewMode === 'card' ? 'bg-[#141419] text-white shadow-sm border border-slate-700/50' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <CreditCard className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-sm transition-all ${
                  viewMode === 'grid' ? 'bg-[#141419] text-white shadow-sm border border-slate-700/50' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {feedbackToast && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#141419] border border-indigo-500/30 text-white text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="font-medium">{feedbackToast}</span>
        </div>
      )}

      {/* Main Study Deck Area */}
      {cards.length === 0 ? (
        !isGenerating && (
          <div className="bg-[#141419] border border-slate-800/50 rounded-2xl p-16 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-[#0a0a0f] border border-slate-800/50 flex items-center justify-center mx-auto text-slate-600">
              <Layers className="w-8 h-8" />
            </div>
            <h4 className="text-base font-medium text-white tracking-tight">Deck is Empty</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              Click "Generate" to extract high-yield questions, answers, and page citations from your document.
            </p>
          </div>
        )
      ) : viewMode === 'card' ? (
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-400">
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-[#141419] rounded-full h-1.5 border border-slate-800/50 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="perspective-container relative" style={{ minHeight: '380px' }}>
            <div
              className={`flip-card w-full h-full cursor-pointer transition-transform duration-500 transform-style-3d ${isFlipped ? 'is-flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ minHeight: '380px' }}
            >
              {/* Front */}
              <div className="flip-face absolute w-full h-full backface-hidden bg-[#141419] border border-slate-800/50 rounded-3xl p-8 md:p-10 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wide border border-indigo-500/20">
                    {currentCard?.topic || 'Core Concept'}
                  </span>
                  <span className="text-xs font-medium text-slate-400 capitalize bg-[#0a0a0f] px-3 py-1 rounded-full border border-slate-800/50">
                    {currentCard?.difficulty || 'Medium'}
                  </span>
                </div>

                <div className="my-auto py-8 text-center">
                  <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed tracking-tight">
                    {currentCard?.front}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-slate-500 pt-6 border-t border-slate-800/50">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" /> Space to flip
                  </span>
                </div>
              </div>

              {/* Back */}
              <div className="flip-face flip-face-back absolute w-full h-full backface-hidden bg-[#141419] border border-indigo-500/30 rounded-3xl p-8 md:p-10 shadow-xl flex flex-col justify-between transform rotate-y-180">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold tracking-wide border border-emerald-500/20">
                    Answer & Explanation
                  </span>
                  {currentCard?.citation && (
                    <span className="text-[10px] text-slate-400 font-mono bg-[#0a0a0f] px-2 py-1 rounded-md border border-slate-800/50">
                      📍 {currentCard.citation}
                    </span>
                  )}
                </div>

                <div className="my-auto py-6 overflow-y-auto custom-scrollbar">
                  <div className="text-base md:text-lg text-slate-200 leading-relaxed font-medium mb-4">
                    {currentCard?.back}
                  </div>
                  {currentCard?.context && (
                    <div className="text-sm text-slate-400 bg-[#0a0a0f] p-4 rounded-xl border border-slate-800/50 leading-relaxed">
                      <strong className="text-slate-300 font-semibold">Context: </strong> {currentCard.context}
                    </div>
                  )}
                </div>

                {/* SaaS Style SRS Buttons */}
                <div className="pt-5 border-t border-slate-800/50" onClick={(e) => e.stopPropagation()}>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                    How well did you know this?
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleReview(currentCard.id, 'difficult')}
                      className="group flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0a0a0f] border border-slate-800/80 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all"
                    >
                      <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
                      <span className="text-xs font-medium text-slate-400 group-hover:text-rose-300">Hard</span>
                    </button>
                    <button
                      onClick={() => handleReview(currentCard.id, 'review_again')}
                      className="group flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0a0a0f] border border-slate-800/80 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all"
                    >
                      <Clock className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                      <span className="text-xs font-medium text-slate-400 group-hover:text-amber-300">Good</span>
                    </button>
                    <button
                      onClick={() => handleReview(currentCard.id, 'know_it')}
                      className="group flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0a0a0f] border border-slate-800/80 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
                    >
                      <Check className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-300">Easy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={handlePrev}
              className="w-12 h-12 rounded-full bg-[#141419] border border-slate-800/50 hover:bg-[#1a1a24] flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm py-3 px-8 rounded-full flex items-center gap-2 transition-all shadow-md"
            >
              <RotateCw className="w-4 h-4" />
              <span>{isFlipped ? 'Show Question' : 'Flip Card'}</span>
            </button>

            <button
              onClick={handleNext}
              className="w-12 h-12 rounded-full bg-[#141419] border border-slate-800/50 hover:bg-[#1a1a24] flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <div
              key={c.id}
              className="bg-[#141419] border border-slate-800/50 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold border border-indigo-500/20">
                    {c.topic || 'Topic'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-[#0a0a0f] px-2 py-0.5 rounded-md border border-slate-800/50">
                    #{i + 1}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-3 leading-relaxed">{c.front}</h4>
                <div className="text-xs text-slate-300 bg-[#0a0a0f] p-3 rounded-xl border border-slate-800/50 leading-relaxed">
                  {c.back}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/50">
                {c.citation ? (
                  <span className="text-[10px] text-slate-400 font-mono bg-[#0a0a0f] px-2 py-1 rounded-md border border-slate-800/50">
                    📍 {c.citation}
                  </span>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
