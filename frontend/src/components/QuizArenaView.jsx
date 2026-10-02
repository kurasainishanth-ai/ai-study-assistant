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

export default function QuizArenaView({ activeDoc, onNavigateTab }) {
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  // Answers keyed by question's own `id` field (string), matching what the backend expects
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [pastAttempts, setPastAttempts] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  // Prevent double-generate clicks
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
          'No quiz questions could be generated from this document. The document may be too short or unstructured. Try uploading a longer study material.'
        );
      }
    } catch (err) {
      const msg = err.message || 'Quiz generation failed';
      if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
        setErrorMsg('Gemini API quota or rate limit reached. Please wait a moment and try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  };

  // Store answers by the question's own id field so the backend lookup is correct
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
      // Defensive: normalise field names in case backend/frontend version mismatch
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
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">No Document Selected</h3>
        <p className="text-xs text-slate-400">
          Please select or upload a study document to launch the Quiz Arena.
        </p>
        <button onClick={() => onNavigateTab('library')} className="btn btn-primary text-xs">
          Go to My Library
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const currentQKey = currentQ ? String(currentQ.id ?? currentQIndex) : null;
  const currentAnswer = currentQKey ? userAnswers[currentQKey] : undefined;
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Config Banner */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-violet-400" />
              Quiz Arena &amp; Misconception Detector
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Source:{' '}
              <span className="text-slate-200 font-medium">{activeDoc.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span>Questions:</span>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                disabled={isGenerating || isEvaluating}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={8}>8 Questions</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span>Difficulty:</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={isGenerating || isEvaluating}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                <option value="easy">Easy (Definitions)</option>
                <option value="medium">Medium (Application)</option>
                <option value="hard">Hard (Synthesis / Traps)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating || isEvaluating}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md shadow-violet-600/30"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Quiz…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{questions.length > 0 ? 'Regenerate Quiz' : 'Generate Quiz'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-xl text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generating spinner overlay hint */}
        {isGenerating && (
          <div className="flex items-center gap-3 text-xs text-slate-400 py-1">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            <span>Gemini is generating quiz questions grounded in your study material…</span>
          </div>
        )}
      </div>

      {/* Active Quiz Runner */}
      {questions.length > 0 && !quizResult && currentQ && (
        <div className="glass-card p-6 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-bold text-violet-400 font-mono">
              Question {currentQIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {currentQ.type === 'mcq'
                  ? 'Multiple Choice'
                  : currentQ.type === 'true_false'
                  ? 'True / False'
                  : currentQ.type === 'short_answer'
                  ? 'Short Answer'
                  : currentQ.type || 'Question'}
              </span>
              {currentQ.topic && (
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {currentQ.topic}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div
              className="bg-violet-500 h-1 rounded-full transition-all"
              style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question */}
          <div className="py-1">
            <h3 className="text-base md:text-lg font-bold text-white leading-relaxed">
              {currentQ.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {Array.isArray(currentQ.options) && currentQ.options.length > 0 ? (
              currentQ.options.map((opt, optIdx) => {
                const isSelected = currentAnswer === opt;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectAnswer(currentQ, opt)}
                    className={`p-3.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-violet-950/50 border-violet-500 text-white shadow-md shadow-violet-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <span>{opt}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-violet-400 bg-violet-500' : 'border-slate-700'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <input
                type="text"
                value={currentAnswer || ''}
                onChange={(e) => handleSelectAnswer(currentQ, e.target.value)}
                placeholder="Type your answer here…"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-violet-500"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="btn btn-secondary text-xs py-2 px-4 disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="text-[10px] text-slate-500">
              {answeredCount} / {questions.length} answered
            </span>

            {currentQIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={isEvaluating}
                className="btn btn-primary text-xs py-2 px-6 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Grading &amp; Analysing…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit &amp; Diagnose</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Results */}
      {quizResult && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-violet-500/40">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-violet-500/30">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Quiz Evaluation Complete</h3>
                <p className="text-xs text-slate-400">
                  Attempt saved. Misconception analysis provided below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-slate-400 font-medium">Accuracy</div>
                <div
                  className={`text-2xl font-bold font-mono mt-0.5 ${
                    quizResult.percentage >= 80
                      ? 'text-emerald-400'
                      : quizResult.percentage >= 60
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {quizResult.percentage}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 font-medium">Score</div>
                <div className="text-2xl font-bold text-white font-mono mt-0.5">
                  {quizResult.score} / {quizResult.total_questions}
                </div>
              </div>
              <button
                onClick={() => {
                  setQuizResult(null);
                  setQuestions([]);
                  setUserAnswers({});
                  setErrorMsg(null);
                }}
                className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">Question Breakdown &amp; Diagnostic Insights</h4>
            {(quizResult.evaluations || []).map((evalItem, idx) => {
              const isCorrect = evalItem.is_correct;
              return (
                <div
                  key={idx}
                  className={`glass-card p-5 space-y-3 border ${
                    isCorrect ? 'border-emerald-800/50 bg-emerald-950/10' : 'border-rose-800/50 bg-rose-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-xs font-bold text-white leading-relaxed">
                        Q{idx + 1}: {evalItem.question}
                      </span>
                    </div>
                    <span className={`badge text-[9px] shrink-0 ${isCorrect ? 'badge-emerald' : 'badge-rose'}`}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 font-medium">Your Answer: </span>
                      <span className={isCorrect ? 'text-emerald-300 font-semibold' : 'text-rose-300 font-semibold'}>
                        {evalItem.student_answer || 'No answer submitted'}
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 font-medium">Correct Answer: </span>
                      <span className="text-emerald-400 font-semibold">{evalItem.correct_answer}</span>
                    </div>
                  </div>

                  {evalItem.explanation && (
                    <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                      <strong className="text-slate-200">Explanation: </strong>
                      {evalItem.explanation}
                    </div>
                  )}

                  {!isCorrect && evalItem.misconception_analysis && (
                    <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Misconception Analysis (Possibility)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {evalItem.misconception_analysis}
                      </p>
                      {evalItem.targeted_follow_up && (
                        <div className="mt-2 pt-2 border-t border-amber-800/30 flex items-start gap-2 text-xs text-cyan-300">
                          <Lightbulb className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Targeted Follow-up: </strong>
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

          {/* Overall misconception summary */}
          {quizResult.misconception_analysis &&
            quizResult.misconception_analysis !== 'Outstanding work! No misconceptions identified on this attempt.' && (
            <div className="glass-card p-5 space-y-2 border border-amber-800/30">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <BookOpen className="w-4 h-4" />
                Overall Misconception Summary
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {quizResult.misconception_analysis}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past Attempts */}
      {pastAttempts.length > 0 && !quizResult && questions.length === 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Past Quiz Attempts for this Document
          </h4>
          <div className="glass-card divide-y divide-slate-800/80">
            {pastAttempts.map((att) => (
              <div key={att.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">
                    Score: {att.score} / {att.total_questions} ({att.percentage}%)
                  </div>
                  <div className="text-slate-500 text-[10px] mt-0.5">{att.timestamp}</div>
                </div>
                <span
                  className={`badge text-[10px] ${
                    att.percentage >= 80 ? 'badge-emerald' : att.percentage >= 60 ? 'badge-amber' : 'badge-rose'
                  }`}
                >
                  {att.percentage >= 80 ? 'Mastered' : att.percentage >= 60 ? 'Review Needed' : 'Needs Work'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
