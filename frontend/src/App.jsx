import { useEffect, useRef, useState, useCallback } from "react";
import {
  BookOpen, Brain, ChevronLeft, ChevronRight, FilePlus2, GraduationCap,
  LayoutDashboard, LoaderCircle, MessageCircle, Plus, RefreshCw, Send,
  Sparkles, Trash2, Upload, WandSparkles, X, Eye, EyeOff, RotateCcw,
  CheckCircle2, XCircle, Map as MapIcon, Layers, FileText,
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

function FlashcardsRenderer({ data, onReview }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!data) return null;
  const cards = Array.isArray(data) ? data : data.cards || [];
  if (!cards.length) return <p className="muted">No flashcards available yet.</p>;
  const c = cards[idx];
  return (
    <div className="render-cards">
      <span className="card-counter">{idx + 1} / {cards.length}</span>
      <div className={`flip-card${flipped ? " flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
        <div className="flip-inner">
          <div className="flip-front"><Md>{c.question || c.front || ""}</Md></div>
          <div className="flip-back"><Md>{c.answer || c.back || ""}</Md></div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Click card to flip</p>
      <div className="card-nav">
        <button className="btn-secondary" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setFlipped(false); }}><ChevronLeft size={15} /> Prev</button>
        <button className="btn-secondary" disabled={idx === cards.length - 1} onClick={() => { setIdx(idx + 1); setFlipped(false); }}>Next <ChevronRight size={15} /></button>
      </div>
      {c.id && (
        <div className="srs-btns">
          <button className="btn-ghost" onClick={() => onReview(c.id, "review_again")}><RotateCcw size={13} /> Again</button>
          <button className="btn-ghost" onClick={() => onReview(c.id, "difficult")}>Hard</button>
          <button className="btn-ghost" onClick={() => onReview(c.id, "know_it")}><CheckCircle2 size={13} /> Know it</button>
        </div>
      )}
    </div>
  );
}

function QuizRenderer({ data, runSubmit, submitting }) {
  const [answers, setAnswers] = useState({});
  if (!data) return null;

  /* Past graded attempt */
  const isPast = Array.isArray(data) && data.length > 0 && data[0].score !== undefined;
  if (isPast) {
    const a = data[0];
    return (
      <div className="render-quiz-result">
        <div className="score-banner">
          <span className="score-big">{a.score}/{a.total_questions}</span>
          <span className="score-pct">{a.percentage}%</span>
        </div>
        {a.details?.map((d, i) => (
          <div key={i} className={`quiz-detail ${d.is_correct ? "correct" : "wrong"}`}>
            <b>{i + 1}. {d.question}</b>
            <p className="muted">Your answer: {d.student_answer}</p>
            {!d.is_correct && <p className="correct-answer">Correct: {d.correct_answer}</p>}
            {d.explanation && <p className="explanation">{d.explanation}</p>}
          </div>
        ))}
      </div>
    );
  }

  /* Active quiz */
  const qs = data?.questions || (Array.isArray(data) ? data : []);
  if (!qs.length) return <p className="muted">No quiz questions available.</p>;
  return (
    <div className="render-quiz">
      {qs.map((q, i) => (
        <div key={i} className="quiz-q">
          <b>{i + 1}. {q.question}</b>
          <div className="quiz-options">
            {q.options?.map((opt, j) => (
              <label key={j} className={`quiz-option${answers[q.id || i] === opt ? " chosen" : ""}`}>
                <input type="radio" name={`q_${i}`} checked={answers[q.id || i] === opt} onChange={() => setAnswers({ ...answers, [q.id || i]: opt })} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn-primary" disabled={submitting} onClick={() => runSubmit(qs, answers)}>
        {submitting ? <><LoaderCircle className="spin" size={15} /> Grading…</> : "Submit Answers"}
      </button>
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
  { id: "quiz", label: "Practice Quiz", desc: "Test your understanding with graded questions.", icon: CheckCircle2, generate: (id) => api.generateQuiz(id), restore: api.getGeneratedQuiz },
  { id: "map", label: "Knowledge Map", desc: "Visualize concepts and their connections.", icon: MapIcon, generate: api.generateMap, restore: api.getMap },
];

/* ------------------------------------------------------------------ */
/*  App Root                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [view, setView] = useState("home");
  const [materials, setMaterials] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [cache, setCache] = useState({});          // keyed "docId_toolId"
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.materials();
      setMaterials(data);
      setSelected((cur) => data.find((x) => x.id === cur?.id) || data[0] || null);
    } catch (e) { setNotice(e.message); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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
        {view === "studio" && <Studio selected={selected} choose={setSelected} cache={cache} setCache={setCache} warn={setNotice} />}
        {view === "tutor" && <Tutor selected={selected} />}
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

      <SectionTitle title="One material, many ways to learn" />
      <div className="steps">
        {[[FilePlus2, "Add", "Drop in a lecture or reading."], [WandSparkles, "Shape", "Create notes, cards, and quizzes."], [Brain, "Remember", "Practice with purpose."]].map(([Icon, t, d], i) => (
          <div key={t}><small>0{i + 1}</small><Icon size={22} /><b>{t}</b><p>{d}</p></div>
        ))}
      </div>
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

function Studio({ selected, choose, cache, setCache, warn }) {
  const [mode, setMode] = useState("notes");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tool = TOOLS.find((t) => t.id === mode);
  const ToolIcon = tool.icon;
  const ck = selected ? `${selected.id}_${mode}` : null;
  const result = ck ? cache[ck] ?? undefined : undefined;

  /* Auto-restore from DB on first mount for this doc+tool */
  useEffect(() => {
    if (!selected || !ck) return;
    if (cache[ck] !== undefined) return;              // already loaded
    let live = true;
    (async () => {
      setBusy(true); setError("");
      try {
        let res = await tool.restore(selected.id);
        // normalise empty
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
    try { await api.reviewCard(cardId, rating); const cards = await api.getFlashcards(selected.id); setCache((c) => ({ ...c, [ck]: cards })); } catch (e) { setError(e.message); }
  };

  const submitQuiz = async (questions, answers) => {
    setBusy(true); setError("");
    try {
      const answerList = questions.map((q, i) => answers[q.id || i] || "");
      const res = await api.submitQuiz(selected.id, questions, answerList);
      setCache((c) => ({ ...c, [ck]: [res] }));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const hasResult = result !== null && result !== undefined;

  return (
    <section className="page">
      <div className="source">
        <small>ACTIVE SOURCE</small>
        <b>{selected?.name || "No material selected"}</b>
        {selected && <button className="btn-ghost" onClick={() => choose(null)}>Clear source</button>}
      </div>

      <div className="studio">
        <div className="tool-list">
          {TOOLS.map((t, i) => {
            const TIcon = t.icon;
            return (
              <button key={t.id} className={mode === t.id ? "active" : ""} onClick={() => setMode(t.id)}>
                <TIcon size={16} />
                <span><b>{t.label}</b><i>{t.desc}</i></span>
              </button>
            );
          })}
        </div>

        <div className="work">
          <small className="label">CREATE FROM YOUR SOURCE</small>
          <h2><ToolIcon size={24} style={{ verticalAlign: "middle", marginRight: 10 }} />{tool.label}</h2>
          <p>{tool.desc}</p>

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

          {error && <div className="error-box"><XCircle size={15} /> {error}</div>}

          <div className="render-area">
            {busy && !hasResult && <div className="loader-block"><LoaderCircle className="spin" size={28} /><p>Generating your study materials…</p></div>}
            {mode === "notes" && <NotesRenderer data={result} />}
            {mode === "cards" && <FlashcardsRenderer data={result} onReview={reviewCard} />}
            {mode === "quiz" && <QuizRenderer data={result} runSubmit={submitQuiz} submitting={busy} />}
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

function Tutor({ selected }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
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
        <Brain size={18} />
        <small>GROUNDING ANSWERS IN</small>
        <b>{selected?.name || "Choose a source in your library"}</b>
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
