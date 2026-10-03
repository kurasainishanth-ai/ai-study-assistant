import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  Trash2,
  Sparkles,
  Loader2,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { api } from '../services/api';
import MarkdownView from './MarkdownView';

const SUGGESTED_PROMPTS = [
  'Summarize the key concepts from this document',
  'Explain the most challenging concept with an analogy',
  'Quiz me on this material',
  'What are the practical applications of these concepts?',
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
  const textareaRef = useRef(null);

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const loadChatHistory = async (docId) => {
    try {
      const history = await api.getTutorHistory(docId);
      // Clean up potential JSON strings in history
      const cleanedHistory = (history || []).map(msg => {
        if (msg.role === 'assistant' && typeof msg.content === 'string') {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed.content || parsed.response || parsed.answer) {
              msg.content = parsed.content || parsed.response || parsed.answer || msg.content;
            }
          } catch(e) {}
        }
        return msg;
      });
      setMessages(cleanedHistory);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeDoc || isLoading) return;

    setInputText('');
    setErrorMsg(null);

    const userMsg = {
      role: 'user',
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.askTutor(activeDoc.id, text, level);
      
      let finalContent = response.content || response.response || '';
      if (typeof finalContent === 'string') {
        try {
          const parsed = JSON.parse(finalContent);
          finalContent = parsed.content || parsed.response || parsed.answer || finalContent;
        } catch(e) {}
      } else if (typeof finalContent === 'object') {
          finalContent = finalContent.content || finalContent.response || finalContent.answer || JSON.stringify(finalContent);
      }

      const assistantMsg = {
        role: 'assistant',
        content: finalContent,
        citations: response.citations || [],
        raw: response.raw_agent_response || null,
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!activeDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0a0f] text-slate-300 p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#141419] border border-slate-800/50 flex items-center justify-center mb-6 shadow-sm">
          <Bot className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">No Document Selected</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-sm text-center leading-relaxed">
          Please select or upload a document to interact with your Grounded AI Tutor.
        </p>
        <button 
          onClick={() => onNavigateTab('library')} 
          className="px-6 py-2.5 bg-white text-black font-medium rounded-lg hover:bg-slate-200 transition-colors text-sm shadow-sm"
        >
          Go to My Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-[#0a0a0f] text-slate-300 font-sans">
      {/* Top Bar */}
      <div className="flex-none px-6 py-4 bg-[#141419]/90 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Study Agent</h2>
            <p className="text-xs text-slate-400">
              Active: <span className="text-slate-200">{activeDoc.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-[#0a0a0f] px-3 py-1.5 rounded-lg border border-slate-800/50">
            <GraduationCap className="w-4 h-4 text-purple-400" />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer appearance-none"
            >
              <option value="simple">Simple / ELI5</option>
              <option value="intermediate">Intermediate</option>
              <option value="university">University</option>
            </select>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a2a35] transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
        {messages.length === 0 ? (
          <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-8 text-center">
             <div className="w-16 h-16 rounded-2xl bg-[#141419] border border-slate-800/50 flex items-center justify-center mb-6 shadow-sm">
                <Sparkles className="w-8 h-8 text-purple-400" />
             </div>
             <h3 className="text-xl font-medium text-white mb-2">How can I help you study?</h3>
             <p className="text-sm text-slate-400 mb-8 max-w-md leading-relaxed">
                Ask questions about your study materials, get explanations, generate quizzes, or explore academic topics.
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
               {SUGGESTED_PROMPTS.map((prompt, i) => (
                 <button
                   key={i}
                   onClick={() => handleSendMessage(prompt)}
                   className="text-left p-4 rounded-xl bg-[#141419] border border-slate-800/50 hover:bg-[#1a1a24] hover:border-slate-700 transition-all group flex items-start gap-3 shadow-sm"
                 >
                   <Lightbulb className="w-5 h-5 text-purple-400/70 group-hover:text-purple-400 shrink-0 mt-0.5" />
                   <span className="text-sm text-slate-300 group-hover:text-white leading-relaxed">{prompt}</span>
                 </button>
               ))}
             </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col px-4 py-8 gap-8">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} w-full`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {isUser ? (
                      <div className="w-8 h-8 rounded-full bg-[#2a2a35] flex items-center justify-center text-slate-300 shadow-sm border border-slate-700/50">
                        <User className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                    <div className={`
                      px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
                      ${isUser 
                        ? 'bg-[#2a2a35] text-white rounded-tr-sm border border-slate-700/50' 
                        : 'text-slate-200 bg-transparent'}
                    `}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#141419] prose-pre:border prose-pre:border-slate-800/50 text-slate-200">
                          <MarkdownView content={msg.content} />
                        </div>
                      )}
                    </div>
                    
                    {!isUser && msg.citations?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 px-2">
                        {msg.citations.map((cite, cIdx) => (
                          <span key={cIdx} className="text-xs bg-[#141419] border border-slate-800/50 text-slate-400 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                            <span className="text-purple-400">📍</span> {cite}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-4 flex-row w-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start max-w-[85%] md:max-w-[75%] pt-2">
                  <div className="flex items-center gap-1.5 px-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 w-full max-w-4xl mx-auto mb-2 bg-[#0a0a0f]">
        <div className="relative bg-[#141419] border border-slate-800/50 rounded-2xl shadow-lg focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600 transition-all flex items-end min-h-[60px] p-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Study Agent..."
            className="flex-1 max-h-48 min-h-[44px] bg-transparent text-sm text-white placeholder-slate-500 px-3 py-3 outline-none resize-none overflow-y-auto leading-relaxed"
            rows={1}
            style={{ height: '44px' }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={`
              p-2.5 rounded-xl mb-1 mr-1 flex items-center justify-center transition-colors shadow-sm
              ${!inputText.trim() || isLoading 
                ? 'bg-[#2a2a35] text-slate-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-slate-200'}
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-3">
          <p className="text-[11px] text-slate-500">AI can make mistakes. Verify important information.</p>
        </div>
      </div>
    </div>
  );
}
