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
      <div className="p-8 md:p-12 max-w-lg mx-auto text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-[#141419] border border-slate-800/50 flex items-center justify-center mx-auto text-slate-500 shadow-xl">
          <BrainCircuit className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-white tracking-tight">No Document Selected</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Please select or upload a study document to launch the Quiz Arena.
        </p>
        <button onClick={() => onNavigateTab('library')} className="bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm shadow-sm">
          Go to My Library
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  const currentQKey = currentQ ? String(currentQ.id ?? currentQIndex) : null;
  const currentAnswer = currentQKey ? userAnswers[currentQKey] : undefined;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = questions.length > 0 ? ((currentQIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Config Banner */}
      <div className="bg-[#141419] border border-slate-800/50 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-800/50 pb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2.5 tracking-tight">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Quiz Arena
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Source: <span className="text-slate-300 font-medium">{activeDoc.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800/80 rounded-xl px-3 py-1.5">
              <span className="text-slate-400">Questions:</span>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                disabled={isGenerating || isEvaluating}
                className="bg-transparent text-white outline-none cursor-pointer font-medium disabled:opacity-50"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={8}>8 Questions</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-300 bg-[#0a0a0f] border border-slate-800/80 rounded-xl px-3 py-1.5">
              <span className="text-slate-400">Level:</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={isGenerating || isEvaluating}
                className="bg-transparent text-white outline-none cursor-pointer font-medium disabled:opacity-50"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={isGenerating || isEvaluating}
              className="bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold text-sm py-2 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{questions.length > 0 ? 'Regenerate' : 'Start Quiz'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {isGenerating && (
          <div className="mt-5 flex items-center gap-3 text-sm text-slate-400 bg-[#0a0a0f] border border-slate-800/50 p-4 rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span>AI is carefully crafting intelligent questions from your notes...</span>
          </div>
        )}
      </div>

      {/* Active Quiz Runner */}
      {questions.length > 0 && !quizResult && currentQ && (
        <div className="bg-[#141419] border border-slate-800/50 rounded-3xl p-6 md:p-10 shadow-xl space-y-8">
          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-indigo-400 tracking-wide">
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#0a0a0f] border border-slate-800/50 text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                  {currentQ.type === 'mcq' ? 'Multiple Choice' : currentQ.type || 'Question'}
                </span>
              </div>
            </div>
            <div className="w-full bg-[#0a0a0f] rounded-full h-1.5 border border-slate-800/50 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <h3 className="text-xl md:text-2xl font-semibold text-white leading-relaxed tracking-tight">
              {currentQ.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {Array.isArray(currentQ.options) && currentQ.options.length > 0 ? (
              currentQ.options.map((opt, optIdx) => {
                const isSelected = currentAnswer === opt;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectAnswer(currentQ, opt)}
                    className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                        : 'bg-[#0a0a0f] border-slate-800 hover:border-slate-600 hover:bg-[#111116] text-slate-300'
                    }`}
                  >
                    <span className="text-sm md:text-base font-medium leading-relaxed pr-4">{opt}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600 group-hover:border-slate-500'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <textarea
                value={currentAnswer || ''}
                onChange={(e) => handleSelectAnswer(currentQ, e.target.value)}
                placeholder="Type your detailed answer here..."
                rows={4}
                className="w-full bg-[#0a0a0f] border border-slate-800 rounded-2xl p-5 text-sm text-white outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-600"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
            <button
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="bg-[#0a0a0f] hover:bg-[#111116] border border-slate-800/80 disabled:opacity-40 disabled:hover:bg-[#0a0a0f] text-slate-300 font-medium text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-xs font-medium text-slate-500">
              {answeredCount} / {questions.length} answered
            </span>

            {currentQIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQIndex((prev) => prev + 1)}
                className="bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={isEvaluating || answeredCount < questions.length}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white font-semibold text-sm py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-sm"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Grading...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit</span>
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
          <div className="bg-[#141419] border border-slate-800/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Evaluation Complete</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Detailed analysis and feedback below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-8 bg-[#0a0a0f] border border-slate-800/80 p-4 rounded-2xl">
              <div className="text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Accuracy</div>
                <div
                  className={`text-2xl font-bold font-mono mt-1 ${
                    quizResult.percentage >= 80 ? 'text-emerald-400' : quizResult.percentage >= 60 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {quizResult.percentage}%
                </div>
              </div>
              <div className="w-px h-10 bg-slate-800/80"></div>
              <div className="text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Score</div>
                <div className="text-2xl font-bold text-white font-mono mt-1">
                  {quizResult.score} / {quizResult.total_questions}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setQuizResult(null);
                setQuestions([]);
                setUserAnswers({});
                setErrorMsg(null);
              }}
              className="bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-sm w-full md:w-auto justify-center"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Quiz</span>
            </button>
          </div>

          <div className="space-y-5">
            <h4 className="text-lg font-semibold text-white tracking-tight px-2">Question Analysis</h4>
            {(quizResult.evaluations || []).map((evalItem, idx) => {
              const isCorrect = evalItem.is_correct;
              return (
                <div
                  key={idx}
                  className={`bg-[#141419] p-6 rounded-3xl border transition-all ${
                    isCorrect ? 'border-emerald-500/20' : 'border-rose-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                      )}
                      <span className="text-base font-medium text-white leading-relaxed">
                        <span className="text-slate-500 mr-2">Q{idx + 1}.</span>
                        {evalItem.question}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-5">
                    <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Your Answer</div>
                      <div className={isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                        {evalItem.student_answer || 'No answer submitted'}
                      </div>
                    </div>
                    <div className="bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Correct Answer</div>
                      <div className="text-emerald-400 font-medium">{evalItem.correct_answer}</div>
                    </div>
                  </div>

                  {evalItem.explanation && (
                    <div className="text-sm text-slate-300 leading-relaxed bg-[#0a0a0f] p-4 rounded-2xl border border-slate-800/50 mb-4">
                      <strong className="text-white font-semibold">Explanation: </strong>
                      {evalItem.explanation}
                    </div>
                  )}

                  {!isCorrect && evalItem.misconception_analysis && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        Misconception Detected
                      </div>
                      <p className="text-sm text-amber-200/70 leading-relaxed">
                        {evalItem.misconception_analysis}
                      </p>
                      {evalItem.targeted_follow_up && (
                        <div className="pt-3 mt-1 border-t border-amber-500/10 flex items-start gap-2 text-sm text-indigo-300">
                          <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">
                            <strong className="text-indigo-200 font-semibold">Study Tip: </strong>
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
            <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl space-y-3 mt-8">
              <div className="flex items-center gap-2 text-base font-semibold text-indigo-300">
                <BookOpen className="w-5 h-5" />
                Overall Knowledge Gaps
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {quizResult.misconception_analysis}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past Attempts */}
      {pastAttempts.length > 0 && !quizResult && questions.length === 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800/50">
          <h4 className="text-sm font-semibold text-slate-400 tracking-tight">
            Previous Attempts
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pastAttempts.map((att) => (
              <div key={att.id} className="bg-[#141419] border border-slate-800/50 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-2xl font-bold font-mono text-white">
                    {att.percentage}%
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      att.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : att.percentage >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {att.percentage >= 80 ? 'Mastered' : att.percentage >= 60 ? 'Review' : 'Needs Work'}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-300">
                    Score: {att.score} / {att.total_questions}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">{att.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
