// Support environment variable, Vite dev proxy (/api), and direct IPv4 fallback
const PRIMARY_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const DIRECT_FALLBACK_BASE = "http://127.0.0.1:8000/api";

async function doFetch(baseUrl, endpoint, options) {
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  // Read the body ONCE as text, then parse in memory.
  // Never call both res.text() and res.json() on the same Response — the
  // body stream can only be consumed once (WHATWG Fetch spec).
  const rawText = await res.text();

  let parsedData = null;
  if (rawText && rawText.trim()) {
    try {
      parsedData = JSON.parse(rawText);
    } catch (_) {
      // body is plain text, not JSON
    }
  }

  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    if (parsedData && parsedData.detail) {
      errorMsg =
        typeof parsedData.detail === "string"
          ? parsedData.detail
          : JSON.stringify(parsedData.detail);
    } else if (rawText && rawText.trim()) {
      errorMsg = rawText.trim();
    }
    throw new Error(errorMsg);
  }

  // Return parsed JSON when available, otherwise the raw text string
  return parsedData !== null ? parsedData : rawText;
}

async function request(endpoint, options = {}) {
  try {
    return await doFetch(PRIMARY_BASE, endpoint, options);
  } catch (err) {
    // Retry on network-level failures (TypeError covers ECONNREFUSED / proxy errors)
    const isNetworkError =
      err instanceof TypeError ||
      (err.message && err.message.includes("Failed to fetch"));
    if (isNetworkError && PRIMARY_BASE !== DIRECT_FALLBACK_BASE) {
      try {
        return await doFetch(DIRECT_FALLBACK_BASE, endpoint, options);
      } catch (fallbackErr) {
        throw new Error(
          `Cannot connect to StudyVerse backend at ${PRIMARY_BASE} or ${DIRECT_FALLBACK_BASE}. Please verify FastAPI is running on port 8000.`
        );
      }
    }
    throw err;
  }
}


export const api = {
  // Health
  getHealth: () => request("/health"),

  // Materials & Library
  getMaterials: () => request("/materials"),
  getMaterial: (docId) => request(`/materials/${encodeURIComponent(docId)}`),
  uploadMaterial: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/materials/upload", {
      method: "POST",
      body: formData,
    });
  },
  loadSampleMaterial: () => request("/materials/sample", { method: "POST" }),
  renameMaterial: (docId, newName) =>
    request(`/materials/${encodeURIComponent(docId)}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: newName }),
    }),
  deleteMaterial: (docId) =>
    request(`/materials/${encodeURIComponent(docId)}`, {
      method: "DELETE",
    }),

  // Smart Notes
  generateNotes: (docId, styleKey, customInstructions) =>
    request("/notes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: docId,
        style_key: styleKey,
        custom_instructions: customInstructions || null,
      }),
    }),
  getNotes: (docId) => request(`/notes/${encodeURIComponent(docId)}`),
  updateNote: (noteId, content) =>
    request(`/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),
  deleteNote: (noteId) =>
    request(`/notes/${noteId}`, {
      method: "DELETE",
    }),

  // Flashcards
  generateFlashcards: (docId, count = 8, difficulty = "mixed") =>
    request("/flashcards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: docId,
        count: parseInt(count, 10),
        difficulty,
      }),
    }),
  getFlashcards: (docId) => request(`/flashcards/${encodeURIComponent(docId)}`),
  reviewFlashcard: (cardId, rating) =>
    request("/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: cardId,
        rating,
      }),
    }),
  deleteFlashcard: (cardId) =>
    request(`/flashcards/${cardId}`, {
      method: "DELETE",
    }),

  // AI Study Agent (Tutor)
  askTutor: (docId, message, level = "intermediate") =>
    request("/tutor/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: docId,
        message,
        level,
      }),
    }),
  getTutorHistory: (docId) => request(`/tutor/history/${encodeURIComponent(docId)}`),
  clearTutorHistory: (docId) =>
    request(`/tutor/history/${encodeURIComponent(docId)}`, {
      method: "DELETE",
    }),

  // Quiz Arena & Misconception Detector
  generateQuiz: (docId, numQuestions = 5, difficulty = "medium") =>
    request("/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: docId,
        num_questions: parseInt(numQuestions, 10),
        difficulty,
      }),
    }),
  submitQuiz: (docId, questions, answers) =>
    request("/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_id: docId,
        questions,
        answers,
      }),
    }),
  getQuizAttempts: (docId) => request(`/quiz/attempts/${encodeURIComponent(docId)}`),

  // Knowledge Map
  getKnowledgeMap: (docId) => request(`/knowledge-map/${encodeURIComponent(docId)}`),

  // Visual Learning
  explainVisual: (docId, file, question = "") => {
    const formData = new FormData();
    formData.append("doc_id", docId);
    formData.append("file", file);
    if (question) {
      formData.append("question", question);
    }
    return request("/visuals/explain", {
      method: "POST",
      body: formData,
    });
  },
  generateVisualArt: (prompt) =>
    request("/visuals/generate-art", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }),

  // Learning Progress & Dashboard Analytics
  getProgressAnalytics: () => request("/progress/analytics"),
};
