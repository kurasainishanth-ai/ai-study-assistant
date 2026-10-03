import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import MarkdownView from '../components/MarkdownView';
import { Button } from '../components/ui/Button';

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
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-[2rem] bg-[#141419] border border-slate-800 flex items-center justify-center mb-8 shadow-2xl relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
            <Bot className="w-10 h-10 text-indigo-400 relative z-10" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-4">No Document Selected</h3>
          <p className="text-lg text-slate-400 mb-8 max-w-md text-center leading-relaxed">
            Please select or upload a document to interact with your Grounded AI Tutor.
          </p>
          <Button 
            size="lg"
            onClick={() => onNavigateTab('library')} 
            className="bg-white text-black hover:bg-slate-200"
          >
            Go to My Library
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-[#0a0a0f] text-slate-300 font-sans max-w-7xl mx-auto w-full">
      {/* Top Bar */}
      <div className="flex-none px-6 py-4 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AI Study Agent</h2>
            <p className="text-sm text-slate-400">
              Grounded in: <span className="text-indigo-300 font-medium">{activeDoc.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-[#141419] px-4 py-2 rounded-xl border border-slate-800">
            <GraduationCap className="w-5 h-5 text-purple-400" />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-200 outline-none cursor-pointer appearance-none"
            >
              <option value="simple">Simple / ELI5</option>
              <option value="intermediate">Intermediate</option>
              <option value="university">University</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClearHistory}
            className="bg-[#141419] border-slate-800 text-slate-400 hover:text-white hover:border-slate-600"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {errorMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-6 mt-4 z-10">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm flex items-center gap-3 font-medium">
            <span>{errorMsg}</span>
          </div>
        </motion.div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-8 text-center my-auto">
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-col items-center"
             >
               <div className="w-20 h-20 rounded-[2rem] bg-[#141419] border border-slate-800 flex items-center justify-center mb-8 shadow-2xl relative">
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                  <Sparkles className="w-10 h-10 text-purple-400 relative z-10" />
               </div>
               <h3 className="text-4xl font-extrabold text-white mb-4 tracking-tight">How can I help you study?</h3>
               <p className="text-lg text-slate-400 mb-10 max-w-xl leading-relaxed">
                  Ask questions about your study materials, get explanations, generate quizzes, or explore academic topics.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                 {SUGGESTED_PROMPTS.map((prompt, i) => (
                   <motion.button
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     key={i}
                     onClick={() => handleSendMessage(prompt)}
                     className="text-left p-6 rounded-3xl bg-[#141419] border border-slate-800 hover:bg-[#1a1a24] hover:border-slate-600 transition-all group flex items-start gap-4 shadow-sm"
                   >
                     <div className="w-10 h-10 rounded-2xl bg-[#0a0a0f] border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                       <Lightbulb className="w-5 h-5 text-purple-400" />
                     </div>
                     <span className="text-base font-medium text-slate-300 group-hover:text-white leading-relaxed mt-1">{prompt}</span>
                   </motion.button>
                 ))}
               </div>
             </motion.div>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col px-4 py-8 gap-8">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx} 
                    className={`flex gap-6 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-1">
                      {isUser ? (
                        <div className="w-10 h-10 rounded-2xl bg-[#141419] flex items-center justify-center text-slate-300 border border-slate-800 shadow-sm">
                          <User className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Bot className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[80%]`}>
                      <div className={`
                        px-6 py-4 rounded-[2rem] text-base leading-relaxed shadow-sm
                        ${isUser 
                          ? 'bg-[#141419] text-white rounded-tr-lg border border-slate-800' 
                          : 'text-slate-200 bg-transparent px-0 py-0'}
                      `}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-invert prose-lg max-w-none prose-p:leading-relaxed prose-pre:bg-[#141419] prose-pre:border prose-pre:border-slate-800/80 text-slate-200">
                            <MarkdownView content={msg.content} />
                          </div>
                        )}
                      </div>
                      
                      {!isUser && msg.citations?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {msg.citations.map((cite, cIdx) => (
                            <span key={cIdx} className="text-xs font-medium bg-[#141419] border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm hover:text-indigo-300 hover:border-slate-600 transition-colors cursor-default">
                              <span className="text-indigo-400">📍</span> {cite}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-6 flex-row w-full">
                <div className="flex-shrink-0 mt-1 w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start max-w-[85%] md:max-w-[75%] pt-3">
                  <div className="flex items-center gap-2 px-2 bg-[#141419] py-3 rounded-2xl border border-slate-800">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatBottomRef} className="h-6" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 w-full max-w-4xl mx-auto mb-4 bg-[#0a0a0f] z-10 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-10 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />
        <div className="relative bg-[#141419] border border-slate-700/80 rounded-[2rem] shadow-2xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all flex items-end min-h-[70px] p-2.5">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Study Agent..."
            className="flex-1 max-h-48 min-h-[50px] bg-transparent text-base text-white placeholder-slate-500 px-4 py-3.5 outline-none resize-none overflow-y-auto leading-relaxed custom-scrollbar"
            rows={1}
            style={{ height: '50px' }}
          />
          <Button
            size="icon"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={`
              w-12 h-12 rounded-[1.5rem] mb-1 mr-1 shrink-0 transition-all
              ${!inputText.trim() || isLoading 
                ? 'bg-[#0a0a0f] text-slate-600 border border-slate-800' 
                : 'bg-white text-black hover:bg-slate-200 hover:scale-105 shadow-lg shadow-white/10'}
            `}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="text-center mt-4">
          <p className="text-xs font-medium text-slate-500">AI can make mistakes. Verify important information.</p>
        </div>
      </div>
    </div>
  );
}
