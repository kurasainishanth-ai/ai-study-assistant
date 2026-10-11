import sys
import re

file_path = r'C:\Users\kuras\Desktop\ai-study-assistant\frontend\src\App.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''function Home({ materials, selected, choose, go, upload, progressData, progressLoading }) {
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

      <SectionTitle title="Learning Progress" />
      <div style={{ marginBottom: "2.5rem" }}>
        {progressLoading ? (
          <div className="empty" style={{ minHeight: '120px' }}><LoaderCircle className="spin" /> Loading analytics...</div>
        ) : !progressData || (!progressData.total_quizzes && Object.keys(progressData.topic_mastery || {}).length === 0) ? (
          <div className="empty" style={{ minHeight: '120px' }}>No progress data yet. Take a quiz to see your mastery!</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Overall Stats Card */}
            <div style={{ padding: '1.5rem', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <small className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>OVERALL ACTIVITY</small>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{progressData.total_quizzes} Quizzes Taken</h3>
              <p style={{ color: 'var(--fg-2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Average Score: {progressData.average_quiz_score}%</p>
              
              {progressData.recommended_activity && (
                <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--accent)' }}>
                  <b style={{ color: 'var(--accent)', fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem' }}>{progressData.recommended_activity.activity}</b>
                  <small style={{ color: 'var(--fg-2)', lineHeight: 1.4, display: 'block' }}>{progressData.recommended_activity.reason}</small>
                </div>
              )}
            </div>
            
            {/* Topic Mastery Card */}
            <div style={{ padding: '1.5rem', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
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
                            width: \\%\, 
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

      <SectionTitle title="Recent materials" action={() => go("library")} />'''

old_content = '''function Home({ materials, selected, choose, go, upload }) {
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

      <SectionTitle title="Recent materials" action={() => go("library")} />'''

if old_content in content:
    content = content.replace(old_content, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("COULD NOT FIND TARGET TEXT")
