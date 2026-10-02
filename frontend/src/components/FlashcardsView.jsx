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
  BookOpen,
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
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'grid'
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

  // Keyboard navigation
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
      // Update local state
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
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">No Document Selected</h3>
        <p className="text-xs text-slate-400">
          Please select or upload a study document to generate flashcards.
        </p>
        <button onClick={() => onNavigateTab('library')} className="btn btn-primary text-xs">
          Go to My Library
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Generator Control Box */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              Flashcard Studio & Spaced Repetition (SRS)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Source: <span className="text-slate-200 font-medium">{activeDoc.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span>Count:</span>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value={5}>5 Cards</option>
                <option value={8}>8 Cards</option>
                <option value={12}>12 Cards</option>
                <option value={16}>16 Cards</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span>Level:</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
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
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md shadow-violet-600/30"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Cards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Cards</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        {/* Toolbar & View Switcher */}
        {cards.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {cards.length} Cards in Deck
              </span>
              <button
                onClick={handleShuffle}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                title="Shuffle card order"
              >
                <Shuffle className="w-3 h-3 text-cyan-400" />
                <span>Shuffle</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded text-xs ${
                  viewMode === 'card' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Single Card Mode"
              >
                <CreditCard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs ${
                  viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Overview Mode"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {feedbackToast && (
        <div className="fixed bottom-6 right-8 z-50 bg-slate-900 border border-violet-500/60 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Main Study Deck Area */}
      {cards.length === 0 ? (
        !isGenerating && (
          <div className="glass-card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">Deck is Empty</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "Generate Cards" to extract high-yield questions, answers, and page citations from your document.
            </p>
          </div>
        )
      ) : viewMode === 'card' ? (
        /* Single Card 3D Flip Mode */
        <div className="space-y-6">
          <div className="perspective-container max-w-2xl mx-auto" style={{ minHeight: '340px' }}>
            <div
              className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ minHeight: '340px' }}
            >
              {/* Front of Card */}
              <div className="flip-face bg-[#151d30] border border-slate-700/80 p-8 shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="badge badge-purple text-[10px]">
                    {currentCard?.topic || 'Core Concept'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400">
                      Card {currentIndex + 1} of {cards.length}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {currentCard?.difficulty || 'Medium'}
                    </span>
                  </div>
                </div>

                <div className="my-auto py-6 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Question / Prompt
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white leading-snug">
                    {currentCard?.front}
                  </h3>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <span className="text-[11px] text-slate-500">
                    💡 Click card or press Space to reveal answer
                  </span>
                  <div className="flex items-center gap-1 text-violet-400">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </div>
                </div>
              </div>

              {/* Back of Card */}
              <div className="flip-face flip-face-back bg-[#18233a] border border-violet-500/40 p-8 shadow-2xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="badge badge-cyan text-[10px]">Answer & Explanation</span>
                  {currentCard?.citation && (
                    <span className="citation-pill text-[10px]">
                      📍 {currentCard.citation}
                    </span>
                  )}
                </div>

                <div className="my-auto py-4">
                  <div className="text-sm md:text-base font-semibold text-slate-100 leading-relaxed mb-3">
                    {currentCard?.back}
                  </div>
                  {currentCard?.context && (
                    <div className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <strong>Context:</strong> {currentCard.context}
                    </div>
                  )}
                </div>

                {/* SRS Spaced Repetition Feedback Buttons */}
                <div
                  className="border-t border-slate-800/80 pt-3 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-slate-400">Rate your recall:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview(currentCard.id, 'difficult')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold flex items-center gap-1 transition"
                      title="Difficult (Review in 6 hours)"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Difficult</span>
                    </button>
                    <button
                      onClick={() => handleReview(currentCard.id, 'review_again')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 text-xs font-semibold flex items-center gap-1 transition"
                      title="Review Again (Review tomorrow)"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Review Again</span>
                    </button>
                    <button
                      onClick={() => handleReview(currentCard.id, 'know_it')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 text-xs font-semibold flex items-center gap-1 transition"
                      title="Know It (Mastered, review in 3 days)"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Know It</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrev}
              className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="btn btn-primary text-xs py-2 px-5 flex items-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'Show Question' : 'Flip Card (Space)'}</span>
            </button>

            <button
              onClick={handleNext}
              className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Grid Overview Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <div
              key={c.id}
              className="glass-card p-5 space-y-3 flex flex-col justify-between hover:border-violet-500/40"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-purple text-[9px]">{c.topic || 'Topic'}</span>
                  <span className="text-[10px] font-mono text-slate-500">#{i + 1}</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-2">{c.front}</h4>
                <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  {c.back}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                {c.citation ? (
                  <span className="citation-pill text-[9px]">📍 {c.citation}</span>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="text-slate-500 hover:text-rose-400"
                  title="Delete card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
