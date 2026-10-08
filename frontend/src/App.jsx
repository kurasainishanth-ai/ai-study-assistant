import { useEffect, useRef, useState, useCallback } from "react";
import {
  BookOpen, Brain, ChevronLeft, ChevronRight, ChevronDown, FilePlus2, GraduationCap,
  LayoutDashboard, LoaderCircle, MessageCircle, Plus, RefreshCw, Send,
  Sparkles, Trash2, Upload, WandSparkles, X, RotateCcw,
  CheckCircle2, XCircle, Map as MapIcon, Layers, FileText,
  AlertTriangle, Check, ArrowLeft,
  LayoutTemplate, Download, Mic, Volume2, VolumeX, Square,
  Star, Zap, GitBranch, Columns, Clock, ListOrdered, Info, Calendar
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

function buildDownloadableInfographicHTML(inf) {
  const sectionsHtml = (inf.sections || []).map(sec => `
    <div class="card">
      <h3>${sec.heading}</h3>
      ${(sec.items || []).map(it => `
        <div class="item">
          <div class="item-head">
            <b>${it.label}</b>
            ${it.source_ref ? `<span class="pill">${it.source_ref}</span>` : ''}
          </div>
          <p>${it.content}</p>
        </div>
      `).join('')}
    </div>
  `).join('');

  const stepsHtml = (inf.flow_steps && inf.flow_steps.length > 0) ? `
    <div class="card full-width">
      <h3>Workflow & Stages</h3>
      <div class="steps-grid">
        ${inf.flow_steps.map((st, i) => `
          <div class="step-card">
            <div class="step-num">${st.step_number || i + 1}</div>
            <h4>${st.title}</h4>
            <p>${st.description}</p>
            ${st.source_ref ? `<small class="pill">${st.source_ref}</small>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const compHtml = (inf.comparison_matrix && inf.comparison_matrix.headers && inf.comparison_matrix.rows) ? `
    <div class="card full-width">
      <h3>Comparison Matrix</h3>
      <table style="width:100%; border-collapse:collapse; margin-top:8px;">
        <thead>
          <tr style="border-bottom:2px solid #dddcd4; background:#f0efe9;">
            ${inf.comparison_matrix.headers.map(h => `<th style="padding:8px 12px; text-align:left;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${inf.comparison_matrix.rows.map(r => `
            <tr style="border-bottom:1px solid #dddcd4;">
              ${r.map(c => `<td style="padding:8px 12px;">${c}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const takeawaysHtml = (inf.key_takeaways && inf.key_takeaways.length > 0) ? `
    <div class="card highlight">
      <h3>★ Key Takeaways</h3>
      <ul>${inf.key_takeaways.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>
  ` : '';

  const examHtml = (inf.exam_tips && inf.exam_tips.length > 0) ? `
    <div class="card warning">
      <h3>⚡ High-Yield Exam Points</h3>
      <ul>${inf.exam_tips.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${inf.title || 'StudyVerse Infographic'}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f3ed; color: #25332d; margin: 0; padding: 24px; }
  .container { max-width: 1000px; margin: 0 auto; }
  .header { background: #fbfaf6; border: 1px solid #dddcd4; border-radius: 12px; padding: 24px 28px; margin-bottom: 20px; }
  .type-pill { display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-size: 26px; margin: 4px 0 8px; color: #17372f; }
  .subtitle { font-size: 14px; color: #526057; margin-bottom: 12px; }
  .summary { background: #f0efe9; border-left: 4px solid #e4b968; padding: 10px 14px; font-size: 13px; line-height: 1.6; border-radius: 4px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 20px; }
  .card { background: #fbfaf6; border: 1px solid #dddcd4; border-radius: 12px; padding: 20px; }
  .card h3 { margin-top: 0; font-size: 16px; color: #17372f; border-bottom: 1px solid #dddcd4; padding-bottom: 8px; }
  .item { background: #f0efe9; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
  .item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .item p { margin: 0; font-size: 12.5px; color: #526057; line-height: 1.5; }
  .pill { font-size: 10px; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; color: #78350f; }
  .full-width { grid-column: 1 / -1; }
  .steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px; }
  .step-card { background: #f0efe9; padding: 14px; border-radius: 8px; }
  .step-num { width: 22px; height: 22px; border-radius: 50%; background: #17372f; color: #fff; text-align: center; line-height: 22px; font-weight: bold; font-size: 12px; margin-bottom: 6px; }
  .step-card h4 { margin: 0 0 6px; font-size: 14px; }
  .step-card p { margin: 0; font-size: 12px; color: #526057; }
  .highlight { background: #e6efe6; border-color: #10b981; }
  .warning { background: #fef3c7; border-color: #f59e0b; color: #78350f; }
  ul { margin: 0; padding-left: 20px; line-height: 1.6; font-size: 13px; }
  @media print { body { background: #fff; padding: 0; } .card, .header { border-color: #ccc; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <span class="type-pill">${inf.type_title || 'Infographic'}</span>
    <h1>${inf.title}</h1>
    <div class="subtitle">${inf.subtitle || ''} · Source: ${inf.doc_name || 'Study Material'}</div>
    ${inf.summary ? `<div class="summary">${inf.summary}</div>` : ''}
  </div>
  ${stepsHtml}
  ${compHtml}
  <div class="grid">${sectionsHtml}</div>
  <div class="grid">${takeawaysHtml}${examHtml}</div>
  <small style="color:#78847c;">Generated by StudyVerse AI Platform</small>
</div>
</body>
</html>`;
}

function InfographicRenderer({ data, busy, onGenerateType, currentType }) {
  if (!data) return null;
  const inf = data.data || data;
  if (!inf || !inf.sections) return null;

  const INF_TYPE_LIST = [
    { key: "concept_overview", label: "Concept Overview", icon: Brain },
    { key: "topic_summary",    label: "Topic Summary",    icon: FileText },
    { key: "process_flow",     label: "Process / Flow",   icon: GitBranch },
    { key: "comparison",       label: "Comparison",       icon: Columns },
    { key: "exam_revision",    label: "Exam Revision",    icon: Zap },
    { key: "timeline",         label: "Timeline",         icon: Clock },
    { key: "step_by_step",     label: "Step-by-Step",     icon: ListOrdered },
  ];

  const handleDownload = () => {
    const html = buildDownloadableInfographicHTML(inf);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(inf.title || "studyverse_infographic").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeKey = currentType || inf.type || "concept_overview";

  return (
    <div className="render-infographic" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Type Selector Pills & Download */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <small style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', color: 'var(--fg-3)', marginRight: '4px' }}>INFOGRAPHIC TYPE:</small>
          {INF_TYPE_LIST.map((t) => {
            const TIcon = t.icon;
            const isCur = activeKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                disabled={busy}
                onClick={() => onGenerateType(t.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: isCur ? '1px solid var(--primary, #10b981)' : '1px solid var(--border)',
                  background: isCur ? 'var(--primary, #10b981)' : 'var(--surface)',
                  color: isCur ? '#fff' : 'var(--fg-2)',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <TIcon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12.5px' }}
          title="Download printable standalone HTML infographic"
        >
          <Download size={14} /> Download HTML
        </button>
      </div>

      {/* Main Infographic Banner */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(16,185,129,0.12)', color: 'var(--primary, #10b981)', padding: '3px 10px', borderRadius: '12px' }}>
            {inf.type_title || "INFOGRAPHIC"}
          </span>
          {inf.doc_name && (
            <span style={{ fontSize: '12px', color: 'var(--fg-3)' }}>
              Source: <b>{inf.doc_name}</b>
            </span>
          )}
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 8px', letterSpacing: '-0.5px', color: 'var(--fg)' }}>
          {inf.title}
        </h2>
        {inf.subtitle && (
          <p style={{ fontSize: '14px', color: 'var(--fg-2)', margin: '0 0 12px', lineHeight: 1.5 }}>
            {inf.subtitle}
          </p>
        )}
        {inf.summary && (
          <div style={{ background: 'var(--surface-2)', borderLeft: '3px solid var(--accent, #e4b968)', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', color: 'var(--fg-2)', lineHeight: 1.6 }}>
            {inf.summary}
          </div>
        )}
      </div>

      {/* Sequential Workflow / Steps (when present) */}
      {inf.flow_steps && inf.flow_steps.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <GitBranch size={18} style={{ color: 'var(--primary, #10b981)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Workflow & Sequential Stages</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {inf.flow_steps.map((st, si) => (
              <div key={si} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                    {st.step_number || si + 1}
                  </span>
                  {st.source_ref && (
                    <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--fg-3)' }}>
                      📍 {st.source_ref}
                    </span>
                  )}
                </div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--fg)' }}>{st.title}</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--fg-2)', lineHeight: 1.55 }}>{st.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Matrix (when present) */}
      {inf.comparison_matrix && inf.comparison_matrix.headers && inf.comparison_matrix.rows && inf.comparison_matrix.rows.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Columns size={18} style={{ color: 'var(--purple, #a78bfa)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Side-by-Side Comparison</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                {inf.comparison_matrix.headers.map((h, hi) => (
                  <th key={hi} style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--fg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inf.comparison_matrix.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '10px 14px', color: ci === 0 ? 'var(--fg)' : 'var(--fg-2)', fontWeight: ci === 0 ? 600 : 400 }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Section Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {(inf.sections || []).map((sec, si) => (
          <div
            key={si}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary, #10b981)' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--fg)' }}>{sec.heading}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(sec.items || []).map((it, ii) => (
                <div key={ii} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                    <b style={{ fontSize: '13px', color: 'var(--fg)' }}>{it.label}</b>
                    {it.source_ref && (
                      <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--fg-3)', flexShrink: 0 }}>
                        📍 {it.source_ref}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--fg-2)', lineHeight: 1.55 }}>
                    {it.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Key Takeaways & Exam Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        {inf.key_takeaways && inf.key_takeaways.length > 0 && (
          <div style={{ background: 'var(--surface-3, #e6efe6)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--green)' }}>
              <Star size={18} fill="currentColor" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Key Takeaways</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--fg)' }}>
              {inf.key_takeaways.map((tk, ti) => (
                <li key={ti} style={{ lineHeight: 1.5 }}>{tk}</li>
              ))}
            </ul>
          </div>
        )}

        {inf.exam_tips && inf.exam_tips.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#b45309' }}>
              <Zap size={18} fill="currentColor" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Exam Points & Pitfalls</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#78350f' }}>
              {inf.exam_tips.map((tip, ti) => (
                <li key={ti} style={{ lineHeight: 1.5 }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Citations footer */}
      {inf.source_refs && inf.source_refs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--fg-3)', padding: '0 4px' }}>
          <Info size={14} />
          <span>Verified Sources: {inf.source_refs.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Smart Revision Scheduler Component (feature/yagnesh)               */
/* ------------------------------------------------------------------ */

function RevisionScheduler({ docId, plan, busy, onSavePlan }) {
  const initialPlan = plan?.plan_data || (plan?.days ? plan : null);
  const [currentPlan, setCurrentPlan] = useState(initialPlan);
  const [topicsData, setTopicsData] = useState(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(!initialPlan);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultExamStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [examDate, setExamDate] = useState(initialPlan?.exam_date || defaultExamStr);
  const [startDate, setStartDate] = useState(initialPlan?.start_date || todayStr);
  const [dailyHours, setDailyHours] = useState(initialPlan?.daily_hours || 2.0);
  const [topicPriorities, setTopicPriorities] = useState({});

  useEffect(() => {
    const p = plan?.plan_data || (plan?.days ? plan : null);
    if (p) {
      setCurrentPlan(p);
      setIsConfiguring(false);
    }
  }, [plan]);

  useEffect(() => {
    if (!docId) return;
    let live = true;
    setLoadingTopics(true);
    api.getRevisionTopics(docId)
      .then((res) => {
        if (!live) return;
        setTopicsData(res);
        const priorities = {};
        (res.topics || []).forEach((t) => {
          priorities[t.id] = t.priority || "medium";
        });
        setTopicPriorities(priorities);
      })
      .catch((e) => {
        if (live) setError("Could not load topics: " + e.message);
      })
      .finally(() => {
        if (live) setLoadingTopics(false);
      });
    return () => { live = false; };
  }, [docId]);

  const handleGenerate = async () => {
    if (!docId) return;
    setError("");
    setGenerating(true);
    try {
      const generated = await api.generateRevisionPlan({
        doc_id: docId,
        exam_date: examDate,
        daily_hours: Number(dailyHours),
        start_date: startDate,
        topic_overrides: topicPriorities,
      });
      setCurrentPlan(generated);
      setIsConfiguring(false);
      if (onSavePlan) onSavePlan(generated);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    if (!docId) return;
    const newCompleted = !currentCompleted;
    setCurrentPlan((prev) => {
      if (!prev) return prev;
      let total = 0;
      let comp = 0;
      const updatedDays = (prev.days || []).map((day) => ({
        ...day,
        tasks: (day.tasks || []).map((task) => {
          total += 1;
          const isTarget = task.id === taskId;
          const state = isTarget ? newCompleted : task.completed;
          if (state) comp += 1;
          return isTarget ? { ...task, completed: newCompleted } : task;
        }),
      }));
      const updated = {
        ...prev,
        days: updatedDays,
        completed_tasks: comp,
        completion_percentage: Math.round((comp / Math.max(total, 1)) * 100),
      };
      if (onSavePlan) onSavePlan(updated);
      return updated;
    });

    try {
      await api.updateRevisionTaskStatus(docId, taskId, newCompleted);
    } catch (e) {
      console.error("Task update error:", e);
    }
  };

  const setPriorityForTopic = (topicId, level) => {
    setTopicPriorities((prev) => ({ ...prev, [topicId]: level }));
  };

  if (!docId) {
    return (
      <div className="card-box" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Calendar size={36} style={{ color: 'var(--green)', margin: '0 auto 12px', opacity: 0.8 }} />
        <h3>Choose a study material</h3>
        <p style={{ color: 'var(--fg-3)', fontSize: '13px' }}>Select an uploaded course material to generate an adaptive revision plan.</p>
      </div>
    );
  }

  // --- Configuration View ---
  if (isConfiguring || !currentPlan) {
    return (
      <div className="scheduler-setup" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div className="error-box"><XCircle size={15} /> {error}</div>}

        <div className="card-box" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} style={{ color: 'var(--primary, #10b981)' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--fg-1)' }}>Configure Your Revision Plan</h3>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--fg-3)' }}>
                Target your exam date and daily study time. Weak concepts from your practice quizzes receive priority reinforcement.
              </p>
            </div>
            {currentPlan && (
              <button className="btn-ghost" onClick={() => setIsConfiguring(false)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                Cancel & View Active Plan
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '22px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--fg-2)', marginBottom: '6px' }}>
                📅 Target Exam Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg-1)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--fg-2)', marginBottom: '6px' }}>
                🚀 Revision Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg-1)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--fg-2)', marginBottom: '6px' }}>
                ⏳ Daily Available Study Time: <b>{dailyHours} hrs</b>
              </label>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--green, #17372f)', marginTop: '8px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--fg-3)', marginTop: '2px' }}>
                <span>30 min/day</span>
                <span>4 hrs/day</span>
                <span>8 hrs/day</span>
              </div>
            </div>
          </div>

          {/* Topic Prioritization Table */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--fg-1)' }}>
                Topic Mastery & Prioritization
              </h4>
              <small style={{ fontSize: '11.5px', color: 'var(--fg-3)' }}>
                {topicsData?.has_quiz_data ? "✅ Connected with real quiz performance" : "ℹ️ Self-Assessment (no quiz attempts yet)"}
              </small>
            </div>

            {loadingTopics ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', color: 'var(--fg-3)', fontSize: '13px' }}>
                <LoaderCircle className="spin" size={16} /> Identifying document topics…
              </div>
            ) : topicsData?.topics && topicsData.topics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topicsData.topics.map((t) => {
                  const currentLevel = topicPriorities[t.id] || t.priority || "medium";
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-1)' }}>{t.name}</span>
                        {t.performance_data_available && t.quiz_score !== null ? (
                          <div style={{ fontSize: '11.5px', color: t.quiz_score < 70 ? '#ef4444' : t.quiz_score < 85 ? '#f59e0b' : '#10b981', marginTop: '2px' }}>
                            🎯 Quiz Accuracy: <b>{t.quiz_score}%</b> ({t.quiz_score < 70 ? 'Weak Concept' : t.quiz_score < 85 ? 'Review Recommended' : 'Mastered'})
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--fg-3)', marginTop: '2px' }}>
                            No quiz score recorded yet
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setPriorityForTopic(t.id, 'weak')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: currentLevel === 'weak' ? '1px solid #ef4444' : '1px solid var(--border)',
                            background: currentLevel === 'weak' ? '#fee2e2' : 'transparent',
                            color: currentLevel === 'weak' ? '#991b1b' : 'var(--fg-3)',
                            cursor: 'pointer'
                          }}
                        >
                          🔴 Weak
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriorityForTopic(t.id, 'medium')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: currentLevel === 'medium' ? '1px solid #f59e0b' : '1px solid var(--border)',
                            background: currentLevel === 'medium' ? '#fef3c7' : 'transparent',
                            color: currentLevel === 'medium' ? '#92400e' : 'var(--fg-3)',
                            cursor: 'pointer'
                          }}
                        >
                          🟡 Medium
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriorityForTopic(t.id, 'strong')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: currentLevel === 'strong' ? '1px solid #10b981' : '1px solid var(--border)',
                            background: currentLevel === 'strong' ? '#d1fae5' : 'transparent',
                            color: currentLevel === 'strong' ? '#065f46' : 'var(--fg-3)',
                            cursor: 'pointer'
                          }}
                        >
                          🟢 Strong
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '12.5px', color: 'var(--fg-3)', padding: '8px 0' }}>
                Topics will be synthesized directly from the course text upon generation.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              className="btn-primary"
              disabled={generating}
              onClick={handleGenerate}
              style={{ padding: '10px 22px', fontSize: '13.5px' }}
            >
              {generating ? (
                <>
                  <LoaderCircle className="spin" size={16} /> Generating Revision Plan…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Build Adaptive Revision Schedule
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Active Revision Plan View ---
  const completionPct = currentPlan.completion_percentage || 0;
  const completedTasks = currentPlan.completed_tasks || 0;
  const totalTasks = currentPlan.total_tasks || 0;

  return (
    <div className="revision-schedule-view" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Overview & Progress Header */}
      <div
        className="card-box"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'var(--green)', color: '#fff', textTransform: 'uppercase' }}>
                Active Revision Plan
              </span>
              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--fg-1)' }}>{currentPlan.doc_name}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: 'var(--fg-3)', marginTop: '6px', flexWrap: 'wrap' }}>
              <span>📅 Exam: <b>{currentPlan.exam_date}</b> ({currentPlan.available_days} days)</span>
              <span>⏳ Daily Target: <b>{currentPlan.daily_hours} hrs/day</b></span>
              <span>⏱️ Total Study: <b>{currentPlan.total_planned_hours} hrs</b></span>
            </div>
          </div>

          <button
            className="btn-ghost"
            onClick={() => setIsConfiguring(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px' }}
          >
            <RotateCcw size={14} /> Adjust Settings / Regenerate
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12.5px' }}>
            <span style={{ fontWeight: 600, color: 'var(--fg-2)' }}>Overall Revision Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>
              {completionPct}% Complete ({completedTasks}/{totalTasks} tasks finished)
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${completionPct}%`,
                height: '100%',
                background: completionPct === 100 ? '#10b981' : 'var(--green, #17372f)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Warning if schedule is tight */}
        {currentPlan.is_tight && currentPlan.tight_warning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef3c7', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', marginTop: '14px' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{currentPlan.tight_warning}</span>
          </div>
        )}
      </div>

      {/* Day-by-Day Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(currentPlan.days || []).map((day) => {
          const dayCompleted = day.tasks && day.tasks.length > 0 && day.tasks.every((t) => t.completed);
          return (
            <div
              key={day.day_number}
              className="day-card"
              style={{
                background: 'var(--surface-2)',
                border: dayCompleted ? '1px solid #10b981' : '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 22px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: dayCompleted ? '#10b981' : 'var(--green)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {dayCompleted ? <Check size={14} /> : day.day_number}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--fg-1)' }}>
                    Day {day.day_number} — {day.date_display}
                  </h4>
                  <small style={{ color: 'var(--fg-3)', fontSize: '12px', marginLeft: '6px' }}>· {day.focus}</small>
                </div>
                {dayCompleted && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Day Complete
                  </span>
                )}
              </div>

              {/* Tasks in this day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(day.tasks || []).map((task) => {
                  const isDone = Boolean(task.completed);
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id, isDone)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: isDone ? 'rgba(16,185,129,0.06)' : 'var(--bg)',
                        border: isDone ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}} // handled by parent onClick
                        style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#10b981' }}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: isDone ? 'var(--fg-3)' : 'var(--fg-1)',
                              textDecoration: isDone ? 'line-through' : 'none'
                            }}
                          >
                            {task.task_type}: {task.topic}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background:
                                  task.priority === 'weak'
                                    ? '#fee2e2'
                                    : task.priority === 'medium'
                                    ? '#fef3c7'
                                    : '#d1fae5',
                                color:
                                  task.priority === 'weak'
                                    ? '#991b1b'
                                    : task.priority === 'medium'
                                    ? '#92400e'
                                    : '#065f46',
                                fontWeight: 600
                              }}
                            >
                              {task.priority === 'weak' ? '🔴 High Priority' : task.priority === 'medium' ? '🟡 Core Review' : '🟢 Refresh'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={12} /> {task.estimated_minutes} min
                            </span>
                          </div>
                        </div>

                        {task.tips && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--fg-3)', lineHeight: 1.4 }}>
                            💡 {task.tips}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
  { id: "infographic", label: "Infographic", desc: "Structured visual concept diagrams, flows & revision sheets.", icon: LayoutTemplate, generate: (id) => api.generateInfographic(id, "concept_overview"), restore: (id) => api.getInfographic(id).then((r) => (r?.data ? r : null)) },
  { id: "scheduler", label: "Revision Scheduler", desc: "Adaptive daily revision schedules adapted to your exam date and weak topics.", icon: Calendar, generate: (id) => api.getRevisionPlan(id).then((r) => (r?.plan_data ? r.plan_data : r)), restore: (id) => api.getRevisionPlan(id).then((r) => (r?.plan_data ? r.plan_data : r)) },
];


/* ------------------------------------------------------------------ */
/*  Source Selection Custom Dropdown                                   */
/* ------------------------------------------------------------------ */

function SourceSelectDropdown({ materials, selectedSourceIds, onToggleSource, onSelectAll, onDeleteSource }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = materials && materials.length > 0 && selectedSourceIds.length === materials.length;
  const isNoneSelected = selectedSourceIds.length === 0;

  let label = "All Workspace Materials";
  if (isNoneSelected) {
    label = "All Workspace Materials";
  } else if (allSelected) {
    label = `All Materials (${materials.length})`;
  } else if (selectedSourceIds.length === 1) {
    const firstMat = materials.find((m) => m.id === selectedSourceIds[0]);
    label = firstMat ? firstMat.name : "1 Material Selected";
  } else {
    const firstMat = materials.find((m) => m.id === selectedSourceIds[0]);
    label = firstMat ? `${firstMat.name} (+${selectedSourceIds.length - 1} more)` : `${selectedSourceIds.length} Materials Selected`;
  }

  return (
    <div className="source-select-dropdown" ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-2, rgba(255,255,255,0.07))',
          color: 'var(--fg-1, inherit)',
          border: '1px solid var(--border, rgba(255,255,255,0.15))',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          maxWidth: '340px',
          outline: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📄 {label}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 999,
            minWidth: '280px',
            maxWidth: '360px',
            background: 'var(--surface, #1e293b)',
            border: '1px solid var(--border, rgba(255,255,255,0.15))',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            padding: '6px',
            overflow: 'hidden'
          }}
        >
          {/* Header Action: All Materials */}
          <div
            onClick={onSelectAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              padding: '8px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              background: allSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: allSelected ? 'var(--primary, #10b981)' : 'var(--fg-1)',
              marginBottom: '4px',
              borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: '1px solid ' + (allSelected ? 'var(--primary, #10b981)' : 'var(--fg-3)'),
                  background: allSelected ? 'var(--primary, #10b981)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center'
                }}
              >
                {allSelected && <Check size={12} color="#fff" />}
              </div>
              🌐 All Workspace Materials
            </span>
          </div>

          {/* List of Materials */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {!materials || materials.length === 0 ? (
              <small style={{ display: 'block', padding: '10px', color: 'var(--fg-3)', fontSize: '12px', textAlign: 'center' }}>
                No materials uploaded yet
              </small>
            ) : (
              materials.map((m) => {
                const isSelected = selectedSourceIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => onToggleSource(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      marginBottom: '2px',
                      background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: '1px solid ' + (isSelected ? 'var(--primary, #10b981)' : 'var(--fg-3)'),
                          background: isSelected ? 'var(--primary, #10b981)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <Check size={11} color="#fff" />}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSource(m.id);
                      }}
                      title="Delete material"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--fg-3)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justify: 'center',
                        borderRadius: '4px',
                        marginLeft: '6px',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg-3)'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App Root                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [view, setView] = useState("home");
  const [materials, setMaterials] = useState([]);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [cache, setCache] = useState({});          // keyed "docId_toolId"
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [data, chatsData] = await Promise.all([
        api.materials(),
        api.getRecentChats().catch(() => null),
      ]);
      setMaterials(data);
      setSelected((prev) => prev ?? data[0] ?? null);
      if (chatsData) setChats(chatsData);

      setSelectedSourceIds((prev) => {
        if (!data || data.length === 0) return [];
        if (prev.length === 0) return data.map((m) => m.id);
        return prev.filter((id) => data.some((m) => m.id === id));
      });
    } catch (e) { setNotice(e.message); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onToggleSource = (id) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSelectAllSources = () => {
    if (selectedSourceIds.length === materials.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(materials.map((m) => m.id));
    }
  };

  const onDeleteSource = async (id) => {
    const mat = materials.find((m) => m.id === id);
    if (mat && !confirm(`Remove '${mat.name}' from your library?`)) return;
    try {
      await api.remove(id);
      setSelectedSourceIds((prev) => prev.filter((x) => x !== id));
      await refresh();
    } catch (e) {
      setNotice(e.message);
    }
  };

  
  // Lightweight sidebar-only refresh — called after every message send
  const refreshChats = useCallback(async () => {
    try {
      const chatsData = await api.getRecentChats();
      if (chatsData) setChats(chatsData);
    } catch (_) {}
  }, []);

  const createNewChat = () => {
    // Associate the currently active material as source if any material is selected
    const currentSourceId = selected && !selected.is_chat ? selected.id : (selected?.source_doc_id || materials[0]?.id || null);
    const currentSourceName = selected && !selected.is_chat ? selected.name : (selected?.source_name || materials[0]?.name || null);
    
    const newId = "chat_" + Date.now();
    setSelected({
      id: newId,
      name: "New Chat",
      source_doc_id: currentSourceId,
      source_name: currentSourceName,
      is_chat: true
    });
    setView("tutor");
  };

  const selectChat = (chat) => {
    setSelected({
      id: chat.id,
      name: chat.title,
      source_doc_id: chat.source_doc_id || (chat.is_doc_chat ? chat.id : null),
      source_name: chat.source_name || (chat.is_doc_chat ? chat.title : null),
      is_chat: true
    });
    setView("tutor");
  };

  const deleteChatSession = async (e, chatId) => {
    e.stopPropagation();
    try {
      await Promise.all([
        api.clearTutorHistory(chatId).catch(() => null),
        api.deleteChatSession(chatId).catch(() => null),
      ]);
      if (selected?.id === chatId) {
        createNewChat();
      }
      refreshChats();
    } catch (err) {
      setNotice("Failed to delete chat: " + err.message);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try { await api.upload(file); await refresh(); setShowUpload(false); setView("library"); }
    catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  };

  const handleNavClick = (id) => {
    if (id === "tutor") {
      // Always open a fresh/new chat interface by default when clicking AI Tutor nav item
      createNewChat();
    } else {
      setView(id);
    }
  };

  const handleSelectSource = (docId) => {
    const mat = materials.find((m) => m.id === docId);
    if (selected?.is_chat) {
      setSelected((prev) => ({
        ...prev,
        source_doc_id: docId || null,
        source_name: mat ? mat.name : null
      }));
    } else {
      setSelected(mat || null);
    }
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
          <button key={id} className={`nav${view === id ? " on" : ""}`} onClick={() => handleNavClick(id)}>
            <Icon size={17} />{label}
          </button>
        ))}
        
        <div style={{marginTop: '20px', marginBottom: '10px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '6px'}}>
            <small className="label" style={{marginBottom: 0}}>RECENT CHATS</small>
            <button
              onClick={createNewChat}
              title="Start New Chat"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                background: 'var(--bg-2, rgba(255,255,255,0.05))',
                color: 'var(--fg-1, inherit)',
                cursor: 'pointer'
              }}
            >
              <Plus size={13} /> New Chat
            </button>
          </div>

          <div style={{maxHeight: '220px', overflowY: 'auto', marginTop: '4px'}}>
            {chats.filter(c => c.title && c.title !== "New Chat").length === 0 ? (
              <small style={{display: 'block', padding: '8px 10px', color: 'var(--fg-3)', fontSize: '11px'}}>No recent chats</small>
            ) : (
              chats.filter(c => c.title && c.title !== "New Chat").map(chat => (
                <div
                  key={chat.id}
                  className={`nav${selected?.id === chat.id && view === "tutor" ? " on" : ""}`}
                  onClick={() => selectChat(chat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, overflow: 'hidden', flex: 1}}>
                    <span style={{display:'flex', alignItems:'center', gap:6, width:'100%'}}>
                      <MessageCircle size={14} style={{flexShrink:0}} />
                      <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13}}>
                        {chat.title || "Chat"}
                      </span>
                    </span>
                    {chat.source_name && (
                      <span style={{fontSize: 10, color: 'var(--fg-3)', paddingLeft: 20, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%'}}>
                        📄 {chat.source_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => deleteChatSession(e, chat.id)}
                    title="Delete Chat"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--fg-3)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justify: 'center',
                      borderRadius: '4px',
                      marginLeft: '4px',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg-3)'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
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
        {view === "studio" && (
          <Studio
            selected={selected}
            choose={setSelected}
            cache={cache}
            setCache={setCache}
            warn={setNotice}
            go={setView}
            materials={materials}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={onToggleSource}
            onSelectAllSources={onSelectAllSources}
            onDeleteSource={onDeleteSource}
          />
        )}
        {view === "tutor" && (
          <Tutor
            selected={selected}
            refresh={refresh}
            refreshChats={refreshChats}
            materials={materials}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={onToggleSource}
            onSelectAllSources={onSelectAllSources}
            onDeleteSource={onDeleteSource}
          />
        )}
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

function Studio({
  selected,
  choose,
  cache,
  setCache,
  warn,
  go,
  materials,
  selectedSourceIds,
  onToggleSource,
  onSelectAllSources,
  onDeleteSource
}) {
  const [mode, setMode] = useState(null); // Null = Landing Overview
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const activeDocId = (selectedSourceIds && selectedSourceIds[0]) || selected?.source_doc_id || (!selected?.is_chat ? selected?.id : null);
  const activeMaterial = (materials || []).find((m) => m.id === activeDocId) || (!selected?.is_chat ? selected : null);

  const tool = mode ? TOOLS.find((t) => t.id === mode) : null;
  const ToolIcon = tool?.icon;
  const ck = activeDocId && mode ? `${activeDocId}_${mode}` : null;
  const result = ck ? cache[ck] ?? undefined : undefined;

  /* Auto-restore from DB on first mount for this doc+tool */
  useEffect(() => {
    if (!activeDocId || !ck || !tool) return;
    if (cache[ck] !== undefined) return;              // already loaded
    let live = true;
    (async () => {
      setBusy(true); setError("");
      try {
        let res = await tool.restore(activeDocId);
        // Fallback for quiz if no attempts found: check generated quiz
        if (mode === "quiz" && (!res || res.length === 0)) {
           const generated = await api.getGeneratedQuiz(activeDocId);
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
  }, [activeDocId, mode]);          // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!activeDocId) { warn("Choose a study material first."); return; }
    setBusy(true); setError("");
    try {
      const res = await tool.generate(activeDocId);
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
    if (!activeDocId) return;
    setBusy(true); setError("");
    try {
      const res = await api.submitQuiz(activeDocId, questions, answers);
      setCache((c) => ({ ...c, [ck]: [res] })); // Save attempt as an array to match getQuizAttempts
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const hasResult = result !== null && result !== undefined;

  const renderSourcePicker = () => (
    <div className="source" style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
      {mode && (
        <button className="btn-ghost" onClick={() => setMode(null)} style={{marginRight: 10, padding: 0}}>
          <ArrowLeft size={16} /> Back
        </button>
      )}
      <Brain size={18} style={{color: 'var(--primary, #10b981)', flexShrink: 0}} />
      <small style={{fontWeight: 600, letterSpacing: '0.05em', color: 'var(--fg-3)'}}>ACTIVE SOURCE MATERIAL</small>
      
      <SourceSelectDropdown
        materials={materials}
        selectedSourceIds={selectedSourceIds}
        onToggleSource={onToggleSource}
        onSelectAll={onSelectAllSources}
        onDeleteSource={onDeleteSource}
      />
    </div>
  );

  // Render Landing Page
  if (!mode) {
    return (
      <section className="page studio-landing">
        {renderSourcePicker()}
        <div className="landing-hero" style={{textAlign:'center', padding: '60px 20px'}}>
          <WandSparkles size={48} style={{color:'var(--accent)', marginBottom: 20}} />
          <h2 style={{fontSize: 32, marginBottom: 10, letterSpacing: '-1px'}}>Study Studio</h2>
          <p style={{color: 'var(--fg-2)', maxWidth: 400, margin: '0 auto 40px'}}>
            {activeMaterial 
              ? `Select a tool below to generate study material from "${activeMaterial.name}".`
              : "Please select or upload a material in your Library first."}
          </p>
          <div className="tool-grid" style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto'}}>
            {TOOLS.map(t => {
              const TIcon = t.icon;
              return (
                <button 
                  key={t.id} 
                  className="tool-card"
                  disabled={!activeDocId}
                  onClick={() => setMode(t.id)}
                  style={{background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'left', transition: 'border-color 0.2s, transform 0.1s', cursor: activeDocId ? 'pointer' : 'not-allowed', opacity: activeDocId ? 1 : 0.6}}
                >
                  <TIcon size={24} style={{color: 'var(--green)', marginBottom: 16}} />
                  <h3 style={{fontSize: 16, margin: '0 0 8px'}}>{t.label}</h3>
                  <p style={{fontSize: 13, color: 'var(--fg-3)', margin: 0, lineHeight: 1.5}}>{t.desc}</p>
                </button>
              )
            })}
          </div>
          {!activeDocId && (
            <button className="btn-primary" onClick={() => go('library')} style={{marginTop: 40}}>Go to Library</button>
          )}
        </div>
      </section>
    );
  }

  // Render specific tool
  return (
    <section className="page">
      {renderSourcePicker()}

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
                <button className="btn-primary" disabled={!activeDocId || busy} onClick={generate}>
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
            {mode === "infographic" && (
              <InfographicRenderer
                data={result}
                busy={busy}
                currentType={result?.type || "concept_overview"}
                onGenerateType={async (chosenType) => {
                  if (!activeDocId) return;
                  setBusy(true); setError("");
                  try {
                    const res = await api.generateInfographic(activeDocId, chosenType);
                    setCache((c) => ({ ...c, [ck]: res }));
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
            {mode === "scheduler" && (
              <RevisionScheduler
                docId={activeDocId}
                plan={result}
                busy={busy}
                onSavePlan={(updated) => setCache((c) => ({ ...c, [ck]: updated }))}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tutor  — clean focused chat, NO document preview panel             */
/* ------------------------------------------------------------------ */

function Tutor({
  selected,
  refresh,
  refreshChats,
  materials,
  selectedSourceIds,
  onToggleSource,
  onSelectAllSources,
  onDeleteSource
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef(null);

  // --- Voice Agent State & Handlers ---
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'recording' | 'processing' | 'speaking' | 'error'
  const [voiceError, setVoiceError] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef(null);
  const wasVoiceRef = useRef(false);

  const isSpeechRecSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSpeechSynthSupported = typeof window !== 'undefined' && Boolean(window.speechSynthesis);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (isSpeechSynthSupported) {
      window.speechSynthesis.cancel();
    }
    window._activeSpeechUtterance = null;
    setVoiceState((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, [isSpeechSynthSupported]);

  // Read response aloud via browser SpeechSynthesis
  const speak = useCallback((rawContent) => {
    if (!isSpeechSynthSupported || isMuted || !rawContent) return;
    try {
      window.speechSynthesis.cancel();
      // Strip markdown code fences, headers, citations, and formulas for natural vocalization
      const clean = rawContent
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[(?:Page|Slide|Section)\s*[^\]]+\]/gi, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\$\$?[^$]+\$\$?/g, 'formula')
        .replace(/\n+/g, '. ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean.slice(0, 3000));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Store in window reference to prevent Chromium garbage collection bug
      window._activeSpeechUtterance = utterance;
      utterance.onstart = () => setVoiceState('speaking');
      utterance.onend = () => {
        window._activeSpeechUtterance = null;
        setVoiceState((prev) => (prev === 'speaking' ? 'idle' : prev));
      };
      utterance.onerror = () => {
        window._activeSpeechUtterance = null;
        setVoiceState((prev) => (prev === 'speaking' ? 'idle' : prev));
      };
      setVoiceState('speaking');
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      setVoiceState('idle');
    }
  }, [isSpeechSynthSupported, isMuted]);

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
    if (messages.length === 0) return;
    if (confirm("Are you sure you want to clear this conversation? This action cannot be undone.")) {
       setClearing(true);
       try {
         if (selected?.id) {
           await Promise.all([
             api.clearTutorHistory(selected.id).catch(() => null),
             api.deleteChatSession(selected.id).catch(() => null),
           ]);
         }
         setMessages([]);
         if (refreshChats) refreshChats();
         if (refresh) refresh();
       } catch (err) {
         alert("Failed to clear chat: " + err.message);
       } finally {
         setClearing(false);
       }
    }
  };

  const executeSubmit = async (textOverride = null) => {
    const q = (textOverride || input).trim();
    if (!q || busy) return;
    
    // Ensure an active session ID exists
    const currentSelected = selected || { id: "chat_" + Date.now(), name: "New Chat", is_chat: true };
    setInput("");
    setLiveTranscript("");
    setMessages((x) => [...x, ["You", q, "you"]]);
    setBusy(true);
    try {
      const sourceDocId = selectedSourceIds.length ? selectedSourceIds.join(",") : (currentSelected?.source_doc_id || (!currentSelected?.is_chat ? currentSelected?.id : null));
      const r = await api.tutor(currentSelected.id, q, "intermediate", sourceDocId);
      const answerText = r.response || r.answer || r.content || text(r);
      setMessages((x) => [...x, ["Study tutor", answerText, ""]]);
      
      // Auto-read aloud if user spoke the question
      if (wasVoiceRef.current && !isMuted) {
        speak(answerText);
      }
      wasVoiceRef.current = false;

      // Lightweight sidebar-only refresh — shows this chat instantly in Recent Chats
      if (refreshChats) refreshChats();
    } catch (err) {
      setMessages((x) => [...x, ["System", "Error: " + err.message, "error"]]);
    } finally {
      setBusy(false);
      setVoiceState((prev) => (prev === 'processing' ? 'idle' : prev));
    }
  };

  // Start Voice Input (Recording & Continuous Speech Recognition)
  const startRecording = async () => {
    if (!isSpeechRecSupported) {
      setVoiceError("Voice input is not supported in this browser. Try Google Chrome, Edge, or Safari.");
      setVoiceState('error');
      return;
    }

    stopSpeaking();
    setVoiceError(null);

    // Explicitly prompt and request microphone permission via getUserMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr) {
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setVoiceError("Microphone permission denied. Please allow microphone access in your browser settings (look for the lock or camera icon in the address bar).");
      } else {
        setVoiceError("Microphone device unavailable: " + (permErr.message || "Could not start audio stream"));
      }
      setVoiceState('error');
      return;
    }

    // Clean up previous recognition instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    setVoiceState('recording');
    setLiveTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let finalStr = '';
      let interimStr = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }
      const combined = (finalStr + (interimStr ? ' ' + interimStr : '')).trim();
      setLiveTranscript(combined);
      setInput(combined);
      wasVoiceRef.current = true;
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError("Microphone permission denied. Please click the lock or camera icon in your address bar to allow microphone access.");
        setVoiceState('error');
      } else if (event.error === 'no-speech') {
        // Quietly keep waiting
      } else if (event.error !== 'aborted') {
        setVoiceError(`Voice recognition error (${event.error}). Please try speaking again.`);
        setVoiceState('error');
      }
    };

    recognition.onend = () => {
      setVoiceState((prev) => (prev === 'recording' ? 'idle' : prev));
    };

    try {
      recognition.start();
    } catch (err) {
      setVoiceError("Could not start microphone: " + err.message);
      setVoiceState('error');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setVoiceState('idle');
  };

  const submitVoiceNow = () => {
    stopRecording();
    const textToSend = (input || liveTranscript).trim();
    if (textToSend) {
      executeSubmit(textToSend);
    }
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    setVoiceState('idle');
    setLiveTranscript('');
    setInput('');
  };

  return (
    <section className="page tutor-page">
      {/* Active-document indicator & In-Chat Source Picker */}
      <div className="source" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
        <div style={{display:'flex', alignItems:'center', gap:'12px', flex:1, minWidth: '240px'}}>
          <Brain size={18} style={{color: 'var(--primary, #10b981)', flexShrink: 0}} />
          <small style={{fontWeight: 600, letterSpacing: '0.05em', color: 'var(--fg-3)'}}>GROUNDING ANSWERS IN</small>
          
          <SourceSelectDropdown
            materials={materials}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={onToggleSource}
            onSelectAll={onSelectAllSources}
            onDeleteSource={onDeleteSource}
          />
        </div>

        {messages.length > 0 && (
          <button className="btn-ghost" disabled={busy || clearing} onClick={clearChat} style={{marginLeft:'auto'}}>
            <Trash2 size={16} /> Clear Chat
          </button>
        )}
      </div>

      {/* Voice Status Alert if error occurs */}
      {voiceError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--danger-bg)', color: 'var(--danger-fg)', padding: '8px 14px', borderRadius: '8px', fontSize: '12.5px', margin: '8px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} />
            <span>{voiceError}</span>
          </div>
          <button type="button" onClick={() => setVoiceError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Chat area — full width, no preview panel */}
      <div className="chat-container" ref={scrollRef}>
        {messages.length ? messages.map((m, i) => (
          <div key={i} className={`msg ${m[2]}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <small style={{ margin: 0 }}>{m[0]}</small>
              {m[2] !== "you" && m[2] !== "error" && (
                <button
                  type="button"
                  onClick={() => speak(m[1])}
                  title="Read response aloud (Voice Output)"
                  style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.65, cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.65'}
                >
                  <Volume2 size={13} />
                </button>
              )}
            </div>
            <div className="msg-body"><Md>{m[1]}</Md></div>
          </div>
        )) : (
          <div className="chat-empty">
            <MessageCircle size={32} />
            <h2>What are you working through?</h2>
            <p>Ask for an explanation, memory trick, or step-by-step walkthrough by typing or speaking.</p>
          </div>
        )}
        {busy && <div className="msg"><small>Study tutor</small><p className="typing"><LoaderCircle className="spin" size={14} /> Thinking…</p></div>}
      </div>

      {/* Visible Listening State & Transcript Banner */}
      {voiceState === 'recording' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '10px 14px',
            margin: '0 0 10px',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444'
              }}
            />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recording Voice Input
              </div>
              <div style={{ fontSize: '13px', color: 'var(--fg-1)', fontStyle: liveTranscript ? 'normal' : 'italic' }}>
                {liveTranscript ? `“${liveTranscript}”` : "Listening... Speak your question clearly."}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={stopRecording}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--fg-1)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Done Speaking
            </button>
            <button
              type="button"
              disabled={!input.trim()}
              onClick={submitVoiceNow}
              style={{
                background: 'var(--green, #17372f)',
                border: 'none',
                color: '#fff',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Send size={12} /> Send Now
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              title="Cancel recording"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--fg-3)',
                padding: '4px 6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); executeSubmit(); }} style={{ position: 'relative' }}>
        <input
          disabled={busy}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            voiceState === 'recording'
              ? "🔴 Listening to your voice... Speak your question now."
              : voiceState === 'processing'
              ? "⏳ Transcribing your speech..."
              : "Ask your AI Tutor anything (type or speak)..."
          }
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '4px' }}>
          {/* Voice Input Control Button */}
          {voiceState === 'recording' ? (
            <button
              type="button"
              onClick={stopRecording}
              title="Stop listening"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Square size={13} fill="#fff" /> Stop
            </button>
          ) : voiceState === 'speaking' ? (
            <button
              type="button"
              onClick={stopSpeaking}
              title="Stop speaking"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--green)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <VolumeX size={15} /> Stop Audio
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || voiceState === 'processing'}
              onClick={startRecording}
              title={isSpeechRecSupported ? "Click to speak your question (Voice Agent)" : "Voice input is not supported in this browser"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSpeechRecSupported ? 'var(--surface-2)' : 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                color: isSpeechRecSupported ? 'var(--green)' : 'var(--fg-muted)',
                cursor: isSpeechRecSupported ? 'pointer' : 'not-allowed',
                opacity: busy ? 0.5 : 1
              }}
            >
              <Mic size={17} />
            </button>
          )}

          <button className="btn-send" disabled={busy || !input.trim()} type="submit" title="Send message">
            <Send size={18} />
          </button>
        </div>
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

