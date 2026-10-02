import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  Trash2,
  Sparkles,
  BookOpen,
  Loader2,
  GraduationCap,
  Lightbulb,
  FileQuestion
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from './MarkdownView';

const SUGGESTED_PROMPTS = [
  'What is the core thesis or main topic?',
  'Explain the most challenging concept with an analogy',
  'What are common misconceptions or traps students make?',
  'Can you give me 3 practice application scenarios?',
];

export default function AITutorView({
  activeDoc,
  onNavigateTab
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (activeDoc) {
      loadChatHistory(activeDoc.id);
    } else {
      setMessages([]);
    }
  }, [activeDoc]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadChatHistory = async (docId) => {
    try {
      const history = await api.getTutorHistory(docId);
      setMessages(history || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeDoc || isLoading) return;

    setInputText('');
    setErrorMsg(null);

    // Optimistic user message
    const userMsg = {
      role: 'user',
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.askTutor(activeDoc.id, text, level);
      const assistantMsg = {
        role: 'assistant',
        content: response.content || response.response,
        citations: response.citations || [],
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setErrorMsg(err.message || 'Tutor response failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!activeDoc || !window.confirm('Clear conversation history for this document?')) return;
    try {
      await api.clearTutorHistory(activeDoc.id);
      setMessages([]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to clear chat history');
    }
  };

  if (!activeDoc) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white">No Document Selected</h3>
        <p className="text-xs text-slate-400">
          Please select or upload a document to interact with your Grounded AI Tutor.
        </p>
        <button onClick={() => onNavigateTab('library')} className="btn btn-primary text-xs">
          Go to My Library
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-100px)]">
      {/* Top Bar */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-violet-600 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Document-Grounded Tutor</span>
              <span className="badge badge-cyan text-[10px]">Citations Enabled</span>
            </h2>
            <p className="text-xs text-slate-400">
              Grounded exclusively in: <span className="text-slate-200">{activeDoc.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Depth / Language Level Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="simple">Simple / ELI5</option>
              <option value="intermediate">Intermediate (College)</option>
              <option value="university">University (Deep Rigor)</option>
            </select>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-2 rounded-xl text-xs mb-3">
          {errorMsg}
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-xl">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ask your AI Study Agent</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Ask specific questions about formulas, concepts, or page sections. All responses cite exact source locations when available.
              </p>
            </div>

            {/* Prompt Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-3">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-left text-xs bg-slate-900/80 hover:bg-violet-950/40 p-3 rounded-xl border border-slate-800 hover:border-violet-500/50 text-slate-300 transition flex items-start gap-2"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-violet-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs ${
                    isUser
                      ? 'bg-violet-600 text-white rounded-br-xs shadow-lg'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-xs shadow-md'
                  }`}
                >
                  {isUser ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      <MarkdownView content={msg.content} />

                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Source Citations:
                          </span>
                          {msg.citations.map((cite, cIdx) => (
                            <span key={cIdx} className="citation-pill text-[10px]">
                              📍 {cite}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 ${
                      isUser ? 'text-violet-200 text-right' : 'text-slate-500'
                    }`}
                  >
                    {msg.created_at || 'Just now'}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-bl-xs text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              <span>Analyzing document and formulating citation-grounded response...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      <div className="glass-panel p-3 rounded-2xl border border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`Ask anything about "${activeDoc.name}"...`}
          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 px-3 py-2 outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <span>Ask Tutor</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
