import { useEffect, useRef, useState, useCallback } from "react";
import {
  BookOpen, Brain, ChevronLeft, ChevronRight, ChevronDown, FilePlus2,
  LayoutDashboard, LoaderCircle, MessageCircle, Plus, RefreshCw, Send,
  Sparkles, Trash2, Upload, WandSparkles, X, RotateCcw,
  CheckCircle2, XCircle, Map as MapIcon, Layers, FileText,
  AlertTriangle, Check, ArrowLeft, Video, Play, ExternalLink, Clock,
  Search, Eye, EyeOff, CornerDownRight,
  Calendar, Columns, Download, GitBranch, Info, ListOrdered, Star, Zap
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

const getTimeGreeting = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
};

const THEMES = {
  "Sage Study": { bg: "#E8E9E1", surface: "#F0F0E9", fg: "#26342C", muted: "#4B5A50", accent: "#326449", secondary: "#293B32", highlight: "#66866E", border: "rgba(49, 68, 55, .2)" },
  "Warm Paper": { bg: "#ECE4D8", surface: "#F3ECE1", fg: "#352E27", muted: "#5D5349", accent: "#854B36", secondary: "#42352C", highlight: "#A47739", border: "rgba(74, 57, 43, .2)" },
  "Solarized Light": { bg: "#E9E4D6", surface: "#F1EDDF", fg: "#263A3C", muted: "#4E6060", accent: "#28706C", secondary: "#293D3B", highlight: "#98772E", border: "rgba(45, 68, 66, .2)" },
  "Midnight Slate": { bg: "#191B20", surface: "#252830", fg: "#F1F0EC", muted: "#C5C4BE", accent: "#D3A85C", secondary: "#111318", highlight: "#E8C784", border: "rgba(190, 183, 165, .24)" },
  "Ocean Focus": { bg: "#14221E", surface: "#20332B", fg: "#F0F4EE", muted: "#C0CEC2", accent: "#79C6A2", secondary: "#0D1713", highlight: "#D6B66D", border: "rgba(145, 190, 160, .25)" },
  "Plum Dusk": { bg: "#211C27", surface: "#302735", fg: "#F3EDF2", muted: "#CEC1D0", accent: "#D38BAA", secondary: "#17131B", highlight: "#D6AD72", border: "rgba(190, 155, 188, .25)" },
};
const DEFAULT_THEME = "Midnight Slate";
const THEME_DEFAULT_VERSION = "midnight-slate-v1";

const isYouTubeMaterial = (material) => Boolean(
  material && (
    material.type === "YouTube Lecture"
    || material.metadata?.youtube_id
    || /(?:youtube\.com|youtu\.be)/i.test(material.source_url || "")
  )
);
const canUseAsStudySource = (material) => Boolean(
  material && material.status === "Ready"
  && (!isYouTubeMaterial(material) || material.metadata?.academic_context_validated === true)
);

const applyTheme = (name) => {
  const t = THEMES[name] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  const hex = t.accent.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const accentLuminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const contrast = (luminance) => (Math.max(accentLuminance, luminance) + 0.05) / (Math.min(accentLuminance, luminance) + 0.05);
  const accentText = contrast(0.014) >= contrast(1) ? "#20212a" : "#ffffff";
  const luminanceOf = (color) => {
    const values = color.replace("#", "").match(/.{2}/g).map((part) => channel(parseInt(part, 16)));
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  const backgroundLuminance = luminanceOf(t.bg);
  const ensureReadable = (color, background, minimum = 4.5) => {
    const original = color.replace("#", "").match(/.{2}/g).map((part) => parseInt(part, 16));
    const target = backgroundLuminance > 0.45 ? 0 : 255;
    for (let step = 0; step <= 100; step += 1) {
      const amount = step / 100;
      const candidate = original.map((value) => Math.round(value + (target - value) * amount));
      const result = `#${candidate.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
      const l = luminanceOf(result);
      const bg = luminanceOf(background);
      if ((Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05) >= minimum) return result;
    }
    return color;
  };
  const ensureReadableOnSurface = (color, background, minimum = 3) => {
    const original = color.replace("#", "").match(/.{2}/g).map((part) => parseInt(part, 16));
    const bgLuminance = luminanceOf(background);
    const bgContrast = (value) => (Math.max(value, bgLuminance) + 0.05) / (Math.min(value, bgLuminance) + 0.05);
    const sourceLuminance = luminanceOf(color);
    if (bgContrast(sourceLuminance) >= minimum) return color;

    const blackContrast = (bgLuminance + 0.05) / 0.05;
    const whiteContrast = 1.05 / (bgLuminance + 0.05);
    const target = blackContrast > whiteContrast ? 0 : 255;
    for (let step = 1; step <= 100; step += 1) {
      const amount = step / 100;
      const candidate = original.map((value) => Math.round(value + (target - value) * amount));
      const result = `#${candidate.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
      if (bgContrast(luminanceOf(result)) >= minimum) return result;
    }
    return target === 0 ? "#000000" : "#FFFFFF";
  };
  const readableMuted = ensureReadable(ensureReadable(t.muted, t.bg), t.surface);
  const dangerReadable = ensureReadable("#ef4444", t.bg);
  const readableIcon = ensureReadable(t.accent, t.surface, 3);
  const readableHighlight = ensureReadable(t.highlight || t.accent, t.surface, 3);
  const sidebarSurface = t.secondary || t.surface;
  const readableSidebarAccent = ensureReadableOnSurface(t.accent, sidebarSurface, 4.5);
  const sidebarAccentLuminance = luminanceOf(readableSidebarAccent);
  const sidebarAccentText = (sidebarAccentLuminance + 0.05) / 0.05 >= 1.05 / (sidebarAccentLuminance + 0.05)
    ? "#17212A"
    : "#FFFFFF";
  const vars = {
    "--bg": t.bg, "--surface": t.surface,
    "--surface-2": `color-mix(in srgb, ${t.surface} 78%, ${t.fg})`,
    "--surface-3": `color-mix(in srgb, ${t.surface} 88%, ${t.accent})`,
    "--glass-bg": t.glass || `color-mix(in srgb, ${t.surface} 78%, transparent)`,
    "--glass-border": t.border,
    "--accent-glow": t.glow || `color-mix(in srgb, ${t.accent} 38%, transparent)`,
    "--border": t.border, "--border-l": t.border,
    "--fg": t.fg, "--fg-2": readableMuted,
    "--fg-3": readableMuted,
    "--fg-muted": readableMuted, "--accent": t.accent, "--accent-fg": accentText,
    "--danger-readable": dangerReadable, "--icon": readableIcon, "--highlight": readableHighlight,
    "--sidebar-fg": "#F8FAFC", "--sidebar-muted": "#D1DCE6", "--sidebar-subtle": "#B8C7D3",
    "--sidebar-accent": readableSidebarAccent, "--sidebar-accent-fg": sidebarAccentText,
    "--green": t.secondary || t.surface, "--green-l": `color-mix(in srgb, ${t.secondary || t.surface} 76%, ${t.accent})`,
    "--green-fg": t.fg, "--success": "#10b981", "--danger": "#d04735",
    "--danger-bg": "#f8dfd7", "--danger-fg": "#7d3829", "--purple": t.accent,
  };
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.theme = name;

  const favicon = document.getElementById("app-favicon");
  if (favicon) {
    const iconColor = readableIcon;
    const sparkColor = readableHighlight;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${t.bg}"/><g fill="none" stroke="${iconColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 25c6-2.7 12.4-1.8 19 2.6V49c-6.6-4.4-13-5.3-19-2.6V25Z"/><path d="M51 25c-6-2.7-12.4-1.8-19 2.6V49c6.6-4.4 13-5.3 19-2.6V25Z"/><path d="M32 27.5V49"/><path d="m46 11 2.1 5.9L54 19l-5.9 2.1L46 27l-2.1-5.9L38 19l5.9-2.1L46 11Z" fill="${sparkColor}" stroke="${sparkColor}" stroke-width="1.5"/></g><circle cx="17" cy="17" r="1.8" fill="${iconColor}"/><circle cx="54" cy="37" r="1.8" fill="${iconColor}"/></svg>`;
    favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
};

function ThemePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="theme-picker-wrap" ref={pickerRef}>
      <button
        id="theme-picker"
        type="button"
        className="theme-picker"
        aria-label="Select color palette"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="theme-picker-swatch" aria-hidden="true" />
        <span className="theme-picker-value">{value}</span>
        <ChevronDown size={15} className={open ? "theme-picker-chevron is-open" : "theme-picker-chevron"} aria-hidden="true" />
      </button>
      {open && (
        <div className="theme-picker-menu" role="listbox" aria-label="Color palettes">
          {Object.keys(THEMES).map((name) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={value === name}
              className={`theme-picker-option${value === name ? " is-selected" : ""}`}
              onClick={() => { onChange(name); setOpen(false); }}
            >
              <span className="theme-picker-option-dot" aria-hidden="true" />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StudyLaneMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M13 25c6-2.7 12.4-1.8 19 2.6V49c-6.6-4.4-13-5.3-19-2.6V25Z" />
      <path d="M51 25c-6-2.7-12.4-1.8-19 2.6V49c6.6-4.4 13-5.3 19-2.6V25Z" />
      <path d="M32 27.5V49" />
      <path className="emblem-spark" d="m46 11 2.1 5.9L54 19l-5.9 2.1L46 27l-2.1-5.9L38 19l5.9-2.1L46 11Z" />
      <circle cx="17" cy="17" r="1.5" />
      <circle cx="54" cy="37" r="1.5" />
    </svg>
  );
}

const extractYoutubeId = (urlOrId) => {
  if (!urlOrId) return null;
  const match = urlOrId.match(/(?:v=|\/vi\/|embed\/|shorts\/|youtu\.be\/|\/v\/)([0-9A-Za-z_-]{11})/);
  if (match) return match[1];
  if (/^[0-9A-Za-z_-]{11}$/.test(urlOrId.trim())) return urlOrId.trim();
  return null;
};

const parseTimestampSeconds = (tsStr) => {
  if (!tsStr) return 0;
  const match = tsStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return 0;
  if (match[3] !== undefined) {
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
  }
  return parseInt(match[1]) * 60 + parseInt(match[2]);
};

const parseCitationInfo = (citStr) => {
  if (!citStr) return null;
  if (typeof citStr === "object" && citStr.type) return citStr;
  const s = String(citStr).trim();
  const tsMatch = s.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)(?:\])?/);
  if (tsMatch) {
    return {
      type: "timestamp",
      raw: s,
      seconds: parseTimestampSeconds(tsMatch[1]),
      label: tsMatch[1]
    };
  }
  const pageMatch = s.match(/(?:Page|p\.?)\s*(\d+)/i);
  if (pageMatch) {
    return {
      type: "page",
      raw: s,
      target: parseInt(pageMatch[1], 10),
      label: `Page ${pageMatch[1]}`
    };
  }
  const slideMatch = s.match(/(?:Slide|s\.?)\s*(\d+)/i);
  if (slideMatch) {
    return {
      type: "slide",
      raw: s,
      target: parseInt(slideMatch[1], 10),
      label: `Slide ${slideMatch[1]}`
    };
  }
  const secMatch = s.match(/(?:Section|Sec\.?|Part|Paragraph)\s*([0-9A-Za-z.-]+)/i);
  if (secMatch) {
    return {
      type: "section",
      raw: s,
      target: secMatch[1],
      label: `Section ${secMatch[1]}`
    };
  }
  return {
    type: "general",
    raw: s,
    target: s.replace(/^\[|\]$/g, "").trim(),
    label: s.replace(/^\[|\]$/g, "").trim()
  };
};

const resolveTutorCitation = (citation) => {
  if (!citation || typeof citation !== "object") return citation;
  const parsed = parseCitationInfo(citation.reference);
  if (!parsed) return citation;
  return {
    ...parsed,
    source_id: citation.source_id,
    source_name: citation.source_name,
    label: `${citation.source_name || "Source"} — ${parsed.label || citation.reference}`,
  };
};

function DynamicCitation({ citation, onClick, isActive, disabled = false }) {
  const info = parseCitationInfo(citation);
  if (!info) return null;

  const isTs = info.type === "timestamp";
  return (
    <button
      type="button"
      disabled={disabled}
      className={`citation-pill ${isTs ? "timestamp-pill" : ""} ${isActive ? "active-target" : ""}`}
      onClick={() => onClick && onClick(info)}
      title={disabled ? "Reference preview is available after submitting the quiz" : isTs ? `Jump to video at ${info.label}` : `Jump to ${info.label} in Document Preview`}
    >
      {isTs ? <Play size={10} fill="#ef4444" /> : <BookOpen size={10} />}
      <span>{info.label || info.raw}</span>
    </button>
  );
}

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

function NotesRenderer({ data, onCitationClick }) {
  if (!data) return null;
  const list = Array.isArray(data) ? data : [data];
  if (!list.length || (!list[0]?.content && typeof list[0] !== "string")) return null;
  return (
    <div className="render-notes">
      {list.map((n, i) => {
        const contentStr = typeof n === "string" ? n : n.content;
        const citList = Array.from(new Set(
          contentStr.match(/(?:\[(?:(?:Page|Slide|Section|Part)\s*[^\]]+|\d{1,2}:\d{2}(?::\d{2})?)\]|\b(?:Page|Slide)\s+\d+\b)/gi) || []
        ));
        return (
          <article key={i} className="note-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <h4 style={{ margin: 0 }}>{n.style_title || "Study Notes"}</h4>
              {citList.length > 0 && onCitationClick && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                  <small style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>Citations:</small>
                  {citList.slice(0, 6).map((cit, ci) => (
                    <DynamicCitation key={ci} citation={cit} onClick={onCitationClick} />
                  ))}
                </div>
              )}
            </div>
            <Md>{contentStr}</Md>
            {citList.length > 0 && onCitationClick && (
              <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px dashed var(--border)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <small style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}>All Referenced Sources:</small>
                {citList.map((cit, ci) => (
                  <DynamicCitation key={ci} citation={cit} onClick={onCitationClick} />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function FlashcardsRenderer({ data, onReview, onResetMode, onCitationClick }) {
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
          <div className="flip-back">
            <Md>{c.answer || c.back || ""}</Md>
            {c.source_ref && (
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                <DynamicCitation citation={c.source_ref} onClick={onCitationClick} />
              </div>
            )}
          </div>
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

function QuizRenderer({ data, runSubmit, submitting, onResetMode, onCitationClick, citationsEnabled = true }) {
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <b>{i + 1}. {d.question}</b>
                {d.source_ref && (
                  <DynamicCitation citation={d.source_ref} onClick={onCitationClick} disabled={!citationsEnabled} />
                )}
              </div>
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
      options: ev.options || null,
      source_ref: ev.source_ref || null
    }));
  } else {
    qs = data?.questions || (Array.isArray(data) ? data : []);
  }

  if (!qs.length) return <p className="muted">No quiz questions available.</p>;

  return (
    <div className="render-quiz">
      {qs.map((q, i) => (
        <div key={i} className="quiz-q">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
            <b>{i + 1}. {q.question}</b>
            {q.source_ref && (
              <DynamicCitation citation={q.source_ref} onClick={onCitationClick} disabled={!citationsEnabled} />
            )}
          </div>
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
  const [mapColors, setMapColors] = useState({ foreground: "#f1f0ec", background: "#252830" });

  useEffect(() => {
    const syncThemeColors = () => {
      const styles = getComputedStyle(document.documentElement);
      const foreground = styles.getPropertyValue("--fg").trim() || "#f1f0ec";
      const background = styles.getPropertyValue("--surface").trim() || "#252830";
      setMapColors((current) => current.foreground === foreground && current.background === background
        ? current
        : { foreground, background });
    };
    syncThemeColors();
    const observer = new MutationObserver(syncThemeColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

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
          ctx.lineWidth = Math.max(2 / globalScale, 1);
          ctx.strokeStyle = mapColors.background;
          ctx.lineJoin = "round";
          ctx.strokeText(label, node.x, node.y + r + 2);
          ctx.fillStyle = mapColors.foreground;
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
                  border: isCur ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isCur ? 'var(--accent)' : 'var(--surface)',
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
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)', padding: '3px 10px', borderRadius: '12px' }}>
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
          <div style={{ background: 'var(--surface-2)', borderLeft: '3px solid var(--accent)', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', color: 'var(--fg-2)', lineHeight: 1.6 }}>
            {inf.summary}
          </div>
        )}
      </div>

      {/* Sequential Workflow / Steps (when present) */}
      {inf.flow_steps && inf.flow_steps.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <GitBranch size={18} style={{ color: 'var(--accent)' }} />
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
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
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
    setCurrentPlan(p);
    setIsConfiguring(!p);
    setExamDate(p?.exam_date || defaultExamStr);
    setStartDate(p?.start_date || todayStr);
    setDailyHours(p?.daily_hours || 2.0);
  }, [docId, plan]);

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
                <Calendar size={20} style={{ color: 'var(--accent)' }} />
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--fg)' }}>Configure Your Revision Plan</h3>
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
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '13px' }}
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
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '13px' }}
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
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--fg)' }}>
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
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>{t.name}</span>
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
              <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--fg)' }}>{currentPlan.doc_name}</h2>
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
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--fg)' }}>
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
                              color: isDone ? 'var(--fg-3)' : 'var(--fg)',
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
  { id: "infographic", label: "Infographic", desc: "Structured visual concept diagrams, flows, and revision sheets.", icon: LayoutDashboard, generate: (id) => api.generateInfographic(id, "concept_overview"), restore: (id) => api.getInfographic(id).then((result) => result?.data ? result : null) },
  { id: "scheduler", label: "Revision Scheduler", desc: "Build an adaptive revision plan around your exam date and topic priorities.", icon: Calendar, generate: (id) => api.getRevisionPlan(id).then((result) => result?.plan_data || null), restore: (id) => api.getRevisionPlan(id).then((result) => result?.plan_data || null) },
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

  const allSelected = materials && materials.length > 0 && materials.every((material) => selectedSourceIds.includes(material.id));
  const isNoneSelected = selectedSourceIds.length === 0;

  let label = "Select materials";
  if (isNoneSelected) {
    label = "No materials selected";
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
  const [greetingTime, setGreetingTime] = useState(() => new Date());
  const [themeName, setThemeName] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const storedTheme = window.localStorage.getItem("studyverse-theme");
    const savedTheme = storedTheme === "Solarized Dark" ? "Plum Dusk" : storedTheme;
    const defaultVersion = window.localStorage.getItem("studyverse-theme-default-version");
    if (savedTheme === "Sage Study" && defaultVersion !== THEME_DEFAULT_VERSION) return DEFAULT_THEME;
    return THEMES[savedTheme] ? savedTheme : DEFAULT_THEME;
  });
  const [materials, setMaterials] = useState([]);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const sourceSelectionInitialized = useRef(false);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [cache, setCache] = useState({});          // keyed "docId_toolId"
  const [activeVideoModal, setActiveVideoModal] = useState(null); // { material, seconds }
  const [progressData, setProgressData] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setGreetingTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    applyTheme(themeName);
    window.localStorage.setItem("studyverse-theme", themeName);
    window.localStorage.setItem("studyverse-theme-default-version", THEME_DEFAULT_VERSION);
  }, [themeName]);

  const refresh = useCallback(async () => {
    try {
      const [data, chatsData, pData] = await Promise.all([
        api.materials(),
        api.getRecentChats().catch(() => null),
        api.progress().catch(() => null),
      ]);
      setMaterials(data);
      setSelected((prev) => {
        if (prev?.is_chat) return prev;
        if (prev) {
          const refreshed = data.find((material) => material.id === prev.id);
          return canUseAsStudySource(refreshed) ? refreshed : null;
        }
        return data.find(canUseAsStudySource) ?? null;
      });
      if (chatsData) setChats(chatsData);
      if (pData !== undefined) setProgressData(pData);
      setProgressLoading(false);

      const readySourceIds = (data || []).filter(canUseAsStudySource).map((material) => material.id);
      const initializeSelection = !sourceSelectionInitialized.current;
      sourceSelectionInitialized.current = true;
      setSelectedSourceIds((prev) => initializeSelection
        ? readySourceIds
        : prev.filter((id) => readySourceIds.includes(id)));
    } catch (e) { setNotice(e.message); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const hasProcessingUploads = materials.some((material) => material.status === "Processing");
  useEffect(() => {
    if (!hasProcessingUploads) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const data = await api.materials();
        setMaterials(data);
        setSelected((prev) => {
          if (prev?.is_chat) return prev;
          if (prev) {
            const refreshed = data.find((material) => material.id === prev.id);
            return canUseAsStudySource(refreshed) ? refreshed : null;
          }
          return data.find(canUseAsStudySource) ?? null;
        });
        const readySourceIds = data.filter(canUseAsStudySource).map((material) => material.id);
        const initializeSelection = !sourceSelectionInitialized.current;
        sourceSelectionInitialized.current = true;
        setSelectedSourceIds((prev) => initializeSelection
          ? readySourceIds
          : prev.filter((id) => readySourceIds.includes(id)));
      } catch (_) {}
    }, 1500);
    return () => window.clearInterval(timer);
  }, [hasProcessingUploads]);

  const onToggleSource = (id) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSelectAllSources = () => {
    const readyMaterials = materials.filter(canUseAsStudySource);
    if (selectedSourceIds.length === readyMaterials.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(readyMaterials.map((material) => material.id));
    }
  };

  const onDeleteSource = async (id) => {
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

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const response = await api.uploadMany(files);
      const results = response.results || [];
      const succeeded = results.filter((result) => result.success).length;
      const failed = results.filter((result) => !result.success);
      await refresh();
      if (succeeded > 0) {
        setShowUpload(false);
        setView("library");
      }
      if (failed.length) {
        const failedNames = failed.map((result) => result.filename).join(", ");
        setNotice(`${succeeded} of ${files.length} files uploaded and processing. Failed: ${failedNames}`);
      } else {
        setNotice(`${succeeded} ${succeeded === 1 ? "file uploaded" : "files uploaded"}. Extraction is running in the background.`);
      }
    }
    catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  };

  const ingestYoutube = async (url) => {
    setBusy(true);
    try {
      const res = await api.ingestYoutube(url);
      await refresh();
      setShowUpload(false);
      if (res && res.material) {
        setSelected(res.material);
        setSelectedSourceIds([res.material.id]);
      }
      setView("library");
    } catch (e) {
      setNotice(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleCitationClick = (citationText) => {
    const seconds = parseTimestampSeconds(citationText);
    let targetMat = null;
    if (selected && !selected.is_chat) {
      targetMat = selected;
    } else if (selected?.source_doc_id) {
      targetMat = materials.find((m) => m.id === selected.source_doc_id);
    }
    if (!targetMat || (!targetMat.metadata?.youtube_id && !targetMat.source_url)) {
      targetMat = materials.find((m) => m.type === "YouTube Lecture" || m.metadata?.youtube_id || m.source_url);
    }
    if (targetMat) {
      setActiveVideoModal({ material: targetMat, seconds });
    }
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
        <div className="brand"><i><StudyLaneMark className="sidebar-study-mark" /></i>studylane</div>
        <small className="label">YOUR WORKSPACE</small>
        {NAV.map(([id, Icon, label]) => (
          <button key={id} className={`nav${view === id ? " on" : ""}`} onClick={() => handleNavClick(id)}>
            <Icon size={17} />{label}
          </button>
        ))}

        <label className="theme-picker-label" htmlFor="theme-picker">🎨 COLOR PALETTE</label>
        <ThemePicker value={themeName} onChange={setThemeName} />
        
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
              <small style={{display: 'block', padding: '8px 10px', color: 'var(--sidebar-muted)', fontSize: '11px'}}>No recent chats</small>
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
                      <span style={{fontSize: 10, color: 'var(--sidebar-subtle)', paddingLeft: 20, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%'}}>
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
                      color: 'var(--sidebar-subtle)',
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
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--sidebar-subtle)'}
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
            <h1>{view === "home" ? `${getTimeGreeting(greetingTime)}.` : view === "library" ? "Your Library" : view === "studio" ? "Study Studio" : "Your AI Tutor"}</h1>
          </div>
          <div className="header-emblem" role="img" aria-label="StudyLane learning emblem" title="StudyLane">
            <StudyLaneMark />
          </div>
        </header>
        {notice && <div className="notice">{notice}<button className="btn-icon" onClick={() => setNotice("")}><X size={16} /></button></div>}
        {view === "home" && <Home materials={materials} selected={selected} choose={setSelected} go={setView} upload={() => setShowUpload(true)} progressData={progressData} progressLoading={progressLoading} />}
        {view === "library" && (
          <Library
            materials={materials}
            selected={selected}
            choose={setSelected}
            refresh={refresh}
            warn={setNotice}
            upload={() => setShowUpload(true)}
            onOpenVideo={(mat) => setActiveVideoModal({ material: mat, seconds: 0 })}
          />
        )}
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
            refresh={refresh}
            onOpenVideo={(mat, secs) => setActiveVideoModal({ material: mat, seconds: secs || 0 })}
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
            onOpenVideo={(mat, secs) => setActiveVideoModal({ material: mat, seconds: secs || 0 })}
          />
        )}
      </main>

      {showUpload && (
        <UploadModal
          busy={busy}
          close={() => setShowUpload(false)}
          choose={() => fileRef.current.click()}
          sample={async () => {
            setBusy(true);
            try {
              await api.sample();
              await refresh();
              setShowUpload(false);
              setView("library");
            } catch (e) {
              setNotice(e.message);
            } finally {
              setBusy(false);
            }
          }}
          onIngestYoutube={ingestYoutube}
        />
      )}

      {activeVideoModal && (
        <VideoPlayerModal
          material={activeVideoModal.material}
          initialSeconds={activeVideoModal.seconds || 0}
          onClose={() => setActiveVideoModal(null)}
        />
      )}

      <input
        className="hidden"
        ref={fileRef}
        type="file"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          upload(files);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */

function Home({ materials, selected, choose, go, upload, progressData, progressLoading }) {
  return (
    <section className="page overview-page">
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
        <div className="overview-side">
          <OverviewClock />
          <div className="overview-material-count"><FileText size={15} />{materials.length} {materials.length === 1 ? "material" : "materials"} ready to study</div>
        </div>
      </div>

      <SectionTitle title="Learning Progress" />
      <div style={{ marginBottom: "2.5rem" }}>
        {progressLoading ? (
          <div className="empty" style={{ minHeight: '120px' }}><LoaderCircle className="spin" /> Loading analytics...</div>
        ) : !progressData || (!progressData.total_quizzes && Object.keys(progressData.topic_mastery || {}).length === 0) ? (
          <div className="empty" style={{ minHeight: '120px' }}>No progress data yet. Take a quiz to see your mastery!</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Overall Stats Card */}
            <div className="overview-stat-card" style={{ padding: '1.5rem', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <small className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>OVERALL ACTIVITY</small>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{progressData.total_quizzes} Quizzes Taken</h3>
              <p style={{ color: 'var(--fg-2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Average Score: {progressData.average_quiz_score}%</p>
              
              {progressData.recommended_activity && (
                <div className="overview-recommendation" style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--accent)' }}>
                  <b style={{ color: 'var(--accent)', fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem' }}>{progressData.recommended_activity.activity}</b>
                  <small style={{ color: 'var(--fg-2)', lineHeight: 1.4, display: 'block' }}>{progressData.recommended_activity.reason}</small>
                </div>
              )}
            </div>
            
            {/* Topic Mastery Card */}
            <div className="overview-mastery-card" style={{ padding: '1.5rem', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
              <small className="label" style={{ marginBottom: '1rem', display: 'block' }}>TOPIC MASTERY</small>
              {Object.keys(progressData.topic_mastery || {}).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.entries(progressData.topic_mastery).map(([topic, data]) => (
                    <div key={topic} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>{topic}</strong>
                        <small style={{ color: 'var(--fg-3)' }}>{data.attempts} attempt{data.attempts !== 1 ? 's' : ''}</small>
                      </div>
                      <div style={{ flex: 1, padding: '0 1.5rem' }}>
                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${data.average_score}%`, 
                            height: '100%', 
                            background: data.status === 'Review Recommended' ? 'var(--rating-again)' : data.status === 'Mastered' ? 'var(--rating-know)' : 'var(--accent)', 
                            transition: 'width 0.3s ease' 
                          }} />
                        </div>
                      </div>
                      <div style={{ width: '120px', textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          color: data.status === 'Review Recommended' ? 'var(--rating-again)' : data.status === 'Mastered' ? 'var(--rating-know)' : 'var(--fg-2)' 
                        }}>
                          {data.status} ({data.average_score}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty" style={{ minHeight: '80px', margin: 0 }}>No topic data available.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <SectionTitle title="Recent materials" action={() => go("library")} />
      {materials.length ? (
        <div className="grid">
          {materials.slice(0, 3).map((m) => (
            <button key={m.id} className={`material${selected?.id === m.id ? " selected" : ""}${m.status === "Processing" ? " is-processing" : ""}`} disabled={!canUseAsStudySource(m)} onClick={() => choose(m)} title={!canUseAsStudySource(m) ? "This material is unavailable to study tools" : undefined}>
              <FileIcon type={m.type} /><span><b>{m.name}</b><small>{m.type} · {m.status === "Processing" ? "Extracting text…" : isYouTubeMaterial(m) && m.metadata?.academic_context_validated !== true ? "Re-add to validate academic content" : `${m.size_kb} KB`}</small></span>{m.status === "Processing" ? <LoaderCircle size={16} className="spin" /> : <ChevronRight size={17} />}
            </button>
          ))}
        </div>
      ) : <EmptyState upload={upload} />}
    </section>
  );
}

function OverviewClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="overview-widget clock-widget">
      <div className="overview-widget-label"><Clock size={15} /> LOCAL TIME</div>
      <time className="overview-clock-time" dateTime={now.toISOString()}>
        {new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)}
      </time>
      <div className="overview-clock-date">
        {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(now)}
      </div>
    </div>
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
function FileIcon({ type }) {
  if (type === "YouTube Lecture" || type === "Video Lecture") {
    return (
      <i className="file video" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
        <Video size={19} />
      </i>
    );
  }
  return <i className="file"><BookOpen size={19} /></i>;
}
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

function Library({ materials, selected, choose, refresh, warn, upload, onOpenVideo }) {
  const remove = async (m) => {
    try { await api.remove(m.id); await refresh(); } catch (e) { warn(e.message); }
  };
  return (
    <section className="page library-page">
      <div className="intro">
        <p>Everything you add lives here. Choose one to make it your active study source.</p>
        <button className="btn-primary" onClick={upload}><Plus size={17} />Add material</button>
      </div>
      {materials.length ? (
        <div className="list">
          {materials.map((m) => {
            const isYt = isYouTubeMaterial(m);
            const canStudy = canUseAsStudySource(m);
            const academicBlocked = isYt && m.metadata?.academic_context_validated !== true;
            return (
              <article
                key={m.id}
                onClick={() => canStudy && choose(m)}
                title={academicBlocked ? "Re-add this video to check whether it meets the academic-content requirements." : undefined}
                className={`${selected?.id === m.id ? "selected" : ""}${m.status === "Processing" ? " is-processing" : ""}${!canStudy && m.status !== "Processing" ? " is-unavailable" : ""}`}
              >
                <FileIcon type={m.type} />
                <span className="name">
                  <b>{m.name}</b>
                  <small>{m.type} · uploaded {m.upload_time}</small>
                </span>
                {isYt && canStudy && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      color: '#ef4444',
                      fontSize: 12,
                      padding: '4px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 6,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.08)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenVideo && onOpenVideo(m);
                    }}
                    title="Watch video & view timestamped transcript"
                  >
                    <Play size={12} fill="#ef4444" /> Watch & Transcripts
                  </button>
                )}
                <i className={`status ${academicBlocked ? "error" : m.status?.toLowerCase()}`}>
                  {m.status === "Processing" && <LoaderCircle size={12} className="spin" />}
                  {academicBlocked ? "Re-add to validate" : m.status}
                </i>
                <small className="size">{m.size_kb} KB</small>
                <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); remove(m); }}><Trash2 size={17} /></button>
              </article>
            );
          })}
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
  onDeleteSource,
  refresh,
  onOpenVideo
}) {
  const [mode, setMode] = useState(null); // Null = Landing Overview
  const [busy, setBusy] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [targetCitation, setTargetCitation] = useState(null);

  const activeSourceMaterials = (materials || []).filter((material) =>
    selectedSourceIds.includes(material.id) && canUseAsStudySource(material)
  );
  const activeMaterial = activeSourceMaterials[0] || null;
  const activeDocId = activeSourceMaterials.map((material) => material.id).join(",") || null;

  const tool = mode ? TOOLS.find((t) => t.id === mode) : null;
  const ToolIcon = tool?.icon;
  const ck = activeDocId && mode ? `${activeDocId}_${mode}` : null;
  const result = ck ? cache[ck] ?? undefined : undefined;
  const quizSubmitted = mode === "quiz" && Array.isArray(result) && result.length > 0 && result[0]?.score !== undefined;
  const previewVisible = showPreview && (mode !== "quiz" || quizSubmitted);

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
      const res = mode === "quiz"
        ? await api.generateQuiz(activeDocId, quizQuestionCount, quizDifficulty)
        : await tool.generate(activeDocId);
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

  const handleCitationClick = (citationObj) => {
    const cit = typeof citationObj === "string" ? parseCitationInfo(citationObj) : citationObj;
    if (!cit) return;
    if (cit.type === "timestamp") {
      if (onOpenVideo && activeMaterial) {
        onOpenVideo(activeMaterial, cit.seconds);
      }
    } else {
      setShowPreview(true);
      setTargetCitation(cit);
    }
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
      if (refresh) await refresh();
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
      <Brain size={18} style={{color: 'var(--icon)', flexShrink: 0}} />
      <small style={{fontWeight: 600, letterSpacing: '0.05em', color: 'var(--fg-3)'}}>ACTIVE SOURCE MATERIAL</small>
      
      <SourceSelectDropdown
        materials={materials.filter(canUseAsStudySource)}
        selectedSourceIds={selectedSourceIds}
        onToggleSource={onToggleSource}
        onSelectAll={onSelectAllSources}
        onDeleteSource={onDeleteSource}
      />

      {mode && activeMaterial && (mode !== "quiz" || quizSubmitted) && (
        <button
          className={`preview-toggle-btn ${previewVisible ? "active" : ""}`}
          onClick={() => setShowPreview(!showPreview)}
          style={{ marginLeft: "auto" }}
          title={previewVisible ? "Hide Reference Preview" : "Show Reference Preview"}
        >
          {previewVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{previewVisible ? "Hide Reference Preview" : "Show Reference Preview"}</span>
        </button>
      )}
    </div>
  );

  // Render Landing Page
  if (!mode) {
    return (
      <section className="page studio-page studio-landing">
        {renderSourcePicker()}
        <div className="landing-hero" style={{textAlign:'center', padding: '60px 20px'}}>
          <WandSparkles size={48} style={{color:'var(--accent)', marginBottom: 20}} />
          <h2 style={{fontSize: 32, marginBottom: 10, letterSpacing: '-1px'}}>Study Studio</h2>
          <p style={{color: 'var(--fg-2)', maxWidth: 400, margin: '0 auto 40px'}}>
            {activeMaterial 
              ? `Select a tool below to generate study material from "${activeMaterial.name}".`
              : "Please select or upload a material in your Library first."}
          </p>
          <div className="studio-marquee" aria-label="Study tools: Smart Notes, Flashcards, Practice Quiz, Knowledge Map, Infographic, Revision Scheduler">
            <div className="studio-marquee-track" aria-hidden="true">
              {[0, 1].map((copy) => (
                <span className="studio-marquee-set" key={copy}>
                  <b>✳ SMART NOTES</b><i>✦</i><b>↻ FLASHCARDS</b><i>✦</i><b>✓ PRACTICE QUIZ</b><i>✦</i><b>⌘ KNOWLEDGE MAP</b><i>✦</i><b>▧ INFOGRAPHIC</b><i>✦</i><b>◷ REVISION SCHEDULE</b><i>✦</i>
                </span>
              ))}
            </div>
          </div>
          <div className="tool-grid" style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto'}}>
            {TOOLS.map(t => {
              const TIcon = t.icon;
              return (
                <button 
                  key={t.id} 
                  className="tool-card"
                  disabled={!activeDocId}
                  onClick={() => setMode(t.id)}
                  style={{background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'left', transition: 'border-color 0.2s, transform 0.1s', cursor: activeDocId ? 'pointer' : 'not-allowed'}}
                >
                  <TIcon size={24} strokeWidth={2.2} style={{color: 'var(--icon)', marginBottom: 16}} />
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

  // Render specific tool with split preview layout
  return (
    <section className={`page studio-page ${previewVisible ? "preview-split-layout full-width" : ""}`}>
      <div className={previewVisible ? "preview-split-main" : ""}>
        {renderSourcePicker()}

        <div className="studio tool-active-layout" style={{display: 'block', padding: '36px 40px'}}>
          <div className="work" style={{maxWidth: '100%', padding: 0}}>
            <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <div>
                <small className="label" style={{margin: '0 0 10px'}}>STUDY STUDIO</small>
                <h2 style={{margin: 0, display:'flex', alignItems:'center', gap: 10}}><ToolIcon size={28} />{tool.label}</h2>
                <p>{tool.desc}</p>
                {mode === "quiz" && (
                  <div className="quiz-config" aria-label="Quiz settings">
                    <div className="quiz-config-group" role="group" aria-label="Difficulty">
                      <span className="quiz-config-label">Difficulty</span>
                      {["easy", "medium", "hard"].map((difficulty) => (
                        <button
                          key={difficulty}
                          type="button"
                          className={`quiz-choice${quizDifficulty === difficulty ? " active" : ""}`}
                          aria-pressed={quizDifficulty === difficulty}
                          onClick={() => setQuizDifficulty(difficulty)}
                        >{difficulty[0].toUpperCase() + difficulty.slice(1)}</button>
                      ))}
                    </div>
                    <div className="quiz-config-group" role="group" aria-label="Number of questions">
                      <span className="quiz-config-label">Questions</span>
                      {[5, 10, 15].map((count) => (
                        <button
                          key={count}
                          type="button"
                          className={`quiz-choice${quizQuestionCount === count ? " active" : ""}`}
                          aria-pressed={quizQuestionCount === count}
                          onClick={() => setQuizQuestionCount(count)}
                        >{count}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="work-actions">
                {!hasResult && mode !== "scheduler" && (
                  <button className="btn-primary" disabled={!activeDocId || busy} onClick={generate}>
                    {busy ? <><LoaderCircle className="spin" size={16} /> Generating…</> : <><WandSparkles size={16} /> Create {tool.label.toLowerCase()}</>}
                  </button>
                )}
                {hasResult && mode !== "scheduler" && (
                  <button className="btn-secondary" disabled={busy} onClick={regenerate}>
                    {busy ? <><LoaderCircle className="spin" size={15} /> Regenerating…</> : <><RefreshCw size={15} /> Regenerate</>}
                  </button>
                )}
              </div>
            </div>

            {error && <div className="error-box"><XCircle size={15} /> {error}</div>}

            <div className="render-area" style={{marginTop: 30}}>
              {busy && !hasResult && <div className="loader-block"><LoaderCircle className="spin" size={28} /><p>Generating your study materials…</p></div>}
              {mode === "notes" && <NotesRenderer data={result} onCitationClick={handleCitationClick} />}
              {mode === "cards" && <FlashcardsRenderer data={result} onReview={reviewCard} onResetMode={() => setMode(null)} onCitationClick={handleCitationClick} />}
              {mode === "quiz" && <QuizRenderer data={result} runSubmit={submitQuiz} submitting={busy} onResetMode={() => setMode(null)} onCitationClick={handleCitationClick} citationsEnabled={quizSubmitted} />}
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
                      const generated = await api.generateInfographic(activeDocId, chosenType);
                      setCache((current) => ({ ...current, [ck]: generated }));
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
                  onSavePlan={(updated) => setCache((current) => ({ ...current, [ck]: updated }))}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {previewVisible && activeMaterial && (
        <DocumentPreviewPanel
          material={activeMaterial}
          targetCitation={targetCitation}
          onClose={() => setShowPreview(false)}
          onOpenVideo={onOpenVideo}
        />
      )}
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
  onDeleteSource,
  onOpenVideo
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tutorMode, setTutorMode] = useState("teaching");
  const [clearing, setClearing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [targetCitation, setTargetCitation] = useState(null);
  const scrollRef = useRef(null);

  const activeSourceMaterials = (materials || []).filter((material) =>
    selectedSourceIds.includes(material.id) && canUseAsStudySource(material)
  );
  const activeMaterial = activeSourceMaterials[0] || null;
  const activeDocId = activeSourceMaterials.map((material) => material.id).join(",") || null;

  useEffect(() => {
    let live = true;
    if (selected) {
      api.getTutorHistory(selected.id).then((hist) => {
        if (live && Array.isArray(hist)) {
          setMessages(hist.map((h) => [
            h.role === "user" ? "You" : "Study tutor",
            h.content,
            h.role === "user" ? "you" : "",
            h.citations ? (typeof h.citations === "string" ? JSON.parse(h.citations) : h.citations).map(resolveTutorCitation) : []
          ]));
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

  const handleCitationClick = (citationObj) => {
    const cit = typeof citationObj === "string" ? parseCitationInfo(citationObj) : citationObj;
    if (!cit) return;
    if (cit.type === "timestamp") {
      let targetMat = (cit.source_id && materials.find((material) => material.id === cit.source_id)) || activeMaterial;
      if (!targetMat || (!targetMat.metadata?.youtube_id && !targetMat.source_url)) {
        targetMat = materials.find((m) => m.type === "YouTube Lecture" || m.metadata?.youtube_id || m.source_url);
      }
      if (onOpenVideo && targetMat) {
        onOpenVideo(targetMat, cit.seconds);
      }
    } else {
      setShowPreview(true);
      setTargetCitation(cit);
    }
  };

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

  const submit = async (e) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    
    const currentSelected = selected || { id: "chat_" + Date.now(), name: "New Chat", is_chat: true };
    const q = input;
    setInput("");
    setMessages((x) => [...x, ["You", q, "you"]]);
    setBusy(true);
    try {
      const sourceDocId = selectedSourceIds.join(",");
      if (!sourceDocId) {
        setMessages((x) => [...x, ["System", "Select at least one study material before asking the tutor.", "error"]]);
        setBusy(false);
        return;
      }
      const r = await api.tutor(currentSelected.id, q, "intermediate", sourceDocId, tutorMode);
      const answerText = r.response || r.answer || r.content || text(r);
      const citList = (r.citations && r.citations.length) ? r.citations : Array.from(new Set(answerText.match(/\[(?:(?:Page|Slide|Section|Part)\s*[^\]]+|\d{1,2}:\d{2}(?::\d{2})?)\]/gi) || []));
      const sourceCitations = (r.citation_sources || []).map(resolveTutorCitation);
      setMessages((x) => [...x, ["Study tutor", answerText, "", citList, sourceCitations]]);
      if (refreshChats) refreshChats();
    } catch (err) {
      setMessages((x) => [...x, ["System", "Error: " + err.message, "error"]]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`page tutor-page ${showPreview ? "preview-split-layout full-width" : ""}`}>
      <div className={showPreview ? "preview-split-main" : ""}>
        {/* Active-document indicator & In-Chat Source Picker */}
        <div className="source" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px', flex:'1 1 320px', minWidth: 0, flexWrap:'wrap'}}>
      <Brain size={18} style={{color: 'var(--icon)', flexShrink: 0}} />
            <small style={{fontWeight: 600, letterSpacing: '0.05em', color: 'var(--fg-3)'}}>GROUNDING ANSWERS IN</small>
            
            <SourceSelectDropdown
              materials={materials.filter(canUseAsStudySource)}
              selectedSourceIds={selectedSourceIds}
              onToggleSource={onToggleSource}
              onSelectAll={onSelectAllSources}
              onDeleteSource={onDeleteSource}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {activeMaterial && (
              <button
                className={`preview-toggle-btn ${showPreview ? "active" : ""}`}
                onClick={() => setShowPreview(!showPreview)}
                title={showPreview ? "Hide Reference Preview" : "Show Reference Preview"}
              >
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPreview ? "Hide Reference Preview" : "Show Reference Preview"}</span>
              </button>
            )}

            {messages.length > 0 && (
              <button className="btn-ghost" disabled={busy || clearing} onClick={clearChat}>
                <Trash2 size={16} /> Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="chat-container" ref={scrollRef}>
          {messages.length ? messages.map((m, i) => {
            const citList = Array.isArray(m[4]) && m[4].length ? m[4] : (Array.isArray(m[3]) && m[3].length ? m[3].map(resolveTutorCitation) : (m[2] !== "you" ? Array.from(new Set(String(m[1]).match(/\[(?:(?:Page|Slide|Section|Part)\s*[^\]]+|\d{1,2}:\d{2}(?::\d{2})?)\]/gi) || [])) : []));
            return (
              <div key={i} className={`msg ${m[2]}`}>
                <small>{m[0]}</small>
                <div className="msg-body">
                  <Md>{m[1]}</Md>
                  {citList.length > 0 && m[2] !== "you" && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <small style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>Sources:</small>
                      {citList.map((cit, ci) => (
                        <DynamicCitation
                          key={ci}
                          citation={cit}
                          onClick={handleCitationClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="chat-empty">
              <MessageCircle size={32} />
              <h2>What are you working through?</h2>
              <p>Ask for an explanation, a memory trick, or a step-by-step walkthrough.</p>
            </div>
          )}
          {busy && <div className="msg"><small>Study tutor</small><p className="typing"><LoaderCircle className="spin" size={14} /> Thinking…</p></div>}
        </div>

        <div className="tutor-mode-picker" role="group" aria-label="Tutor mode">
          <span>Mode</span>
          <button
            type="button"
            className={`tutor-mode-option ${tutorMode === "teaching" ? "active" : ""}`}
            aria-pressed={tutorMode === "teaching"}
            onClick={() => setTutorMode("teaching")}
          >
            Teaching
          </button>
          <button
            type="button"
            className={`tutor-mode-option ${tutorMode === "learning" ? "active" : ""}`}
            aria-pressed={tutorMode === "learning"}
            onClick={() => setTutorMode("learning")}
          >
            Learning
          </button>
          <small>{tutorMode === "learning" ? "Hints and questions help you reach the answer." : "Get a direct explanation and examples."}</small>
        </div>

        <form className="chat-input" onSubmit={submit}>
          <input disabled={busy} value={input} onChange={(e) => setInput(e.target.value)} placeholder={tutorMode === "learning" ? "Share a question or your attempt..." : "Ask your AI Tutor anything..."} />
          <button className="btn-send" disabled={busy || !input.trim()} type="submit"><Send size={18} /></button>
        </form>
      </div>

      {showPreview && activeMaterial && (
        <DocumentPreviewPanel
          material={(targetCitation?.source_id && materials.find((material) => material.id === targetCitation.source_id)) || activeMaterial}
          targetCitation={targetCitation}
          onClose={() => setShowPreview(false)}
          onOpenVideo={onOpenVideo}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Document Preview Panel (Right Side for Studio & AI Tutor)         */
/* ------------------------------------------------------------------ */

function DocumentPreviewPanel({
  material,
  targetCitation,
  onClose,
  onOpenVideo
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [videoSeek, setVideoSeek] = useState(0);
  const [viewMode, setViewMode] = useState("auto"); // "auto", "native", "text"
  const [pdfAvailable, setPdfAvailable] = useState(true);
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const [reuploadError, setReuploadError] = useState("");
  const reuploadRef = useRef(null);
  const contentRef = useRef(null);

  const isPDF = material?.name?.toLowerCase().endsWith(".pdf") || material?.type === "PDF Document";
  const youtubeId = material?.metadata?.youtube_id || extractYoutubeId(material?.source_url) || extractYoutubeId(material?.id);
  const isYouTube = material?.type === "YouTube Lecture" || !!youtubeId;
  const rawFileUrl = material?.id ? api.materialFileUrl(material.id) : null;

  // Check if original PDF file exists on server
  useEffect(() => {
    if (material?.id && isPDF) {
      fetch(api.materialFileUrl(material.id), { method: "HEAD" })
        .then((res) => {
          setPdfAvailable(res.ok);
        })
        .catch(() => {
          setPdfAvailable(false);
        });
    }
  }, [material?.id, isPDF]);

  // Track target citation changes
  useEffect(() => {
    if (!targetCitation) return;
    if (targetCitation.type === "timestamp" && isYouTube) {
      setVideoSeek(targetCitation.seconds || 0);
    }
  }, [targetCitation, isYouTube]);

  // Parse sections/units/pages from content for text fallback and search
  const sections = [];
  if (material?.content) {
    const raw = material.content;
    const parts = raw.split(/(?=---\s*\[(?:Page|Slide|Part|Section)\s*\d+[^\]]*\]\s*---)/gi);
    if (parts.length > 1) {
      parts.forEach((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return;
        const headerMatch = trimmed.match(/^---\s*\[((?:Page|Slide|Part|Section)\s*\d+[^\]]*)\]\s*---\s*/i);
        if (headerMatch) {
          sections.push({
            id: `sec-${idx}`,
            label: headerMatch[1],
            text: trimmed.replace(/^---\s*\[(?:Page|Slide|Part|Section)\s*\d+[^\]]*\]\s*---\s*/i, "").trim()
          });
        } else {
          sections.push({
            id: `sec-${idx}`,
            label: `Section ${idx + 1}`,
            text: trimmed
          });
        }
      });
    } else {
      // Split by paragraphs
      const paras = raw.split(/\n\s*\n/);
      paras.forEach((p, idx) => {
        const trimmed = p.trim();
        if (trimmed) {
          sections.push({
            id: `para-${idx + 1}`,
            label: `Paragraph ${idx + 1}`,
            text: trimmed
          });
        }
      });
    }
  }

  // Auto-scroll to citation target when in text mode
  useEffect(() => {
    if (!targetCitation) return;
    const timeout = setTimeout(() => {
      let el = null;
      if (targetCitation.type === "page" || targetCitation.type === "slide") {
        const idRegex = new RegExp(`(?:Page|Slide)\\s*${targetCitation.target}`, "i");
        el = Array.from(contentRef.current?.querySelectorAll(".preview-section-card") || []).find((card) =>
          idRegex.test(card.getAttribute("data-label") || "")
        );
      } else if (targetCitation.type === "section") {
        el = Array.from(contentRef.current?.querySelectorAll(".preview-section-card") || []).find((card) =>
          String(card.getAttribute("data-label") || "").toLowerCase().includes(String(targetCitation.target).toLowerCase())
        );
      }
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [targetCitation, viewMode]);

  const filteredSections = sections.filter((s) => {
    if (!searchTerm) return true;
    const st = searchTerm.toLowerCase();
    return s.label.toLowerCase().includes(st) || s.text.toLowerCase().includes(st);
  });

  // Calculate PDF iframe target with page anchor
  let pdfPageParam = "";
  if (targetCitation && (targetCitation.type === "page" || targetCitation.type === "slide")) {
    pdfPageParam = `#page=${targetCitation.target}`;
  }

  const effectiveView = viewMode === "auto" ? (isPDF ? "native" : isYouTube ? "video" : "text") : viewMode;

  return (
    <aside className="preview-split-panel" aria-label="Reference Document Preview">
      <div className="preview-panel-header">
        <div className="preview-panel-title">
          {isYouTube ? (
            <Video size={17} style={{ color: "#ef4444", flexShrink: 0 }} />
          ) : isPDF ? (
            <BookOpen size={17} style={{ color: "var(--green)", flexShrink: 0 }} />
          ) : (
            <FileText size={17} style={{ color: "var(--green)", flexShrink: 0 }} />
          )}
          <span title={material?.name || "Study Material"}>
            {material?.name || "No material loaded"}
          </span>
          <small>{material?.unit_name ? `${material.total_units || 1} ${material.unit_name}` : material?.type || "Document"}</small>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* View Mode Switcher if document is PDF */}
          {isPDF && (
            <div style={{ display: "flex", background: "var(--surface-3)", borderRadius: 6, padding: 2 }}>
              <button
                className={`btn-ghost ${effectiveView === "native" ? "active" : ""}`}
                style={{ padding: "2px 7px", fontSize: 10, fontWeight: 700, borderRadius: 4, background: effectiveView === "native" ? "#fff" : "transparent" }}
                onClick={() => setViewMode("native")}
                title="View original PDF document"
              >
                PDF
              </button>
              <button
                className={`btn-ghost ${effectiveView === "text" ? "active" : ""}`}
                style={{ padding: "2px 7px", fontSize: 10, fontWeight: 700, borderRadius: 4, background: effectiveView === "text" ? "#fff" : "transparent" }}
                onClick={() => setViewMode("text")}
                title="View parsed text & sections"
              >
                Text
              </button>
            </div>
          )}

          {isYouTube && onOpenVideo && (
            <button
              className="preview-toggle-btn"
              style={{ padding: "3px 7px", fontSize: 11, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
              onClick={() => onOpenVideo(material, videoSeek)}
              title="Pop out video player modal"
            >
              <ExternalLink size={12} /> Expand
            </button>
          )}

          <button className="btn-icon" onClick={onClose} title="Close Preview Panel">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Target Citation Banner */}
      {targetCitation && (
        <div style={{ padding: "8px 16px", background: "#fef3c7", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#92400e", fontWeight: 600 }}>
            <CornerDownRight size={13} /> {targetCitation.type === "timestamp" ? `Playing at ${targetCitation.label}` : `Navigated to ${targetCitation.label}`}
          </span>
          {targetCitation.type === "timestamp" && isYouTube && (
            <span style={{ color: "#b45309", fontSize: 11, fontWeight: 700 }}>
              Live in Player
            </span>
          )}
        </div>
      )}

      {/* 1. Native Video Player in Preview Panel */}
      {effectiveView === "video" && isYouTube && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, background: "#000", flexShrink: 0 }}>
            {youtubeId ? (
              <iframe
                key={videoSeek}
                src={`https://www.youtube.com/embed/${youtubeId}?start=${videoSeek}&autoplay=1`}
                title={material?.name || "YouTube Lecture"}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff" }}>
                Video unavailable
              </div>
            )}
          </div>

          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <small style={{ fontWeight: 700, color: "var(--fg-3)" }}>TIMESTAMPED TRANSCRIPT</small>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={12} style={{ color: "var(--fg-3)" }} />
              <input
                type="text"
                placeholder="Filter transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}
              />
            </div>
          </div>

          <div className="preview-panel-body" style={{ flex: 1, padding: 12 }}>
            {sections.filter(s => !searchTerm || s.text.toLowerCase().includes(searchTerm.toLowerCase())).map((sec, idx) => {
              const tsMatch = sec.label.match(/\d{1,2}:\d{2}/) || sec.text.match(/\[(\d{1,2}:\d{2})\]/);
              const tsSecs = tsMatch ? parseTimestampSeconds(tsMatch[1] || tsMatch[0]) : 0;
              const isCurrent = targetCitation?.type === "timestamp" && Math.abs(targetCitation.seconds - tsSecs) < 15;

              return (
                <div
                  key={idx}
                  className={`preview-section-card ${isCurrent ? "highlighted" : ""}`}
                  style={{ padding: "8px 12px", marginBottom: 8, cursor: "pointer" }}
                  onClick={() => {
                    setVideoSeek(tsSecs);
                  }}
                  title="Click to jump video to this timestamp"
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="preview-section-badge yt-badge">
                      <Play size={10} fill="#dc2626" /> {tsMatch ? (tsMatch[1] || tsMatch[0]) : sec.label}
                    </span>
                    {isCurrent && <span className="preview-badge-cit">Active</span>}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg)" }}>
                    {sec.text.replace(/^\[\d{1,2}:\d{2}\]\s*/, "")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Original Form PDF View directly in Preview Panel */}
      {effectiveView === "native" && isPDF && (
        <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
          {pdfAvailable && rawFileUrl ? (
            <object
              key={`${material.id}_${pdfPageParam}`}
              data={`${rawFileUrl}${pdfPageParam}`}
              type="application/pdf"
              style={{ width: "100%", height: "100%", border: 0, flex: 1 }}
            >
              <iframe
                src={`${rawFileUrl}${pdfPageParam}`}
                title={material.name}
                style={{ width: "100%", height: "100%", border: 0, flex: 1 }}
              />
            </object>
          ) : (
            /* ── Re-upload prompt for older materials that lack a saved binary ── */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: "100%", gap: 16, padding: 24, textAlign: "center"
            }}>
              {/* Hidden file input */}
              <input
                ref={reuploadRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f || !material?.id) return;
                  setReuploadLoading(true);
                  setReuploadError("");
                  try {
                    await api.reuploadMaterial(material.id, f);
                    setPdfAvailable(true);
                  } catch (err) {
                    setReuploadError(err.message || "Upload failed. Please try again.");
                  } finally {
                    setReuploadLoading(false);
                    // Reset the input so the same file can be re-selected if needed
                    if (reuploadRef.current) reuploadRef.current.value = "";
                  }
                }}
              />
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <FileText size={28} style={{ color: "var(--fg-3)" }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Native preview unavailable</p>
                <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.6, maxWidth: 260 }}>
                  This file was uploaded before native preview was enabled. Re-upload the same PDF to view it inline here — your notes and progress are kept.
                </p>
              </div>
              {reuploadError && (
                <p style={{ fontSize: 12, color: "var(--red, #ef4444)", margin: 0 }}>{reuploadError}</p>
              )}
              <div style={{ display: "flex", gap: 8, flexDirection: "column", width: "100%", maxWidth: 240 }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", gap: 6 }}
                  disabled={reuploadLoading}
                  onClick={() => reuploadRef.current?.click()}
                >
                  {reuploadLoading ? (
                    <><LoaderCircle size={14} className="spin" /> Uploading…</>
                  ) : (
                    <><Upload size={14} /> Re-upload PDF</>
                  )}
                </button>
                <button
                  className="btn-ghost"
                  style={{ width: "100%", justifyContent: "center", fontSize: 12, color: "var(--fg-3)" }}
                  onClick={() => setViewMode("text")}
                >
                  View extracted text instead
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Parsed Text / Sections View */}
      {effectiveView === "text" && (
        <>
          <div className="preview-panel-search">
            <Search size={14} style={{ color: "var(--fg-3)" }} />
            <input
              type="text"
              placeholder="Search in reference material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="btn-icon" style={{ padding: 2 }} onClick={() => setSearchTerm("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="preview-panel-body" ref={contentRef}>
            {!material ? (
              <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>No reference material selected.</p>
            ) : filteredSections.length > 0 ? (
              filteredSections.map((sec) => {
                let isTarget = false;
                if (targetCitation) {
                  if (targetCitation.type === "page" || targetCitation.type === "slide") {
                    const pat = new RegExp(`(?:Page|Slide)\\s*${targetCitation.target}`, "i");
                    isTarget = pat.test(sec.label);
                  } else if (targetCitation.type === "section") {
                    isTarget = sec.label.toLowerCase().includes(String(targetCitation.target).toLowerCase());
                  }
                }

                return (
                  <div
                    key={sec.id}
                    className={`preview-section-card ${isTarget ? "highlighted" : ""}`}
                    data-label={sec.label}
                  >
                    <div className="preview-section-header">
                      <span className="preview-section-badge">{sec.label}</span>
                      {isTarget && (
                        <span className="preview-badge-cit">
                          <Sparkles size={11} /> Cited Section
                        </span>
                      )}
                    </div>
                    <div className="preview-section-content">
                      {sec.text}
                    </div>
                  </div>
                );
              })
            ) : material.content ? (
              <div className="preview-section-card">
                <div className="preview-section-content" style={{ whiteSpace: "pre-wrap" }}>
                  {material.content}
                </div>
              </div>
            ) : (
              <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>
                {searchTerm ? "No matching text found." : "Document content is empty."}
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive Video Player Modal                                     */
/* ------------------------------------------------------------------ */

function VideoPlayerModal({ material, initialSeconds = 0, onClose }) {
  const [seekTime, setSeekTime] = useState(initialSeconds);
  const [search, setSearch] = useState("");
  const youtubeId = material?.metadata?.youtube_id || extractYoutubeId(material?.source_url) || extractYoutubeId(material?.id);

  let segments = material?.metadata?.segments || [];
  if ((!segments || !segments.length) && material?.content) {
    const lines = material.content.split('\n');
    segments = [];
    for (const line of lines) {
      const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+)$/);
      if (m) {
        segments.push({
          timestamp: m[1],
          seconds: parseTimestampSeconds(m[1]),
          text: m[2]
        });
      }
    }
  }

  const filteredSegments = segments.filter((s) =>
    !search || s.text.toLowerCase().includes(search.toLowerCase()) || s.timestamp.includes(search)
  );

  const formatSecs = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="back" style={{ zIndex: 1000 }}>
      <div className="modal video-modal" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <button className="btn-icon close-btn" onClick={onClose}><X size={18} /></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingRight: 30 }}>
          <span style={{ background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
            YOUTUBE LECTURE
          </span>
          <h3 style={{ margin: 0, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {material?.name}
          </h3>
          {material?.metadata?.duration_formatted && (
            <span style={{ fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Clock size={13} /> {material.metadata.duration_formatted}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(280px, 1fr)', gap: 18, flex: 1, minHeight: 0 }}>
          {/* Left: Video Player */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 10, overflow: 'hidden', background: '#000' }}>
              {youtubeId ? (
                <iframe
                  key={seekTime}
                  src={`https://www.youtube.com/embed/${youtubeId}?start=${seekTime}&autoplay=1`}
                  title={material?.name || "YouTube Video"}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  Video preview unavailable
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--fg-3)' }}>
              <span>Seeking position: <b style={{ color: '#ef4444' }}>{formatSecs(seekTime)}</b></span>
              {material?.source_url && (
                <a href={material.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--fg-2)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  Open on YouTube <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Right: Timestamped transcript */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2, rgba(255,255,255,0.02))' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 13 }}>Timestamped Transcript ({segments.length} units)</b>
            </div>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text"
                placeholder="Search transcript by keyword or MM:SS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg-1)' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {filteredSegments.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', marginTop: 24 }}>No matching transcript segments found</p>
              ) : (
                filteredSegments.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSeekTime(s.seconds)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      marginBottom: 6,
                      background: seekTime === s.seconds ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                      borderLeft: seekTime === s.seconds ? '3px solid #ef4444' : '3px solid transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#ef4444', marginRight: 8, fontFamily: 'monospace', fontSize: 11.5 }}>
                      [{s.timestamp}]
                    </span>
                    <span style={{ color: 'var(--fg-2)', lineHeight: 1.45 }}>{s.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload Modal                                                       */
/* ------------------------------------------------------------------ */

function UploadModal({ busy, close, choose, sample, onIngestYoutube }) {
  const [tab, setTab] = useState("file"); // "file" | "youtube"
  const [ytUrl, setYtUrl] = useState("");
  const [ytError, setYtError] = useState("");

  const handleYtSubmit = async (e) => {
    e.preventDefault();
    if (!ytUrl.trim() || busy) return;
    setYtError("");
    try {
      await onIngestYoutube(ytUrl.trim());
    } catch (err) {
      setYtError(err.message || "Failed to ingest YouTube video");
    }
  };

  const loadPreset = (url) => {
    setYtUrl(url);
    setYtError("");
  };

  return (
    <div className="back">
      <div className="modal" style={{ maxWidth: '520px' }}>
        <button className="btn-icon close-btn" onClick={close}><X size={18} /></button>
        <small className="pill">ADD STUDY MATERIAL</small>
        <h2>Bring in your course material</h2>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 20px', background: 'var(--bg-2, rgba(255,255,255,0.05))', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setTab("file")}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: tab === "file" ? 'var(--primary, #10b981)' : 'transparent',
              color: tab === "file" ? '#fff' : 'var(--fg-2)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Upload size={15} /> Document / File
          </button>
          <button
            type="button"
            onClick={() => setTab("youtube")}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: tab === "youtube" ? '#ef4444' : 'transparent',
              color: tab === "youtube" ? '#fff' : 'var(--fg-2)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Video size={15} /> YouTube Video
          </button>
        </div>

        {tab === "file" ? (
          <div>
            <p style={{ color: 'var(--fg-2)', fontSize: 13, marginBottom: 16 }}>
              Select one or more PDFs, slide decks (PPTX), Word documents, images, or text notes.
            </p>
            <button className="drop" disabled={busy} onClick={choose}>
              {busy ? <LoaderCircle className="spin" size={27} /> : <Upload size={27} />}
              <b>{busy ? "Adding materials…" : "Choose files"}</b>
              <small>Select multiple files in the file picker</small>
            </button>
            <button className="btn-link sample" disabled={busy} onClick={sample}>
              Try with sample notes <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--fg-2)', fontSize: 13, marginBottom: 12 }}>
              Gemini reviews the video's actual speech and visuals for academic or instructional content, regardless of channel or title. Captions are used when available; if they cannot be retrieved, Gemini may transcribe the public video directly.
            </p>

            <form onSubmit={handleYtSubmit}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-2)',
                    color: 'var(--fg-1)',
                    fontSize: 13
                  }}
                />
                <button
                  type="submit"
                  disabled={busy || !ytUrl.trim()}
                  className="btn-primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444', whiteSpace: 'nowrap' }}
                >
                  {busy ? <><LoaderCircle className="spin" size={15} /> Ingesting…</> : <><Play size={15} fill="#fff" /> Ingest Video</>}
                </button>
              </div>
            </form>

            {ytError && (
              <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, padding: '8px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)' }}>
                {ytError}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <small style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginBottom: 6 }}>
                Or try a sample lecture:
              </small>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => loadPreset("https://www.youtube.com/watch?v=aircAruvnKk")}
                  className="btn-ghost"
                  style={{ textAlign: 'left', padding: '6px 8px', fontSize: 12, justifyContent: 'flex-start' }}
                >
                  📺 <b>3Blue1Brown</b> — What is a Neural Network? (18m)
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset("https://www.youtube.com/watch?v=9vKqVkMQHKk")}
                  className="btn-ghost"
                  style={{ textAlign: 'left', padding: '6px 8px', fontSize: 12, justifyContent: 'flex-start' }}
                >
                  📺 <b>Khan Academy</b> — Derivative as slope of curve (9m)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



