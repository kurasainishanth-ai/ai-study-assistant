import { useEffect, useRef, useState, useCallback } from "react";
import { BookOpen, Brain, ChevronRight, FilePlus2, GraduationCap, LayoutDashboard, LoaderCircle, MessageCircle, Plus, Send, Sparkles, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { api } from "./services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ForceGraph2D from "react-force-graph-2d";

const tools = [
  { id: "notes", label: "Smart notes", description: "A clear structured version of your material.", call: (id) => api.generateNotes(id), get: api.getNotes },
  { id: "cards", label: "Flashcards", description: "Active-recall prompts for what matters.", call: (id) => api.generateFlashcards(id), get: api.getFlashcards },
  { id: "quiz", label: "Practice quiz", description: "A focused check of your understanding.", call: (id) => api.generateQuiz(id), get: api.getQuizAttempts },
  { id: "map", label: "Knowledge map", description: "See concepts and their connections.", call: api.getKnowledgeMap, get: api.getKnowledgeMap }
];

const text = (item) => typeof item === "string" ? item : JSON.stringify(item, null, 2);

const MarkdownRenderer = ({ content }) => (
  <div style={{ lineHeight: '1.6', fontSize: '15px' }}>
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {content}
    </ReactMarkdown>
  </div>
);

function NotesRenderer({ data }) {
  if (!data) return null;
  const notesList = Array.isArray(data) ? data : [data];
  return (
    <div className="notes-container" style={{display:'flex', flexDirection:'column', gap:'20px'}}>
      {notesList.map((note, i) => (
        <div key={i} style={{background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', border:'1px solid rgba(255,255,255,0.1)'}}>
          <h3 style={{marginTop:0, marginBottom:'15px', color:'#a78bfa'}}>{note.style_title || "Smart Notes"}</h3>
          <MarkdownRenderer content={note.content} />
        </div>
      ))}
    </div>
  );
}

function FlashcardsRenderer({ data }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  
  if (!data) return null;
  const cards = Array.isArray(data) ? data : data.cards || [];
  if (!cards.length) return <div style={{opacity:0.6}}>No flashcards generated.</div>;
  const card = cards[index];
  
  return (
    <div className="flashcards-container" style={{display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 0'}}>
      <div style={{marginBottom:'15px', opacity:0.6}}>Card {index + 1} of {cards.length}</div>
      <div onClick={() => setFlipped(!flipped)} style={{width:'100%', maxWidth:'600px', height:'350px', perspective:'1000px', cursor:'pointer'}}>
        <div style={{width:'100%', height:'100%', position:'relative', transition:'transform 0.6s', transformStyle:'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}}>
          <div style={{position:'absolute', width:'100%', height:'100%', backfaceVisibility:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.05)', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.1)', padding:'40px', textAlign:'center', fontSize:'20px', color:'white'}}>
            <MarkdownRenderer content={card.question || card.front || ""} />
          </div>
          <div style={{position:'absolute', width:'100%', height:'100%', backfaceVisibility:'hidden', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(124, 58, 237, 0.1)', borderRadius:'12px', border:'1px solid #7c3aed', padding:'40px', textAlign:'center', fontSize:'18px', color:'white', transform:'rotateY(180deg)'}}>
            <MarkdownRenderer content={card.answer || card.back || ""} />
          </div>
        </div>
      </div>
      <div style={{display:'flex', gap:'15px', marginTop:'30px'}}>
        <button style={{padding:'10px 20px', borderRadius:'8px', background:'rgba(255,255,255,0.1)', border:'none', color:'white', cursor:'pointer'}} onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped(false); }} disabled={index === 0}>Previous</button>
        <button style={{padding:'10px 20px', borderRadius:'8px', background:'rgba(255,255,255,0.1)', border:'none', color:'white', cursor:'pointer'}} onClick={() => { setIndex(Math.min(cards.length - 1, index + 1)); setFlipped(false); }} disabled={index === cards.length - 1}>Next</button>
      </div>
    </div>
  );
}

function QuizRenderer({ data, runSubmit, submitting }) {
  const [answers, setAnswers] = useState({});
  if (!data) return null;
  const isPastAttempt = Array.isArray(data) && data.length > 0 && data[0].score !== undefined;
  
  if (isPastAttempt) {
    const attempt = data[0]; 
    return (
      <div style={{background:'rgba(255,255,255,0.05)', padding:'30px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)'}}>
        <h3 style={{marginTop:0, color:'#a78bfa'}}>Last Quiz Attempt</h3>
        <p style={{fontSize:'18px'}}>Score: <b style={{color:'white'}}>{attempt.score} / {attempt.total_questions}</b> ({attempt.percentage}%)</p>
        <div style={{display:'flex', flexDirection:'column', gap:'15px', marginTop:'25px'}}>
          {attempt.details && attempt.details.map((d, i) => (
            <div key={i} style={{padding:'20px', background:'rgba(0,0,0,0.2)', borderRadius:'8px', borderLeft: d.is_correct ? '4px solid #10b981' : '4px solid #ef4444'}}>
              <b style={{fontSize:'16px'}}>{i+1}. {d.question}</b>
              <p style={{margin:'10px 0 5px 0', fontSize:'14px', opacity:0.8}}>Your answer: {d.user_answer}</p>
              {!d.is_correct && <p style={{margin:'5px 0', fontSize:'14px', color:'#10b981'}}>Correct answer: {d.correct_answer}</p>}
              <p style={{margin:'10px 0 0 0', fontSize:'14px', opacity:0.7}}>{d.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  const questions = Array.isArray(data) ? data : data.questions || [];
  if (!questions.length) return <div style={{opacity:0.6}}>No quiz questions available.</div>;
  
  return (
    <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
      {questions.map((q, i) => (
        <div key={i} style={{background:'rgba(255,255,255,0.05)', padding:'25px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)'}}>
          <b style={{display:'block', marginBottom:'15px', fontSize:'16px'}}>{i+1}. {q.question}</b>
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            {q.options && q.options.map((opt, j) => (
              <label key={j} style={{display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', padding:'12px', background:'rgba(0,0,0,0.2)', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.05)'}}>
                <input type="radio" name={`q_${i}`} checked={answers[i] === opt} onChange={() => setAnswers({...answers, [i]: opt})} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="primary" style={{alignSelf:'flex-start', marginTop:'10px'}} disabled={submitting} onClick={() => runSubmit(questions, answers)}>
        {submitting ? "Grading..." : "Submit Answers"}
      </button>
    </div>
  )
}

function MapRenderer({ data }) {
  if (!data || !data.nodes || data.nodes.length === 0) return <div style={{opacity:0.6}}>No knowledge map generated.</div>;
  const graphData = {
    nodes: data.nodes.map(n => ({ id: n.id, name: n.label, val: 1.5, ...n })),
    links: data.edges.map(e => ({ source: e.source, target: e.target, label: e.relationship }))
  };
  return (
    <div style={{width:'100%', height:'500px', background:'rgba(0,0,0,0.2)', borderRadius:'8px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)'}}>
      <ForceGraph2D
        width={800}
        height={500}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={() => '#a78bfa'}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
      />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [materials, setMaterials] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [cache, setCache] = useState({});
  const fileRef = useRef(null);

  const refresh = async () => { try { const data = await api.materials(); setMaterials(data); setSelected(current => data.find(x => x.id === current?.id) || data[0] || null); } catch (e) { setNotice(e.message); } };
  useEffect(() => { refresh(); }, []);
  
  const upload = async (file) => { if (!file) return; setBusy(true); try { await api.upload(file); await refresh(); setShowUpload(false); setView("library"); } catch (e) { setNotice(e.message); } finally { setBusy(false); } };
  const nav = [["home",LayoutDashboard,"Overview"],["library",BookOpen,"Library"],["studio",WandSparkles,"Study studio"],["tutor",MessageCircle,"Ask tutor"]];
  
  return <div className="shell">
    <aside><div className="brand"><i><GraduationCap size={20}/></i>studylane</div><small className="label">YOUR WORKSPACE</small>{nav.map(([id,Icon,label]) => <button key={id} className={"nav " + (view === id ? "on" : "")} onClick={() => setView(id)}><Icon size={17}/>{label}</button>)}<div className="side-bottom"><div className="tip"><Sparkles size={16}/><span><b>Study smarter</b>Turn one file into a plan.</span></div><button className="primary add" onClick={() => setShowUpload(true)}><Plus size={17}/>Add material</button></div></aside>
    <main><header><div><small className="label">{view === "home" ? "A CALM PLACE TO LEARN" : view.toUpperCase()}</small><h1>{view === "home" ? "Good afternoon." : view === "library" ? "Your library" : view === "studio" ? "Study studio" : "Your AI tutor"}</h1></div><b className="avatar">KS</b></header>{notice && <div className="notice">{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}
      {view === "home" && <Home materials={materials} selected={selected} choose={setSelected} go={setView} upload={() => setShowUpload(true)}/>}
      {view === "library" && <Library materials={materials} selected={selected} choose={setSelected} refresh={refresh} warn={setNotice} upload={() => setShowUpload(true)}/>}
      {view === "studio" && <Studio selected={selected} choose={setSelected} cache={cache} setCache={setCache} />}
      {view === "tutor" && <Tutor selected={selected} />}
    </main>
    {showUpload && <UploadModal busy={busy} close={() => setShowUpload(false)} choose={() => fileRef.current.click()} sample={async () => { setBusy(true); try { await api.sample(); await refresh(); setShowUpload(false); setView("library"); } catch(e) { setNotice(e.message); } finally { setBusy(false); } }}/>}
    <input className="hidden" ref={fileRef} type="file" onChange={e => upload(e.target.files?.[0])}/>
  </div>;
}

// Subcomponents
function Home({materials,selected,choose,go,upload}) { return <section className="page"><div className="hero"><div><small className="pill"><Sparkles size={13}/> YOUR PERSONAL LEARNING SPACE</small><h2>Make your next study<br/><em>session count.</em></h2><p>Bring your course materials together, then turn them into clear notes, active-recall cards, and focused practice.</p><div className="actions"><button className="primary" onClick={upload}><Upload size={17}/>Upload a file</button><button className="link" onClick={() => go("studio")}>Open study studio <ChevronRight size={17}/></button></div></div><div className="orb-wrap"><div className="orb"/><span>Ready when you are</span><b>{materials.length} materials in your lane</b></div></div><Section title="Recent materials" action={() => go("library")}/>{materials.length ? <div className="grid">{materials.slice(0,3).map(m => <button key={m.id} className={"material " + (selected?.id===m.id ? "selected":"")} onClick={() => choose(m)}><FileIcon/><span><b>{m.name}</b><small>{m.type} · {m.size_kb} KB</small></span><ChevronRight size={17}/></button>)}</div> : <Empty upload={upload}/>}<Section title="One material, many ways to learn"/><div className="steps">{[[FilePlus2,"Add","Drop in a lecture or reading."],[WandSparkles,"Shape","Create notes, cards, and quizzes."],[Brain,"Remember","Practice with purpose."]].map(([Icon,t,d],i) => <div key={t}><small>0{i+1}</small><Icon size={22}/><b>{t}</b><p>{d}</p></div>)}</div></section>; }
function Section({title,action}) { return <div className="section"><div><small className="label">PICK UP WHERE YOU LEFT OFF</small><h3>{title}</h3></div>{action && <button className="link" onClick={action}>View library <ChevronRight size={17}/></button>}</div>; }
function FileIcon(){return <i className="file"><BookOpen size={19}/></i>}
function Empty({upload}) {return <div className="empty"><BookOpen size={27}/><h3>Your lane is empty</h3><p>Add a lecture, reading, or notes to start building a study system.</p><button className="primary" onClick={upload}><Upload size={17}/>Add your first material</button></div>}
function Library({materials,selected,choose,refresh,warn,upload}) {const remove=async m=>{if(!confirm("Remove " + m.name + " and its generated study work?"))return;try{await api.remove(m.id);await refresh();}catch(e){warn(e.message)}};return <section className="page"><div className="intro"><p>Everything you add lives here. Choose one to make it your active study source.</p><button className="primary" onClick={upload}><Plus size={17}/>Add material</button></div>{materials.length?<div className="list">{materials.map(m=><article onClick={()=>choose(m)} className={selected?.id===m.id?"selected":""} key={m.id}><FileIcon/><span className="name"><b>{m.name}</b><small>{m.type} · uploaded {m.upload_time}</small></span><i className={"status "+m.status?.toLowerCase()}>{m.status}</i><small className="size">{m.size_kb} KB</small><button className="trash" onClick={e=>{e.stopPropagation();remove(m)}}><Trash2 size={17}/></button></article>)}</div>:<Empty upload={upload}/>}</section>}

function Studio({selected, choose, cache, setCache}) {
  const [mode, setMode] = useState("notes");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  const current = tools.find(x => x.id === mode);
  const cacheKey = selected ? `${selected.id}_${mode}` : null;
  const result = cacheKey ? cache[cacheKey] : null;

  useEffect(() => {
    if (!selected) return;
    if (cache[cacheKey] !== undefined) return; 

    let active = true;
    const load = async () => {
      setBusy(true); setError("");
      try {
        let res = await current.get(selected.id);
        if (Array.isArray(res) && res.length === 0) res = null;
        if (res && res.nodes && res.nodes.length === 0) res = null;
        if (active) setCache(c => ({...c, [cacheKey]: res || null}));
      } catch(e) {
        if (active) setCache(c => ({...c, [cacheKey]: null}));
      } finally {
        if (active) setBusy(false);
      }
    };
    load();
    return () => { active = false; };
  }, [selected, mode, cacheKey]);

  const run = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const res = await current.call(selected.id);
      setCache(c => ({...c, [cacheKey]: res}));
    } catch(e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  
  const submitQuiz = async (questions, answers) => {
    setBusy(true); setError("");
    try {
      const answerList = questions.map((q, i) => answers[i] || "");
      const res = await api.submitQuiz(selected.id, questions, answerList);
      // Replace active questions with the graded attempt
      setCache(c => ({...c, [cacheKey]: [res]}));
    } catch(e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const regenerate = () => {
    if (confirm("Are you sure you want to regenerate this material? This will replace your current result.")) {
      run();
    }
  };

  return <section className="page"><div className="source"><small>ACTIVE SOURCE</small><b>{selected?.name||"No material selected"}</b>{selected && <button onClick={()=>choose(null)}>Clear source</button>}</div><div className="studio"><div className="tool-list">{tools.map((t,i)=><button className={mode===t.id?"active":""} onClick={()=>{setMode(t.id)}} key={t.id}><small>0{i+1}</small><span><b>{t.label}</b><i>{t.description}</i></span></button>)}</div><div className="work"><small className="label">CREATE FROM YOUR SOURCE</small><h2>{current.label}</h2><p>{current.description}</p>
  
  <div style={{display:'flex', gap:'10px'}}>
    {!result && <button className="primary" disabled={!selected||busy} onClick={run}>{busy?<LoaderCircle className="spin" size={17}/>:<WandSparkles size={17}/>} {busy?"Building your study set...":"Create "+current.label.toLowerCase()}</button>}
    {result && <button onClick={regenerate} disabled={busy} style={{padding:'8px 16px', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'8px', color:'white', cursor:'pointer', display:'flex', gap:'8px', alignItems:'center'}}>{busy?<LoaderCircle className="spin" size={16}/>:<RefreshCw size={16}/>} Regenerate</button>}
  </div>
  
  {error && <div style={{color:'#ef4444', marginTop:'15px'}}>{error}</div>}
  
  <div style={{marginTop:'30px'}}>
    {mode === 'notes' && <NotesRenderer data={result} />}
    {mode === 'cards' && <FlashcardsRenderer data={result} />}
    {mode === 'quiz' && <QuizRenderer data={result} runSubmit={submitQuiz} submitting={busy} />}
    {mode === 'map' && <MapRenderer data={result} />}
  </div>
  </div></div></section>
}

function Tutor({selected}) {
  const [input,setInput]=useState(""),[messages,setMessages]=useState([]);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    if(selected) {
      api.materialDetail(selected.id).then(d => {
        if(active) setPreview(d.content || "No text extracted from this document.");
      }).catch(() => {
        if(active) setPreview("Could not load preview.");
      });
      // Load history
      api.getTutorHistory(selected.id).then(hist => {
         if(active && Array.isArray(hist)) {
           setMessages(hist.map(h => [h.role === 'user' ? 'You' : 'Study tutor', h.content, h.role === 'user' ? 'you' : '']));
         }
      }).catch(()=>null);
    } else {
      setPreview(""); setMessages([]);
    }
    return () => { active = false; }
  }, [selected]);
  
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const submit=async e=>{
    e.preventDefault();
    if(!input.trim()||!selected||busy)return;
    const q=input;setInput("");
    setMessages(x=>[...x,["You",q,"you"]]);
    setBusy(true);
    try {
      const r=await api.chatTutor(selected.id,q);
      setMessages(x=>[...x,["Study tutor",r.answer||r.response||text(r),""]]);
    } catch(e) {
      setMessages(x=>[...x,["System","Error: " + e.message,""]]);
    } finally {
      setBusy(false);
    }
  };
  
  return <section className="page tutor" style={{display:'flex', flexDirection:'column', height:'100%'}}>
    <div className="source"><Brain size={19}/><span><small>GROUNDING ANSWERS IN</small><b>{selected?.name||"Choose a source in your library"}</b></span></div>
    <div style={{display: 'flex', gap: '20px', flex: 1, minHeight: 0, marginTop: '10px'}}>
      <div className="preview" style={{flex: 1, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', overflowY: 'auto', fontSize: '14px', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.05)', color: '#a1a1aa', lineHeight:'1.6'}}>
        {preview ? preview : <div style={{opacity:0.5, textAlign:'center', marginTop:'40px'}}>No document selected or no text available</div>}
      </div>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        <div className="chat" ref={scrollRef} style={{flex: 1, overflowY: 'auto', marginBottom: '15px', display:'flex', flexDirection:'column', gap:'15px', paddingRight:'10px'}}>
          {messages.length ? messages.map((m,i)=><div className={"message "+m[2]} key={i}><small>{m[0]}</small><div><MarkdownRenderer content={m[1]} /></div></div>):<div className="start" style={{textAlign:'center', marginTop:'40px'}}><MessageCircle size={30} style={{margin:'0 auto 10px'}}/><h2>What are you working through?</h2><p style={{opacity:0.7}}>Ask for an explanation, a memory trick, or a step-by-step walkthrough.</p></div>}
          {busy && <div className="message"><small>Study tutor</small><p style={{display:'flex', alignItems:'center', gap:'10px'}}><LoaderCircle className="spin" size={14}/> Thinking...</p></div>}
        </div>
        <form onSubmit={submit} style={{display:'flex', gap:'10px', marginTop:'auto'}}>
          <input style={{flex:1, padding:'12px 15px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'white'}} disabled={!selected||busy} value={input} onChange={e=>setInput(e.target.value)} placeholder={selected?"Ask something about this material...":"Select material first"}/>
          <button style={{padding:'12px 15px', borderRadius:'8px', background:'#7c3aed', color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'50px'}} disabled={!selected||busy||!input.trim()}><Send size={18}/></button>
        </form>
      </div>
    </div>
  </section>
}
function UploadModal({busy,close,choose,sample}){return <div className="back"><div className="modal"><button className="close" onClick={close}><X size={18}/></button><small className="pill">ADD A SOURCE</small><h2>Bring in your study material</h2><p>PDFs, documents, slides, text files, and images are all welcome.</p><button className="drop" disabled={busy} onClick={choose}>{busy?<LoaderCircle className="spin" size={27}/>:<Upload size={27}/>}<b>{busy?"Adding material...":"Choose a file"}</b><small>or drag and drop it here</small></button><button className="link sample" disabled={busy} onClick={sample}>Try with sample notes <ChevronRight size={16}/></button></div></div>}
