const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error((body && body.detail) || body || "Request failed (" + response.status + ")");
  return body;
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  // Materials
  materials: () => request("/materials"),
  materialDetail: (id) => request("/materials/" + encodeURIComponent(id)),
  upload: (file) => {
    const body = new FormData();
    body.append("file", file);
    return request("/materials/upload", { method: "POST", body });
  },
  sample: () => request("/materials/sample", { method: "POST" }),
  remove: (id) => request("/materials/" + encodeURIComponent(id), { method: "DELETE" }),

  // Notes
  generateNotes: (id, styleKey = "detailed") =>
    request("/notes/generate", json({ doc_id: id, style_key: styleKey })),
  getNotes: (id) => request("/notes/" + encodeURIComponent(id)),

  // Flashcards
  generateFlashcards: (id, count = 8, difficulty = "mixed") =>
    request("/flashcards/generate", json({ doc_id: id, count, difficulty })),
  getFlashcards: (id) => request("/flashcards/" + encodeURIComponent(id)),
  reviewCard: (cardId, rating) =>
    request("/flashcards/review", json({ card_id: cardId, rating })),

  // Quiz
  generateQuiz: (id, numQuestions = 5, difficulty = "medium") =>
    request("/quiz/generate", json({ doc_id: id, num_questions: numQuestions, difficulty })),
  getGeneratedQuiz: (id) => request("/quiz/generated/" + encodeURIComponent(id)),
  submitQuiz: (id, questions, answers) =>
    request("/quiz/submit", json({ doc_id: id, questions, answers })),
  getQuizAttempts: (id) => request("/quiz/attempts/" + encodeURIComponent(id)),

  // Tutor & Chats
  tutor: (id, message, level = "intermediate", sourceDocId = null) =>
    request("/tutor/chat", json({ doc_id: id, message, level, source_doc_id: sourceDocId })),
  getTutorHistory: (id) => request("/tutor/history/" + encodeURIComponent(id)),
  clearTutorHistory: (id) =>
    request("/tutor/history/" + encodeURIComponent(id), { method: "DELETE" }),
  getRecentChats: () => request("/chats"),
  getChatSession: (id) => request("/chats/" + encodeURIComponent(id)),
  deleteChatSession: (id) =>
    request("/chats/" + encodeURIComponent(id), { method: "DELETE" }),

  // Knowledge Map
  getMap: (id) => request("/knowledge-map/" + encodeURIComponent(id)),
  generateMap: (id) =>
    request("/knowledge-map/" + encodeURIComponent(id), { method: "POST" }),

  // Progress
  progress: () => request("/progress/analytics"),
};
