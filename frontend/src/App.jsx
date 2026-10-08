import { useEffect, useRef, useState, useCallback } from "react";
import {
  BookOpen, Brain, ChevronLeft, ChevronRight, FilePlus2, GraduationCap,
  LayoutDashboard, LoaderCircle, MessageCircle, Plus, RefreshCw, Send,
  Sparkles, Trash2, Upload, WandSparkles, X, RotateCcw,
  CheckCircle2, XCircle, Map as MapIcon, Layers, FileText,
  AlertTriangle, Check, ArrowLeft
} from "lucide-react";
import { api } from "./services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ForceGraph2D from "react-force-graph-2d";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const text = (v) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

const Md = ({ children }) => (
  <div className="md-body">
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {children || ""}
    </ReactMarkdown>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Feature Renderers                                                  */
/* ------------------------------------------------------------------ */

function NotesRenderer({ data }) {
  if (!data) return null;
  const list = Array.isArray(data) ? data : [data];
  if (!list.length || (!list[0]?.content && typeof list[0] !== "string")) return null;
  return (
    <div className="render-notes">
      {list.map((n, i) => (
        <article key={i} className="note-card">
          <h4>{n.style_title || "Study Notes"}</h4>
          <Md>{typeof n === "string" ? n : n.content}</Md>
        </article>
      ))}
    </div>
  );
}

function FlashcardsRenderer({ data, onReview, onResetMode }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  
  if (!data) return null;
  const cards = Array.isArray(data) ? data : data.cards || [];
  if (!cards.length) return <p className="muted">No flashcards available yet.</p>;

  // Performance calculation
  let cAgain = 0, cHard = 0, cKnow = 0, cUnrated = 0;
  cards.forEach(c => {
    if (c.rating === 'review_again') cAgain++;
    else if (c.rating === 'difficult') cHard++;
    else if (c.rating === 'know_it') cKnow++;
    else cUnrated++;
  });
  const total = cards.length;
  const reviewed = total - cUnrated;

  if (sessionFinished) {
    return (
      <div className="fc-report">
        <h3>Session Complete</h3>
        <div className="fc-stats-grid">
          <div className="stat-box"><b>{total}</b><small>Total Cards</small></div>
          <div className="stat-box"><b>{reviewed}</b><small>Reviewed</small></div>
          <div className="stat-box"><b>{Math.round((reviewed/total)*100)}%</b><small>Completion</small></div>
        </div>
        
        <div className="fc-breakdown">
          <div className="fc-bar">
            {total > 0 && (
              <>
                <div style={{width: `${(cAgain/total)*100}%`, background: 'var(--rating-again)'}} />
                <div style={{width: `${(cHard/total)*100}%`, background: 'var(--rating-hard)'}} />
                <div style={{width: `${(cKnow/total)*100}%`, background: 'var(--rating-know)'}} />
                <div style={{width: `${(cUnrated/total)*100}%`, background: 'var(--surface-3)'}} />
              </>
            )}
          </div>
          <div className="fc-legend">
            <span style={{color:'var(--rating-again)'}}><RotateCcw size={12}/> Again ({cAgain})</span>
            <span style={{color:'var(--rating-hard)'}}><AlertTriangle size={12}/> Hard ({cHard})</span>
            <span style={{color:'var(--rating-know)'}}><CheckCircle2 size={12}/> Know it ({cKnow})</span>
            <span><span style={{opacity: 0.5}}>Unrated ({cUnrated})</span></span>
          </div>
        </div>

        <div className="fc-actions">
          <button className="btn-secondary" onClick={() => {setIdx(0); setFlipped(false); setSessionFinished(false);}}>
            Retry Flashcard Set
          </button>
          <button className="btn-ghost" onClick={onResetMode}>Return to Study Studio</button>
        </div>
      </div>
    );
  }

  const c = cards[idx];

  // Nav bar window calculation
  const winSize = 5;
  let start = Math.max(0, idx - Math.floor(winSize / 2));
  let end = Math.min(total - 1, start + winSize - 1);
  if (end - start + 1 < winSize) {
    start = Math.max(0, end - winSize + 1);
  }
  const visibleNav = [];
  for (let i = start; i <= end; i++) visibleNav.push(i);

  const handleReview = async (id, rating) => {
    await onReview(id, rating);
    if (idx === cards.length - 1) {
      setSessionFinished(true);
    } else {
      setIdx(idx + 1);
      setFlipped(false);
    }
  };

  const jumpTo = (i) => {
    setIdx(i);
    setFlipped(false);
  };

  const getRatingClass = (r) => {
    if (r === 'review_again') return 'r-again';
    if (r === 'difficult') return 'r-hard';
    if (r === 'know_it') return 'r-know';
    return 'r-unrated';
  };

  return (
    <div className="render-cards">
      {/* Top Nav Bar */}
      <div className="fc-navbar">
        {visibleNav.map(i => (
          <button 
            key={i} 
            className={`fc-nav-dot ${i === idx ? 'current' : ''} ${getRatingClass(cards[i].rating)}`}
            onClick={() => jumpTo(i)}
            title={`Card ${i+1}`}
          />
        ))}
      </div>

      <div className="card-counter">{idx + 1} / {total}</div>
      <div className={`flip-card${flipped ? " flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
        <div className="flip-inner">
          <div className="flip-front"><Md>{c.question || c.front || ""}</Md></div>
          <div className="flip-back"><Md>{c.answer || c.back || ""}</Md></div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Click card to flip</p>
      
      <div className="card-nav">
        <button className="btn-secondary" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setFlipped(false); }}><ChevronLeft size={15} /> Prev</button>
        <button className="btn-secondary" onClick={() => {
          if (idx === cards.length - 1) setSessionFinished(true);
          else { setIdx(idx + 1); setFlipped(false); }
        }}>
          {idx === cards.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={15} />
        </button>
      </div>
      
      {c.id && (
        <div className="srs-btns">
          <button className={`btn-rating ${c.rating === 'review_again' ? 'active-again' : ''}`} onClick={() => handleReview(c.id, "review_again")}>
            <RotateCcw size={13} /> Again
          </button>
          <button className={`btn-rating ${c.rating === 'difficult' ? 'active-hard' : ''}`} onClick={() => handleReview(c.id, "difficult")}>
            <AlertTriangle size={13} /> Hard
          </button>
          <button className={`btn-rating ${c.rating === 'know_it' ? 'active-know' : ''}`} onClick={() => handleReview(c.id, "know_it")}>
            <CheckCircle2 size={13} /> Know it
          </button>
        </div>
      )}
    </div>
  );
}

function QuizRenderer({ data, runSubmit, submitting, onResetMode }) {
  const [answers, setAnswers] = useState({});
  const [retryMode, setRetryMode] = useState(false);
  
  if (!data) return null;

  /* Past graded attempt view OR recently submitted view */
  const isPast = Array.isArray(data) && data.length > 0 && data[0].score !== undefined;
  
  if (isPast && !retryMode) {
    const a = data[0];
    return (
      <div className="render-quiz-result">
        <div className="score-banner">
          <div className="score-wrap">
            <span className="score-big">{a.score}/{a.total_questions}</span>
            <span className="score-pct">{a.percentage}%</span>
          </div>
          <p>{a.misconception_analysis || "Quiz evaluation complete."}</p>
        </div>

        <div className="quiz-details-list">
          {a.evaluations?.map((d, i) => (
            <div key={i} className={`quiz-detail ${d.is_correct ? "correct" : "wrong"}`}>
              <b>{i + 1}. {d.question}</b>
              <div className="qd-answers">
                <p className="muted">Your answer: {d.student_answer}</p>
                {!d.is_correct && <p className="correct-answer">Answer Key: {d.correct_answer}</p>}
              </div>
              {d.explanation && <p className="explanation"><b>Feedback:</b> {d.explanation}</p>}
              {d.misconception_analysis && (
                <div className="misconception-box">
                  <AlertTriangle size={14} /> <b>Correction:</b> {d.misconception_analysis}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="quiz-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
          <button className="btn-primary" onClick={() => setRetryMode(true)}>
            <RotateCcw size={15} style={{marginRight:5}}/> Retry Quiz
          </button>
          <button className="btn-secondary" onClick={onResetMode}>
            Return to Studio
          </button>
        </div>
      </div>
    );
  }

  /* Active quiz (fresh or retry) */
  // Find the actual generated questions
  let qs = [];
  if (retryMode && isPast && Array.isArray(data) && data[0].evaluations) {
    // Reconstruct questions from past evaluations if raw quiz data not passed alongside
    qs = data[0].evaluations.map(ev => ({
      id: ev.id,
      question: ev.question,
      options: ev.options || null // If options got lost, it'll fallback to descriptive
    }));
  } else {
    qs = data?.questions || (Array.isArray(data) ? data : []);
  }

  if (!qs.length) return <p className="muted">No quiz questions available.</p>;

  return (
    <div className="render-quiz">
      {qs.map((q, i) => (
        <div key={i} className="quiz-q">
          <b>{i + 1}. {q.question}</b>
          {q.options && q.options.length > 0 ? (
            <div className="quiz-options">
              {q.options.map((opt, j) => (
                <label key={j} className={`quiz-option${answers[q.id || i] === opt ? " chosen" : ""}`}>
                  <input type="radio" name={`q_${i}`} checked={answers[q.id || i] === opt} onChange={() => setAnswers({ ...answers, [q.id || i]: opt })} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea 
              className="quiz-textarea" 
              placeholder="Type your answer here..."
              value={answers[q.id || i] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id || i]: e.target.value })}
            />
          )}
        </div>
      ))}
      <div style={{display:'flex', gap:'10px'}}>
        <button className="btn-primary" disabled={submitting} onClick={() => runSubmit(qs, answers)}>
          {submitting ? <><LoaderCircle className="spin" size={15} /> Grading…</> : "Submit Answers"}
        </button>
        {retryMode && <button className="btn-secondary" onClick={() => setRetryMode(false)}>Cancel Retry</button>}
      </div>
    </div>
  );
}

function MapRenderer({ data }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 700, h: 500 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: Math.max(420, e.contentRect.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data?.nodes?.length) return <p className="muted">No knowledge map available yet.</p>;

  const catColors = { core: "#a78bfa", foundation: "#38bdf8", advanced: "#f472b6" };
  const gd = {
    nodes: data.nodes.map((n) => ({
      id: n.id, name: n.label, category: n.category, summary: n.summary,
      val: n.category === "core" ? 3 : n.category === "advanced" ? 1.5 : 2,
    })),
    links: (data.edges || []).map((e) => ({
      source: e.source, target: e.target, label: e.relationship,
    })),
  };

  return (
    <div className="render-map" ref={containerRef}>
      <ForceGraph2D
        width={dims.w}
        height={dims.h}
        graphData={gd}
        nodeLabel={(n) => `${n.name}${n.summary ? "\n" + n.summary : ""}`}
        nodeColor={(n) => catColors[n.category] || "#a78bfa"}
        nodeRelSize={5}
        linkColor={() => "rgba(100,100,100,0.35)"}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkLabel={(l) => l.label || ""}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = Math.max(11 / globalScale, 3);
          ctx.font = `600 ${fontSize}px Manrope, sans-serif`;
          const r = Math.sqrt(node.val || 1) * 5;
          ctx.fillStyle = catColors[node.category] || "#a78bfa";
          ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI); ctx.fill();
          ctx.fillStyle = "#1a1a2e";
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(label, node.x, node.y + r + 2);
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const r = Math.sqrt(node.val || 1) * 5 + 3;
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI); ctx.fill();
        }}
      />
      <div className="map-legend">
        {Object.entries(catColors).map(([k, v]) => (
          <span key={k}><i style={{ background: v }} />{k}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Studio tools config                                                */
/* ------------------------------------------------------------------ */

const TOOLS = [
  { id: "notes", label: "Smart Notes", desc: "A clear structured summary of your material.", icon: FileText, generate: (id) => api.generateNotes(id), restore: api.getNotes },
  { id: "cards", label: "Flashcards", desc: "Active-recall prompts for spaced repetition.", icon: Layers, generate: (id) => api.generateFlashcards(id), restore: api.getFlashcards },
  { id: "quiz", label: "Practice Quiz", desc: "Test your understanding with graded questions.", icon: CheckCircle2, generate: (id) => api.generateQuiz(id), restore: api.getQuizAttempts },
  { id: "map", label: "Knowledge Map", desc: "Visualize concepts and their connections.", icon: MapIcon, generate: api.generateMap, restore: api.getMap },
];

/* ------------------------------------------------------------------ */
/*  App Root                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [view, setView] = useState("home");
  const [materials, setMaterials] = useState([]);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [cache, setCache] = useState({});          // keyed "docId_toolId"
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.materials();
      setMaterials(data);
      if (!selected) setSelected(data[0] || null);
      
      try {
        const chatsData = await api.getRecentChats();
        setChats(chatsData || []);
      } catch(e) {}
    } catch (e) { setNotice(e.message); }
  }, [selected]);

  useEffect(() => { refresh(); }, [refresh]);

  
  const createNewChat = () => {
    const newId = "chat_" + Date.now();
    setSelected({ id: newId, name: "New Chat", is_chat: true });
    setView("tutor");
  };

  const selectChat = (chat) => {
    setSelected({ id: chat.id, name: chat.title, is_chat: true });
    setView("tutor");
  };

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try { await api.upload(file); await refresh(); setShowUpload(false); setView("library"); }
    catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  };

  const NAV = [
    ["home", LayoutDashboard, "Overview"],
    ["library", BookOpen, "Library"],
    ["studio", WandSparkles, "Study Studio"],
    ["tutor", MessageCircle, "Ask Tutor"],
  ];

  return (
    <div className="shell">
      <aside>
        <div className="brand"><i><GraduationCap size={20} /></i>studylane</div>
        <small className="label">YOUR WORKSPACE</small>
        {NAV.map(([id, Icon, label]) => (
          <button key={id} className={`nav${view === id ? " on" : ""}`} onClick={() => setView(id)}>
            <Icon size={17} />{label}
          </button>
        ))}
        
        <div style={{marginTop: '20px', marginBottom: '10px'}}>
          <small className="label">RECENT CHATS</small>
          <button className="nav" onClick={createNewChat} style={{marginTop: '4px'}}>
            <Plus size={17} /> New Chat
          </button>
          <div style={{maxHeight: '150px', overflowY: 'auto', marginTop: '4px'}}>
            {chats.map(chat => (
              <button key={chat.id} className={`nav${selected?.id === chat.id && view === "tutor" ? " on" : ""}`} onClick={() => selectChat(chat)}>
                <MessageCircle size={15} /> <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{chat.title || "Chat"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="side-bottom">
          <div className="tip"><Sparkles size={16} /><span><b>Study smarter</b>Turn one file into a plan.</span></div>
          <button className="btn-primary add" onClick={() => setShowUpload(true)}><Plus size={17} />Add material</button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <small className="label">{view === "home" ? "A CALM PLACE TO LEARN" : view.toUpperCase()}</small>
            <h1>{view === "home" ? "Good afternoon." : view === "library" ? "Your Library" : view === "studio" ? "Study Studio" : "Your AI Tutor"}</h1>
          </div>
          <b className="avatar">KS</b>
        </header>
        {notice && <div className="notice">{notice}<button className="btn-icon" onClick={() => setNotice("")}><X size={16} /></button></div>}
        {view === "home" && <Home materials={materials} selected={selected} choose={setSelected} go={setView} upload={() => setShowUpload(true)} />}
        {view === "library" && <Library materials={materials} selected={selected} choose={setSelected} refresh={refresh} warn={setNotice} upload={() => setShowUpload(true)} />}
        {view === "studio" && <Studio selected={selected} choose={setSelected} cache={cache} setCache={setCache} warn={setNotice} go={setView} />}
        {view === "tutor" && <Tutor selected={selected} refresh={refresh} />}
      </main>

      {showUpload && <UploadModal busy={busy} close={() => setShowUpload(false)} choose={() => fileRef.current.click()} sample={async () => { setBusy(true); try { await api.sample(); await refresh(); setShowUpload(false); setView("library"); } catch (e) { setNotice(e.message); } finally { setBusy(false); } }} />}
      <input className="hidden" ref={fileRef} type="file" onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */

function Home({ materials, selected, choose, go, upload }) {
  return (
    <section className="page">
      <div className="hero">
        <div>
          <small className="pill"><Sparkles size={13} /> YOUR PERSONAL LEARNING SPACE</small>
          <h2>Make your next study<br /><em>session count.</em></h2>
          <p>Bring your course materials together, then turn them into clear notes, active-recall cards, and focused practice.</p>
          <div className="actions">
            <button className="btn-primary" onClick={upload}><Upload size={17} />Upload a file</button>
            <button className="btn-link" onClick={() => go("studio")}>Open Study Studio <ChevronRight size={17} /></button>
          </div>
        </div>
        <div className="orb-wrap">
          <div className="orb" />
          <span>Ready when you are</span>
          <b>{materials.length} materials in your lane</b>
        </div>
      </div>

      <SectionTitle title="Recent materials" action={() => go("library")} />
      {materials.length ? (
        <div className="grid">
          {materials.slice(0, 3).map((m) => (
            <button key={m.id} className={`material${selected?.id === m.id ? " selected" : ""}`} onClick={() => choose(m)}>
              <FileIcon /><span><b>{m.name}</b><small>{m.type} · {m.size_kb} KB</small></span><ChevronRight size={17} />
            </button>
          ))}
        </div>
      ) : <EmptyState upload={upload} />}
    </section>
  );
}

function SectionTitle({ title, action }) {
  return (
    <div className="section">
      <div><small className="label">PICK UP WHERE YOU LEFT OFF</small><h3>{title}</h3></div>
      {action && <button className="btn-link" onClick={action}>View library <ChevronRight size={17} /></button>}
    </div>
  );
}
function FileIcon() { return <i className="file"><BookOpen size={19} /></i>; }
function EmptyState({ upload }) {
  return (
    <div className="empty">
      <BookOpen size={27} /><h3>Your lane is empty</h3>
      <p>Add a lecture, reading, or notes to start building a study system.</p>
      <button className="btn-primary" onClick={upload}><Upload size={17} />Add your first material</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Library                                                            */
/* ------------------------------------------------------------------ */

function Library({ materials, selected, choose, refresh, warn, upload }) {
  const remove = async (m) => {
    if (!confirm("Remove '" + m.name + "' and its generated study work?")) return;
    try { await api.remove(m.id); await refresh(); } catch (e) { warn(e.message); }
  };
  return (
    <section className="page">
      <div className="intro">
        <p>Everything you add lives here. Choose one to make it your active study source.</p>
        <button className="btn-primary" onClick={upload}><Plus size={17} />Add material</button>
      </div>
      {materials.length ? (
        <div className="list">
          {materials.map((m) => (
            <article key={m.id} onClick={() => choose(m)} className={selected?.id === m.id ? "selected" : ""}>
              <FileIcon />
              <span className="name"><b>{m.name}</b><small>{m.type} · uploaded {m.upload_time}</small></span>
              <i className={`status ${m.status?.toLowerCase()}`}>{m.status}</i>
              <small className="size">{m.size_kb} KB</small>
              <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); remove(m); }}><Trash2 size={17} /></button>
            </article>
          ))}
        </div>
      ) : <EmptyState upload={upload} />}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Studio                                                             */
/* ------------------------------------------------------------------ */

function Studio({ selected, choose, cache, setCache, warn, go }) {
  const [mode, setMode] = useState(null); // Null = Landing Overview
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const tool = mode ? TOOLS.find((t) => t.id === mode) : null;
  const ToolIcon = tool?.icon;
  const ck = selected && mode ? `${selected.id}_${mode}` : null;
  const result = ck ? cache[ck] ?? undefined : undefined;

  /* Auto-restore from DB on first mount for this doc+tool */
  useEffect(() => {
    if (!selected || !ck || !tool) return;
    if (cache[ck] !== undefined) return;              // already loaded
    let live = true;
    (async () => {
      setBusy(true); setError("");
      try {
        let res = await tool.restore(selected.id);
        // Fallback for quiz if no attempts found: check generated quiz
        if (mode === "quiz" && (!res || res.length === 0)) {
           const generated = await api.getGeneratedQuiz(selected.id);
           res = generated; 
        }
        
        if (Array.isArray(res) && res.length === 0) res = null;
        if (res?.nodes && res.nodes.length === 0) res = null;
        if (res?.questions && res.questions.length === 0) res = null;
        
        if (live) setCache((c) => ({ ...c, [ck]: res || null }));
      } catch {
        if (live) setCache((c) => ({ ...c, [ck]: null }));
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => { live = false; };
  }, [selected?.id, mode]);          // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!selected) { warn("Choose a study material first."); return; }
    setBusy(true); setError("");
    try {
      const res = await tool.generate(selected.id);
      setCache((c) => ({ ...c, [ck]: res }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const regenerate = () => {
    if (confirm("Regenerate? This replaces the current result.")) generate();
  };

  const reviewCard = async (cardId, rating) => {
    try { 
      await api.reviewCard(cardId, rating); 
      // Update local cache manually to reflect rating immediately
      setCache(c => {
         const oldCards = c[ck] || [];
         const newCards = Array.isArray(oldCards) ? [...oldCards] : [...(oldCards.cards || [])];
         const idx = newCards.findIndex(x => x.id === cardId);
         if (idx >= 0) newCards[idx] = { ...newCards[idx], rating };
         return { ...c, [ck]: Array.isArray(oldCards) ? newCards : { ...oldCards, cards: newCards } };
      });
    } catch (e) { setError(e.message); }
  };

  const submitQuiz = async (questions, answers) => {
    setBusy(true); setError("");
    try {
      const res = await api.submitQuiz(selected.id, questions, answers);
      setCache((c) => ({ ...c, [ck]: [res] })); // Save attempt as an array to match getQuizAttempts
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const hasResult = result !== null && result !== undefined;

  // Render Landing Page
  if (!mode) {
    return (
      <section className="page studio-landing">
        <div className="source">
          <small>ACTIVE SOURCE</small>
          <b>{selected?.name || "No material selected"}</b>
          {selected && <button className="btn-ghost" onClick={() => choose(null)}>Clear source</button>}
        </div>
        <div className="landing-hero" style={{textAlign:'center', padding: '60px 20px'}}>
          <WandSparkles size={48} style={{color:'var(--accent)', marginBottom: 20}} />
          <h2 style={{fontSize: 32, marginBottom: 10, letterSpacing: '-1px'}}>Study Studio</h2>
          <p style={{color: 'var(--fg-2)', maxWidth: 400, margin: '0 auto 40px'}}>
            {selected 
              ? `Select a tool below to generate study material from "${selected.name}".`
              : "Please select or upload a material in your Library first."}
          </p>
          <div className="tool-grid" style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto'}}>
            {TOOLS.map(t => {
              const TIcon = t.icon;
              return (
                <button 
                  key={t.id} 
                  className="tool-card"
                  disabled={!selected}
                  onClick={() => setMode(t.id)}
                  style={{background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'left', transition: 'border-color 0.2s, transform 0.1s', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6}}
                >
                  <TIcon size={24} style={{color: 'var(--green)', marginBottom: 16}} />
                  <h3 style={{fontSize: 16, margin: '0 0 8px'}}>{t.label}</h3>
                  <p style={{fontSize: 13, color: 'var(--fg-3)', margin: 0, lineHeight: 1.5}}>{t.desc}</p>
                </button>
              )
            })}
          </div>
          {!selected && (
            <button className="btn-primary" onClick={() => go('library')} style={{marginTop: 40}}>Go to Library</button>
          )}
        </div>
      </section>
    );
  }

  // Render specific tool
  return (
    <section className="page">
      <div className="source">
        <button className="btn-ghost" onClick={() => setMode(null)} style={{marginRight: 10, padding: 0}}><ArrowLeft size={16} /> Back</button>
        <small>ACTIVE SOURCE</small>
        <b>{selected?.name || "No material selected"}</b>
        {selected && <button className="btn-ghost" onClick={() => choose(null)}>Clear</button>}
      </div>

      <div className="studio tool-active-layout" style={{display: 'block', padding: '40px 60px'}}>
        <div className="work" style={{maxWidth: '100%', padding: 0}}>
          <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div>
              <small className="label" style={{margin: '0 0 10px'}}>STUDY STUDIO</small>
              <h2 style={{margin: 0, display:'flex', alignItems:'center', gap: 10}}><ToolIcon size={28} />{tool.label}</h2>
              <p>{tool.desc}</p>
            </div>
            <div className="work-actions">
              {!hasResult && (
                <button className="btn-primary" disabled={!selected || busy} onClick={generate}>
                  {busy ? <><LoaderCircle className="spin" size={16} /> Generating…</> : <><WandSparkles size={16} /> Create {tool.label.toLowerCase()}</>}
                </button>
              )}
              {hasResult && (
                <button className="btn-secondary" disabled={busy} onClick={regenerate}>
                  {busy ? <><LoaderCircle className="spin" size={15} /> Regenerating…</> : <><RefreshCw size={15} /> Regenerate</>}
                </button>
              )}
            </div>
          </div>

          {error && <div className="error-box"><XCircle size={15} /> {error}</div>}

          <div className="render-area" style={{marginTop: 30}}>
            {busy && !hasResult && <div className="loader-block"><LoaderCircle className="spin" size={28} /><p>Generating your study materials…</p></div>}
            {mode === "notes" && <NotesRenderer data={result} />}
            {mode === "cards" && <FlashcardsRenderer data={result} onReview={reviewCard} onResetMode={() => setMode(null)} />}
            {mode === "quiz" && <QuizRenderer data={result} runSubmit={submitQuiz} submitting={busy} onResetMode={() => setMode(null)} />}
            {mode === "map" && <MapRenderer data={result} />}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tutor  — clean focused chat, NO document preview panel             */
/* ------------------------------------------------------------------ */

function Tutor({ selected, refresh }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let live = true;
    if (selected) {
      api.getTutorHistory(selected.id).then((hist) => {
        if (live && Array.isArray(hist)) {
          setMessages(hist.map((h) => [h.role === "user" ? "You" : "Study tutor", h.content, h.role === "user" ? "you" : ""]));
        }
      }).catch(() => null);
    } else {
      setMessages([]);
    }
    return () => { live = false; };
  }, [selected]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  
  const clearChat = async () => {
    if (!selected || messages.length === 0) return;
    if (confirm("Are you sure you want to clear this conversation? This action cannot be undone.")) {
       setClearing(true);
       try {
         await api.clearTutorHistory(selected.id);
         setMessages([]);
         if (refresh) refresh();
       } catch (err) {
         alert("Failed to clear chat: " + err.message);
       } finally {
         setClearing(false);
       }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selected || busy) return;
    const q = input;
    setInput("");
    setMessages((x) => [...x, ["You", q, "you"]]);
    setBusy(true);
    try {
      const r = await api.tutor(selected.id, q);
      setMessages((x) => [...x, ["Study tutor", r.response || r.answer || r.content || text(r), ""]]);
      if (refresh) refresh();
    } catch (err) {
      setMessages((x) => [...x, ["System", "Error: " + err.message, "error"]]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page tutor-page">
      {/* Active-document indicator */}
      <div className="source">
        <div style={{display:'flex', alignItems:'center', gap:'12px', flex:1}}>
          <Brain size={18} />
          <small>GROUNDING ANSWERS IN</small>
          <b>{selected?.name || "Choose a source in your library"}</b>
        </div>
        {selected && messages.length > 0 && (
          <button className="btn-ghost" disabled={busy || clearing} onClick={clearChat} style={{marginLeft:'auto'}}>
            <Trash2 size={16} /> Clear Chat
          </button>
        )}
      </div>

      {/* Chat area — full width, no preview panel */}
      <div className="chat-container" ref={scrollRef}>
        {messages.length ? messages.map((m, i) => (
          <div key={i} className={`msg ${m[2]}`}>
            <small>{m[0]}</small>
            <div className="msg-body"><Md>{m[1]}</Md></div>
          </div>
        )) : (
          <div className="chat-empty">
            <MessageCircle size={32} />
            <h2>What are you working through?</h2>
            <p>Ask for an explanation, a memory trick, or a step-by-step walkthrough.</p>
          </div>
        )}
        {busy && <div className="msg"><small>Study tutor</small><p className="typing"><LoaderCircle className="spin" size={14} /> Thinking…</p></div>}
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input disabled={!selected || busy} value={input} onChange={(e) => setInput(e.target.value)} placeholder={selected ? "Ask something about this material…" : "Select a material first"} />
        <button className="btn-send" disabled={!selected || busy || !input.trim()} type="submit"><Send size={18} /></button>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload Modal                                                       */
/* ------------------------------------------------------------------ */

function UploadModal({ busy, close, choose, sample }) {
  return (
    <div className="back">
      <div className="modal">
        <button className="btn-icon close-btn" onClick={close}><X size={18} /></button>
        <small className="pill">ADD A SOURCE</small>
        <h2>Bring in your study material</h2>
        <p>PDFs, documents, slides, text files, and images are all welcome.</p>
        <button className="drop" disabled={busy} onClick={choose}>
          {busy ? <LoaderCircle className="spin" size={27} /> : <Upload size={27} />}
          <b>{busy ? "Adding material…" : "Choose a file"}</b>
          <small>or drag and drop it here</small>
        </button>
        <button className="btn-link sample" disabled={busy} onClick={sample}>Try with sample notes <ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

