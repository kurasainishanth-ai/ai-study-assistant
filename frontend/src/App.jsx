import { useEffect, useRef, useState } from "react";
import { BookOpen, Brain, ChevronRight, FilePlus2, GraduationCap, LayoutDashboard, LoaderCircle, MessageCircle, Plus, Send, Sparkles, Trash2, Upload, WandSparkles, X } from "lucide-react";
import { api } from "./services/api";

const tools = [
  { id: "notes", label: "Smart notes", description: "A clear structured version of your material.", call: api.notes },
  { id: "cards", label: "Flashcards", description: "Active-recall prompts for what matters.", call: api.cards },
  { id: "quiz", label: "Practice quiz", description: "A focused check of your understanding.", call: api.quiz },
  { id: "map", label: "Knowledge map", description: "See concepts and their connections.", call: api.map }
];
const text = (item) => typeof item === "string" ? item : JSON.stringify(item, null, 2);
export default function App() {
  const [view, setView] = useState("home"), [materials, setMaterials] = useState([]), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [showUpload, setShowUpload] = useState(false), [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const refresh = async () => { try { const data = await api.materials(); setMaterials(data); setSelected(current => data.find(x => x.id === current?.id) || data[0] || null); } catch (e) { setNotice(e.message); } };
  useEffect(() => { refresh(); }, []);
  const doWork = async (fn) => { if (!selected) return setNotice("Choose a study material first."); setBusy(true); setNotice(""); try { setResult(await fn()); } catch (e) { setNotice(e.message); } finally { setBusy(false); } };
  const upload = async (file) => { if (!file) return; setBusy(true); try { await api.upload(file); await refresh(); setShowUpload(false); setView("library"); } catch (e) { setNotice(e.message); } finally { setBusy(false); } };
  const nav = [["home",LayoutDashboard,"Overview"],["library",BookOpen,"Library"],["studio",WandSparkles,"Study studio"],["tutor",MessageCircle,"Ask tutor"]];
  return <div className="shell">
    <aside><div className="brand"><i><GraduationCap size={20}/></i>studylane</div><small className="label">YOUR WORKSPACE</small>{nav.map(([id,Icon,label]) => <button key={id} className={"nav " + (view === id ? "on" : "")} onClick={() => setView(id)}><Icon size={17}/>{label}</button>)}<div className="side-bottom"><div className="tip"><Sparkles size={16}/><span><b>Study smarter</b>Turn one file into a plan.</span></div><button className="primary add" onClick={() => setShowUpload(true)}><Plus size={17}/>Add material</button></div></aside>
    <main><header><div><small className="label">{view === "home" ? "A CALM PLACE TO LEARN" : view.toUpperCase()}</small><h1>{view === "home" ? "Good afternoon." : view === "library" ? "Your library" : view === "studio" ? "Study studio" : "Your AI tutor"}</h1></div><b className="avatar">KS</b></header>{notice && <div className="notice">{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}
      {view === "home" && <Home materials={materials} selected={selected} choose={setSelected} go={setView} upload={() => setShowUpload(true)}/>}
      {view === "library" && <Library materials={materials} selected={selected} choose={setSelected} refresh={refresh} warn={setNotice} upload={() => setShowUpload(true)}/>}
      {view === "studio" && <Studio selected={selected} choose={setSelected} busy={busy} result={result} clear={() => setResult(null)} run={doWork}/>}
      {view === "tutor" && <Tutor selected={selected} busy={busy} run={doWork}/>}
    </main>
    {showUpload && <UploadModal busy={busy} close={() => setShowUpload(false)} choose={() => fileRef.current.click()} sample={async () => { setBusy(true); try { await api.sample(); await refresh(); setShowUpload(false); setView("library"); } catch(e) { setNotice(e.message); } finally { setBusy(false); } }}/>}
    <input className="hidden" ref={fileRef} type="file" onChange={e => upload(e.target.files?.[0])}/>
  </div>;
}
function Home({materials,selected,choose,go,upload}) { return <section className="page"><div className="hero"><div><small className="pill"><Sparkles size={13}/> YOUR PERSONAL LEARNING SPACE</small><h2>Make your next study<br/><em>session count.</em></h2><p>Bring your course materials together, then turn them into clear notes, active-recall cards, and focused practice.</p><div className="actions"><button className="primary" onClick={upload}><Upload size={17}/>Upload a file</button><button className="link" onClick={() => go("studio")}>Open study studio <ChevronRight size={17}/></button></div></div><div className="orb-wrap"><div className="orb"/><span>Ready when you are</span><b>{materials.length} materials in your lane</b></div></div><Section title="Recent materials" action={() => go("library")}/>{materials.length ? <div className="grid">{materials.slice(0,3).map(m => <button key={m.id} className={"material " + (selected?.id===m.id ? "selected":"")} onClick={() => choose(m)}><FileIcon/><span><b>{m.name}</b><small>{m.type} A— {m.size_kb} KB</small></span><ChevronRight size={17}/></button>)}</div> : <Empty upload={upload}/>}<Section title="One material, many ways to learn"/><div className="steps">{[[FilePlus2,"Add","Drop in a lecture or reading."],[WandSparkles,"Shape","Create notes, cards, and quizzes."],[Brain,"Remember","Practice with purpose."]].map(([Icon,t,d],i) => <div key={t}><small>0{i+1}</small><Icon size={22}/><b>{t}</b><p>{d}</p></div>)}</div></section>; }
function Section({title,action}) { return <div className="section"><div><small className="label">PICK UP WHERE YOU LEFT OFF</small><h3>{title}</h3></div>{action && <button className="link" onClick={action}>View library <ChevronRight size={17}/></button>}</div>; }
function FileIcon(){return <i className="file"><BookOpen size={19}/></i>}
function Empty({upload}) {return <div className="empty"><BookOpen size={27}/><h3>Your lane is empty</h3><p>Add a lecture, reading, or notes to start building a study system.</p><button className="primary" onClick={upload}><Upload size={17}/>Add your first material</button></div>}
function Library({materials,selected,choose,refresh,warn,upload}) {const remove=async m=>{if(!confirm("Remove " + m.name + " and its generated study work?"))return;try{await api.remove(m.id);await refresh();}catch(e){warn(e.message)}};return <section className="page"><div className="intro"><p>Everything you add lives here. Choose one to make it your active study source.</p><button className="primary" onClick={upload}><Plus size={17}/>Add material</button></div>{materials.length?<div className="list">{materials.map(m=><article onClick={()=>choose(m)} className={selected?.id===m.id?"selected":""} key={m.id}><FileIcon/><span className="name"><b>{m.name}</b><small>{m.type} A— uploaded {m.upload_time}</small></span><i className={"status "+m.status?.toLowerCase()}>{m.status}</i><small className="size">{m.size_kb} KB</small><button className="trash" onClick={e=>{e.stopPropagation();remove(m)}}><Trash2 size={17}/></button></article>)}</div>:<Empty upload={upload}/>}</section>}
function Studio({selected,choose,busy,result,clear,run}) {const [mode,setMode]=useState("notes");const current=tools.find(x=>x.id===mode);return <section className="page"><div className="source"><small>ACTIVE SOURCE</small><b>{selected?.name||"No material selected"}</b>{selected && <button onClick={()=>choose(null)}>Clear source</button>}</div><div className="studio"><div className="tool-list">{tools.map((t,i)=><button className={mode===t.id?"active":""} onClick={()=>{setMode(t.id);clear()}} key={t.id}><small>0{i+1}</small><span><b>{t.label}</b><i>{t.description}</i></span></button>)}</div><div className="work"><small className="label">CREATE FROM YOUR SOURCE</small><h2>{current.label}</h2><p>{current.description}</p><div style={{display:'flex', gap:'10px'}}><button className="primary" disabled={!selected||busy} onClick={()=>run(()=>current.call(selected.id))}>{busy?<LoaderCircle className="spin" size={17}/>:<WandSparkles size={17}/>} {busy?"Building your study set...":"Create "+current.label.toLowerCase()}</button>{result && <button onClick={clear} style={{padding:'8px 16px', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'8px', color:'white', cursor:'pointer'}}>Clear result</button>}</div>{result&&<pre>{text(result)}</pre>}</div></div></section>}
function Tutor({selected,busy,run}) {
  const [input,setInput]=useState(""),[messages,setMessages]=useState([]);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if(selected) {
      api.materialDetail(selected.id).then(d => setPreview(d.content || "No text extracted from this document.")).catch(() => setPreview("Could not load preview."));
    } else {
      setPreview("");
    }
  }, [selected]);
  const submit=async e=>{e.preventDefault();if(!input.trim()||!selected)return;const q=input;setInput("");setMessages(x=>[...x,["You",q,"you"]]);await run(async()=>{const r=await api.tutor(selected.id,q);setMessages(x=>[...x,["Study tutor",r.answer||r.response||text(r),""]]);return null})};
  return <section className="page tutor" style={{display:'flex', flexDirection:'column', height:'100%'}}>
    <div className="source"><Brain size={19}/><span><small>GROUNDING ANSWERS IN</small><b>{selected?.name||"Choose a source in your library"}</b></span></div>
    <div style={{display: 'flex', gap: '20px', flex: 1, minHeight: 0, marginTop: '10px'}}>
      <div className="preview" style={{flex: 1, background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', overflowY: 'auto', fontSize: '13px', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.05)', color: '#a1a1aa'}}>
        {preview ? preview : <div style={{opacity:0.5, textAlign:'center', marginTop:'40px'}}>No document selected or no text available</div>}
      </div>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
        <div className="chat" style={{flex: 1, overflowY: 'auto', marginBottom: '15px'}}>
          {messages.length?messages.map((m,i)=><div className={"message "+m[2]} key={i}><small>{m[0]}</small><p>{m[1]}</p></div>):<div className="start" style={{textAlign:'center', marginTop:'40px'}}><MessageCircle size={30} style={{margin:'0 auto 10px'}}/><h2>What are you working through?</h2><p style={{opacity:0.7}}>Ask for an explanation, a memory trick, or a step-by-step walkthrough.</p></div>}
        </div>
        <form onSubmit={submit} style={{display:'flex', gap:'10px', marginTop:'auto'}}>
          <input style={{flex:1, padding:'10px 15px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'white'}} disabled={!selected||busy} value={input} onChange={e=>setInput(e.target.value)} placeholder={selected?"Ask something about this material...":"Select material first"}/>
          <button style={{padding:'10px 15px', borderRadius:'8px', background:'#7c3aed', color:'white', border:'none', cursor:'pointer'}} disabled={!selected||busy}><Send size={18}/></button>
        </form>
      </div>
    </div>
  </section>
}
function UploadModal({busy,close,choose,sample}){return <div className="back"><div className="modal"><button className="close" onClick={close}><X size={18}/></button><small className="pill">ADD A SOURCE</small><h2>Bring in your study material</h2><p>PDFs, documents, slides, text files, and images are all welcome.</p><button className="drop" disabled={busy} onClick={choose}>{busy?<LoaderCircle className="spin" size={27}/>:<Upload size={27}/>}<b>{busy?"Adding material...":"Choose a file"}</b><small>or drag and drop it here</small></button><button className="link sample" disabled={busy} onClick={sample}>Try with sample notes <ChevronRight size={16}/></button></div></div>}
