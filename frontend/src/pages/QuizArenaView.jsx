import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Award,
  Lightbulb,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuizArenaView({ activeDoc, onNavigateTab }) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [pastAttempts, setPastAttempts] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const generatingRef = useRef(false);

  useEffect(() => {
    if (activeDoc) {
      loadPastAttempts(activeDoc.id);
      setQuestions([]);
      setQuizResult(null);
      setUserAnswers({});
      setErrorMsg(null);
    }
  }, [activeDoc?.id]);

  const loadPastAttempts = async (docId) => {
    try {
      const data = await api.getQuizAttempts(docId);
      setPastAttempts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load quiz attempts:', err);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeDoc || generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setErrorMsg(null);
    setQuizResult(null);
    setUserAnswers({});
    setQuestions([]);
    try {
      const generated = await api.generateQuiz(activeDoc.id, numQuestions, difficulty);
      if (Array.isArray(generated) && generated.length > 0) {
        setQuestions(generated);
        setCurrentQIndex(0);
      } else {
        setErrorMsg(
          'No quiz questions could be generated. The document may be too short or unstructured.'
        );
      }
    } catch (err) {
      const msg = err.message || 'Quiz generation failed';
      if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
        setErrorMsg('API quota or rate limit reached. Please wait and try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  };

  const handleSelectAnswer = (question, answer) => {
    const qKey = String(question.id ?? question._idx ?? 0);
    setUserAnswers((prev) => ({ ...prev, [qKey]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeDoc || questions.length === 0 || isEvaluating) return;
    setIsEvaluating(true);
    setErrorMsg(null);
    try {
      const result = await api.submitQuiz(activeDoc.id, questions, userAnswers);
      const safeResult = {
        score: result.score ?? 0,
        total_questions: result.total_questions ?? result.total ?? questions.length,
        percentage: result.percentage ?? 0,
        evaluations: Array.isArray(result.evaluations)
          ? result.evaluations
          : Array.isArray(result.results)
          ? result.results.map((r) => ({
              ...r,
              student_answer: r.student_answer ?? r.user_answer ?? '',
              explanation: r.explanation ?? r.rationale ?? '',
            }))
          : [],
        misconception_analysis: result.misconception_analysis ?? '',
      };
      setQuizResult(safeResult);
      await loadPastAttempts(activeDoc.id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to grade quiz. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!activeDoc) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 md:p-12 max-w-2xl mx-auto text-center space-y-8 min-h-[60vh] flex flex-col items-center justify-center"
      >
        <div className="w-24 h-24 rounded-[2rem] bg-[#141419] border border-slate-800/80 flex items-center justify-center mx-auto text-slate-500 shadow-2xl">
          <BrainCircuit className="w-12 h-12 text-slate-400" />
        </div>
        <div>
          <h3 className="text-3xl font-bold text-white tracking-tight mb-4">No Document Selected</h3>
          <p className="text-base text-slate-400 leading-relaxed max-w-md mx-auto">
            Please select or upload a study document to launch the Quiz Arena and test your knowledge.
          </p>
        </div>
        <Button onClick={() => onNavigateTab('library')} variant="primary" size="lg">
          Go to My Library
        </Button>
      </motion.div>
    );
  }

  const currentQ = questions[currentQIndex];
  const currentQKey = currentQ ? String(currentQ.id ?? currentQIndex) : null;
  const currentAnswer = currentQKey ? userAnswers[currentQKey] : undefined;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = questions.length > 0 ? ((currentQIndex + 1) / questions.length) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 max-w-5xl mx-auto space-y-10"
    >
      {/* Config Banner */}
      <Card className="bg-[#141419]/90 backdrop-blur-md border-slate-800/80 rounded-[2rem] shadow-2xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/50 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight mb-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <BrainCircuit className="w-6 h-6 text-indigo-400" />
                </div>
                Quiz Arena
              </h2>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                Source: <Badge variant="secondary">{activeDoc.name}</Badge>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800 rounded-2xl px-4 py-2 shadow-inner">
                <span className="text-slate-400 font-medium">Questions:</span>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  disabled={isGenerating || isEvaluating}
                  className="bg-transparent text-white outline-none cursor-pointer font-bold focus:ring-0 disabled:opacity-50"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={8}>8 Questions</option>
                </select>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800 rounded-2xl px-4 py-2 shadow-inner">
                <span className="text-slate-400 font-medium">Level:</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isGenerating || isEvaluating}
                  className="bg-transparent text-white outline-none cursor-pointer font-bold focus:ring-0 disabled:opacity-50"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <Button
                onClick={handleGenerateQuiz}
                disabled={isGenerating || isEvaluating}
                variant="primary"
                className="py-2.5 shadow-lg shadow-indigo-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {questions.length > 0 ? 'Regenerate' : 'Start Quiz'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {errorMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {errorMsg}
            </motion.div>
          )}

          {isGenerating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800 p-5 rounded-2xl shadow-inner font-medium">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span>AI is carefully crafting intelligent questions from your notes...</span>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Active Quiz Runner */}
      {questions.length > 0 && !quizResult && currentQ && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141419] border border-slate-700/80 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-10"
        >
          {/* Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <Badge variant="outline" className="bg-[#0a0a0f] border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px] px-3 py-1">
                {currentQ.type === 'mcq' ? 'Multiple Choice' : currentQ.type || 'Question'}
              </Badge>
            </div>
            <div className="w-full bg-[#0a0a0f] rounded-full h-2.5 border border-slate-800/80 overflow-hidden shadow-inner">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="py-4">
            <h3 className="text-2xl md:text-3xl font-bold text-white leading-relaxed tracking-tight">
              {currentQ.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {Array.isArray(currentQ.options) && currentQ.options.length > 0 ? (
              currentQ.options.map((opt, optIdx) => {
                const isSelected = currentAnswer === opt;
                return (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    key={optIdx}
                    onClick={() => handleSelectAnswer(currentQ, opt)}
                    className={`w-full text-left p-5 md:p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                        : 'bg-[#0a0a0f] border-slate-800 hover:border-slate-600 hover:bg-[#111116] text-slate-300'
                    }`}
                  >
                    <span className="text-base md:text-lg font-semibold leading-relaxed pr-6">{opt}</span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isSelected ? 'border-indigo-400 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'border-slate-600 group-hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </motion.button>
                );
              })
            ) : (
              <textarea
                value={currentAnswer || ''}
                onChange={(e) => handleSelectAnswer(currentQ, e.target.value)}
                placeholder="Type your detailed answer here..."
                rows={5}
                className="w-full bg-[#0a0a0f] border-2 border-slate-800 rounded-2xl p-6 text-base md:text-lg text-white outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-600 shadow-inner"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-800/80">
            <Button
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              variant="outline"
              className="bg-[#0a0a0f] border-slate-800"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </Button>

            <span className="text-sm font-bold text-slate-500 bg-[#0a0a0f] px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
              {answeredCount} / {questions.length} answered
            </span>

            {currentQIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                variant="secondary"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitQuiz}
                disabled={isEvaluating || answeredCount < questions.length}
                className="bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-none"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Grading...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Quiz Results */}
      {quizResult && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <div className="bg-[#141419] border border-slate-700/80 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight mb-1">Evaluation Complete</h3>
                <p className="text-base text-slate-400">
                  Detailed analysis and feedback below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-10 bg-[#0a0a0f] border border-slate-800/80 p-6 rounded-3xl shadow-inner">
              <div className="text-center">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Accuracy</div>
                <div
                  className={`text-4xl font-black font-mono tracking-tighter ${
                    quizResult.percentage >= 80 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : quizResult.percentage >= 60 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  }`}
                >
                  {quizResult.percentage}%
                </div>
              </div>
              <div className="w-px h-16 bg-slate-800/80"></div>
              <div className="text-center">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Score</div>
                <div className="text-4xl font-black text-white font-mono tracking-tighter">
                  {quizResult.score} <span className="text-2xl text-slate-600">/ {quizResult.total_questions}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setQuizResult(null);
                setQuestions([]);
                setUserAnswers({});
                setErrorMsg(null);
              }}
              variant="secondary"
              size="lg"
              className="w-full md:w-auto"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              New Quiz
            </Button>
          </div>

          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white tracking-tight px-2 flex items-center gap-3">
              <BrainCircuit className="w-6 h-6 text-indigo-400" /> Question Analysis
            </h4>
            {(quizResult.evaluations || []).map((evalItem, idx) => {
              const isCorrect = evalItem.is_correct;
              return (
                <div
                  key={idx}
                  className={`bg-[#141419] p-8 rounded-[2rem] border-2 transition-all ${
                    isCorrect ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.05)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-6 mb-8">
                    <div className="flex items-start gap-4">
                      {isCorrect ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                          <XCircle className="w-5 h-5 text-rose-400" />
                        </div>
                      )}
                      <span className="text-xl font-bold text-white leading-relaxed tracking-tight">
                        <span className="text-slate-500 mr-3">Q{idx + 1}.</span>
                        {evalItem.question}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base mb-8">
                    <div className="bg-[#0a0a0f] p-6 rounded-2xl border border-slate-800/80 shadow-inner">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Your Answer</div>
                      <div className={isCorrect ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                        {evalItem.student_answer || 'No answer submitted'}
                      </div>
                    </div>
                    <div className="bg-[#0a0a0f] p-6 rounded-2xl border border-slate-800/80 shadow-inner">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Correct Answer</div>
                      <div className="text-emerald-400 font-semibold">{evalItem.correct_answer}</div>
                    </div>
                  </div>

                  {evalItem.explanation && (
                    <div className="text-base text-slate-300 leading-relaxed bg-[#0a0a0f] p-6 rounded-2xl border border-slate-800/50 mb-6 shadow-inner">
                      <strong className="text-white font-bold mr-2">Explanation:</strong>
                      {evalItem.explanation}
                    </div>
                  )}

                  {!isCorrect && evalItem.misconception_analysis && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3 text-base font-bold text-amber-400">
                        <AlertTriangle className="w-5 h-5" />
                        Misconception Detected
                      </div>
                      <p className="text-base text-amber-200/80 leading-relaxed">
                        {evalItem.misconception_analysis}
                      </p>
                      {evalItem.targeted_follow_up && (
                        <div className="pt-4 mt-2 border-t border-amber-500/10 flex items-start gap-3 text-base text-indigo-300">
                          <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            <strong className="text-indigo-200 font-bold mr-2">Study Tip:</strong>
                            {evalItem.targeted_follow_up}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {quizResult.misconception_analysis &&
            quizResult.misconception_analysis !== 'Outstanding work! No misconceptions identified on this attempt.' && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-[2rem] space-y-4 mt-10 shadow-[0_0_30px_rgba(99,102,241,0.05)]">
              <div className="flex items-center gap-3 text-xl font-bold text-indigo-300">
                <BookOpen className="w-6 h-6" />
                Overall Knowledge Gaps
              </div>
              <p className="text-base text-indigo-100/70 leading-relaxed whitespace-pre-line">
                {quizResult.misconception_analysis}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Past Attempts */}
      {pastAttempts.length > 0 && !quizResult && questions.length === 0 && (
        <div className="space-y-6 pt-10 border-t border-slate-800/80">
          <h4 className="text-lg font-bold text-slate-300 tracking-tight flex items-center gap-3">
            <Award className="w-5 h-5 text-slate-400" /> Previous Attempts
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastAttempts.map((att) => (
              <Card key={att.id} className="bg-[#141419] border-slate-800 hover:border-slate-600 transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-3xl font-black font-mono text-white tracking-tighter">
                      {att.percentage}%
                    </div>
                    <Badge
                      className={`${
                        att.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : att.percentage >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      } font-bold uppercase tracking-wider text-[10px] px-3 py-1`}
                    >
                      {att.percentage >= 80 ? 'Mastered' : att.percentage >= 60 ? 'Review' : 'Needs Work'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-300 mb-1">
                      Score: {att.score} / {att.total_questions}
                    </div>
                    <div className="text-slate-500 text-sm font-medium">{att.timestamp}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
