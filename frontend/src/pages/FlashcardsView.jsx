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
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 md:p-12 max-w-2xl mx-auto text-center space-y-8 min-h-[60vh] flex flex-col items-center justify-center"
      >
        <div className="w-24 h-24 rounded-[2rem] bg-[#141419] border border-slate-800/80 flex items-center justify-center mx-auto text-slate-500 shadow-2xl">
          <Layers className="w-12 h-12 text-slate-400" />
        </div>
        <div>
          <h3 className="text-3xl font-bold text-white tracking-tight mb-4">No Document Selected</h3>
          <p className="text-base text-slate-400 leading-relaxed max-w-md mx-auto">
            Please select or upload a study document in your library to generate an intelligent flashcard deck.
          </p>
        </div>
        <Button onClick={() => onNavigateTab('library')} variant="primary" size="lg">
          Go to My Library
        </Button>
      </motion.div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 max-w-5xl mx-auto space-y-8"
    >
      {/* Control Box */}
      <Card className="bg-[#141419]/90 backdrop-blur-md border-slate-800/80 rounded-[2rem] shadow-2xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/50 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight mb-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Layers className="w-6 h-6 text-indigo-400" />
                </div>
                Flashcard Studio
              </h2>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                Source: <Badge variant="secondary">{activeDoc.name}</Badge>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800 rounded-2xl px-4 py-2 shadow-inner">
                <span className="text-slate-400 font-medium">Count:</span>
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer font-bold focus:ring-0"
                >
                  <option value={5}>5 Cards</option>
                  <option value={8}>8 Cards</option>
                  <option value={12}>12 Cards</option>
                  <option value={16}>16 Cards</option>
                </select>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800 rounded-2xl px-4 py-2 shadow-inner">
                <span className="text-slate-400 font-medium">Level:</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="bg-transparent text-white outline-none cursor-pointer font-bold focus:ring-0"
                >
                  <option value="mixed">Mixed</option>
                  <option value="easy">Foundational</option>
                  <option value="medium">Intermediate</option>
                  <option value="hard">Advanced</option>
                </select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="primary"
                className="py-2.5 shadow-lg shadow-indigo-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Deck
                  </>
                )}
              </Button>
            </div>
          </div>

          {errorMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {errorMsg}
            </motion.div>
          )}

          {/* Toolbar */}
          {cards.length > 0 && (
            <div className="flex flex-wrap items-center justify-between pt-2 gap-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-[#0a0a0f] text-slate-300 px-4 py-1.5 text-sm">
                  {cards.length} Cards in Deck
                </Badge>
                <Button
                  onClick={handleShuffle}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Shuffle
                </Button>
              </div>

              <div className="flex items-center gap-1 bg-[#0a0a0f] p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2.5 rounded-xl text-sm transition-all duration-200 ${
                    viewMode === 'card' ? 'bg-[#141419] text-white shadow-md border border-slate-700' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-xl text-sm transition-all duration-200 ${
                    viewMode === 'grid' ? 'bg-[#141419] text-white shadow-md border border-slate-700' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {feedbackToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-50 bg-[#141419] border border-indigo-500/30 text-white text-sm px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(99,102,241,0.2)] flex items-center gap-3 font-semibold"
          >
            <Sparkles className="w-5 h-5 text-indigo-400" />
            {feedbackToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Study Deck Area */}
      {cards.length === 0 ? (
        !isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#141419]/50 border border-slate-800/50 rounded-[2rem] p-20 text-center space-y-6 shadow-sm backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full bg-[#0a0a0f] border border-slate-800/80 flex items-center justify-center mx-auto text-slate-600 shadow-inner">
              <Layers className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-bold text-white tracking-tight">Deck is Empty</h4>
            <p className="text-base text-slate-400 max-w-md mx-auto leading-relaxed">
              Click "Generate Deck" to extract high-yield questions, answers, and page citations from your document.
            </p>
          </motion.div>
        )
      ) : viewMode === 'card' ? (
        <div className="space-y-10 max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-wider">
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span className="text-indigo-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-[#141419] rounded-full h-2.5 border border-slate-800/80 overflow-hidden shadow-inner">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="relative perspective-1000" style={{ minHeight: '420px' }}>
            <motion.div
              layout
              className={`w-full h-full cursor-pointer transition-transform duration-700 transform-style-3d absolute inset-0 ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div className="absolute w-full h-full backface-hidden bg-[#141419] border border-slate-700/80 rounded-[2.5rem] p-10 md:p-14 shadow-2xl flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                    {currentCard?.topic || 'Core Concept'}
                  </Badge>
                  <Badge variant="outline" className="text-slate-400 bg-[#0a0a0f] border-slate-800 px-4 py-1.5 capitalize font-semibold">
                    {currentCard?.difficulty || 'Medium'}
                  </Badge>
                </div>

                <div className="my-auto py-10 text-center">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
                    {currentCard?.front}
                  </h3>
                </div>

                <div className="flex items-center justify-center text-slate-500 pt-8 border-t border-slate-800/80">
                  <span className="text-sm font-semibold flex items-center gap-2 bg-[#0a0a0f] px-5 py-2 rounded-full border border-slate-800">
                    <RotateCw className="w-4 h-4 text-indigo-400" /> Space to flip
                  </span>
                </div>
              </div>

              {/* Back */}
              <div className="absolute w-full h-full backface-hidden bg-[#141419] border border-indigo-500/50 rounded-[2.5rem] p-10 md:p-12 shadow-[0_20px_50px_rgba(99,102,241,0.15)] flex flex-col justify-between rotate-y-180">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                    Answer & Explanation
                  </Badge>
                  {currentCard?.citation && (
                    <Badge variant="outline" className="text-slate-400 font-mono bg-[#0a0a0f] border-slate-800">
                      📍 {currentCard.citation}
                    </Badge>
                  )}
                </div>

                <div className="my-auto py-8 overflow-y-auto custom-scrollbar pr-4">
                  <div className="text-xl md:text-2xl text-white leading-relaxed font-semibold mb-6">
                    {currentCard?.back}
                  </div>
                  {currentCard?.context && (
                    <div className="text-base text-slate-300 bg-[#0a0a0f] p-6 rounded-2xl border border-slate-800/80 leading-relaxed shadow-inner">
                      <strong className="text-indigo-300 font-bold">Context: </strong> {currentCard.context}
                    </div>
                  )}
                </div>

                {/* SaaS Style SRS Buttons */}
                <div className="pt-6 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">
                    How well did you know this?
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => handleReview(currentCard.id, 'difficult')}
                      className="group flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#0a0a0f] border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all shadow-sm"
                    >
                      <AlertCircle className="w-6 h-6 text-slate-400 group-hover:text-rose-400 transition-colors" />
                      <span className="text-sm font-bold text-slate-400 group-hover:text-rose-300">Hard</span>
                    </button>
                    <button
                      onClick={() => handleReview(currentCard.id, 'review_again')}
                      className="group flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#0a0a0f] border border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all shadow-sm"
                    >
                      <Clock className="w-6 h-6 text-slate-400 group-hover:text-amber-400 transition-colors" />
                      <span className="text-sm font-bold text-slate-400 group-hover:text-amber-300">Good</span>
                    </button>
                    <button
                      onClick={() => handleReview(currentCard.id, 'know_it')}
                      className="group flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#0a0a0f] border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all shadow-sm"
                    >
                      <Check className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-300">Easy</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4">
            <button
              onClick={handlePrev}
              className="w-14 h-14 rounded-full bg-[#141419] border border-slate-700 hover:border-slate-500 hover:bg-[#1a1a24] flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <Button
              onClick={() => setIsFlipped(!isFlipped)}
              variant="secondary"
              className="py-4 px-10 rounded-full font-bold text-base shadow-xl"
            >
              <RotateCw className="w-5 h-5 mr-3" />
              {isFlipped ? 'Show Question' : 'Flip Card'}
            </Button>

            <button
              onClick={handleNext}
              className="w-14 h-14 rounded-full bg-[#141419] border border-slate-700 hover:border-slate-500 hover:bg-[#1a1a24] flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={c.id}
              className="bg-[#141419] border border-slate-800/80 rounded-3xl p-8 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-[0_10px_30px_rgba(99,102,241,0.1)] transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs font-bold uppercase">
                    {c.topic || 'Topic'}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-slate-500 bg-[#0a0a0f] border-slate-800">
                    #{i + 1}
                  </Badge>
                </div>
                <h4 className="text-lg font-bold text-white mb-4 leading-relaxed">{c.front}</h4>
                <div className="text-sm text-slate-300 bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/80 leading-relaxed shadow-inner">
                  {c.back}
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-800/80">
                {c.citation ? (
                  <Badge variant="outline" className="text-slate-400 font-mono bg-[#0a0a0f] border-slate-800 text-xs">
                    📍 {c.citation}
                  </Badge>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
                  title="Delete card"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
