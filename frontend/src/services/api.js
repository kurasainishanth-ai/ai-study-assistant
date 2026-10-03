const BASE = import.meta.env.VITE_API_BASE_URL || "/api";
async function request(path, options = {}) {
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error((body && body.detail) || body || "Request failed (" + response.status + ")");
  return body;
}
const json = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  materials: () => request("/materials"),
  materialDetail: (id) => request("/materials/" + encodeURIComponent(id)),
  upload: (file) => { const body = new FormData(); body.append("file", file); return request("/materials/upload", { method: "POST", body }); },
  sample: () => request("/materials/sample", { method: "POST" }),
  remove: (id) => request("/materials/" + encodeURIComponent(id), { method: "DELETE" }),
  
  notes: (id) => request("/notes/generate", json({ doc_id: id, style_key: "outline" })),
  getNotes: (id) => request("/notes/" + encodeURIComponent(id)),
  
  cards: (id) => request("/flashcards/generate", json({ doc_id: id, count: 8, difficulty: "mixed" })),
  getFlashcards: (id) => request("/flashcards/" + encodeURIComponent(id)),
  
  quiz: (id) => request("/quiz/generate", json({ doc_id: id, num_questions: 5, difficulty: "medium" })),
  submitQuiz: (id, questions, answers) => request("/quiz/submit", json({ doc_id: id, questions, answers })),
  
  tutor: (id, message) => request("/tutor/chat", json({ doc_id: id, message, level: "intermediate" })),
  getTutorHistory: (id) => request("/tutor/history/" + encodeURIComponent(id)),
  clearTutorHistory: (id) => request("/tutor/history/" + encodeURIComponent(id), { method: "DELETE" }),
  
  map: (id) => request("/knowledge-map/" + encodeURIComponent(id)),
  
  progress: () => request("/progress/analytics")
};
