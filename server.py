import os
import tempfile
import time
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_gemini_client, DEFAULT_MODEL, CONFIGURED_MODEL, GEMINI_API_KEY
from extractors import extract_content, SUPPORTED_EXTENSIONS
from summarizer import (
    generate_study_summary,
    SUMMARY_STYLES,
    GeminiTemporaryUnavailableError,
    GeminiRateLimitError,
    GeminiQuotaExhaustedError,
    GeminiClientAuthError,
    GeminiAPIError
)
import db
from services.ai_tutor import ask_ai_tutor
from agent.orchestrator import generate_dynamic_response
from services.gemini_caller import (
    GeminiServiceAuthError,
    GeminiServiceQuotaExhaustedError,
    GeminiServiceRateLimitError,
    GeminiServiceTemporaryError,
    GeminiServiceError
)

from services.flashcard_service import generate_flashcards
from services.quiz_service import generate_quiz, evaluate_quiz
from services.knowledge_map_service import generate_knowledge_map
from services.visual_service import explain_visual_diagram, generate_concept_illustration

# Initialize SQLite database on startup
db.init_db()

app = FastAPI(
    title="StudyVerse AI Platform API",
    description="Backend API for Multimodal AI-Powered Learning Platform",
    version="2.5.0"
)

# Enable CORS for the local React + Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Request Models ---

class NoteGenerateRequest(BaseModel):
    doc_id: str
    style_key: str = "bullet"
    custom_instructions: Optional[str] = None

class NoteUpdateRequest(BaseModel):
    content: str

class FlashcardGenerateRequest(BaseModel):
    doc_id: str
    count: int = 8
    difficulty: str = "mixed"

class FlashcardReviewRequest(BaseModel):
    card_id: int
    rating: str  # know_it, review_again, difficult

class TutorChatRequest(BaseModel):
    doc_id: str
    message: str
    level: str = "intermediate"  # simple, intermediate, university

class QuizGenerateRequest(BaseModel):
    doc_id: str
    num_questions: int = 5
    difficulty: str = "medium"

class QuizSubmitRequest(BaseModel):
    doc_id: str
    questions: List[Dict[str, Any]]
    answers: Dict[str, str]

class VisualArtRequest(BaseModel):
    prompt: str

class RenameMaterialRequest(BaseModel):
    new_name: str


# --- Helper ---
def get_friendly_file_type(filename: str) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext == ".pdf":
        return "PDF Document"
    elif ext in [".pptx", ".ppt"]:
        return "PowerPoint Presentation"
    elif ext in [".docx", ".doc"]:
        return "Word Document"
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"]:
        return "Image"
    elif ext in [".txt", ".md"]:
        return "Text / Markdown Note"
    return "Document"


# =========================================================
# 1. System Health & Metadata
# =========================================================

@app.get("/api/health")
def health_check():
    """Health status and configuration."""
    has_key = bool(GEMINI_API_KEY and not any(p in GEMINI_API_KEY.lower() for p in ["your_", "placeholder"]))
    return {
        "status": "healthy",
        "app": "StudyVerse AI Platform",
        "configured_model": CONFIGURED_MODEL,
        "default_model": DEFAULT_MODEL,
        "api_key_configured": has_key,
        "available_styles": {k: v["title"] for k, v in SUMMARY_STYLES.items()}
    }


# =========================================================
# 2. Smart Document Processing & Library
# =========================================================

@app.get("/api/materials")
def list_materials():
    """Returns all stored materials from SQLite."""
    return db.get_all_materials()

@app.get("/api/materials/{doc_id}")
def get_material_detail(doc_id: str):
    """Returns detailed extracted content for verification."""
    material = db.get_material(doc_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@app.post("/api/materials/upload")
async def upload_material(file: UploadFile = File(...)):
    """Uploads and extracts a study file (PDF, PPTX, DOCX, Image, Text)."""
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    size_kb = round(len(content) / 1024, 1)
    doc_id = f"doc_{int(time.time() * 1000)}"

    try:
        extracted = extract_content(tmp_path)
        extracted["file_name"] = file.filename
        
        item = {
            "id": doc_id,
            "name": file.filename,
            "type": get_friendly_file_type(file.filename),
            "size_kb": size_kb,
            "upload_time": datetime.now().strftime("%b %d, %H:%M"),
            "data": extracted,
            "status": "Ready",
            "error": None
        }
        db.save_material(item)
        
        response_material = {
            "id": item["id"],
            "name": item["name"],
            "type": item["type"],
            "size_kb": item["size_kb"],
            "upload_time": item["upload_time"],
            "status": item["status"]
        }
        return {"success": True, "material": response_material}
    except Exception as e:
        err_item = {
            "id": doc_id,
            "name": file.filename,
            "type": get_friendly_file_type(file.filename),
            "size_kb": size_kb,
            "upload_time": datetime.now().strftime("%b %d, %H:%M"),
            "data": None,
            "status": "Error",
            "error": str(e)
        }
        db.save_material(err_item)
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

@app.post("/api/materials/sample")
def load_sample_material():
    """Loads sample_notes.txt into SQLite."""
    sample_path = "sample_notes.txt"
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="sample_notes.txt not found")
    
    size_kb = round(os.path.getsize(sample_path) / 1024, 1)
    doc_id = "sample_notes_doc"
    extracted = extract_content(sample_path)
    
    item = {
        "id": doc_id,
        "name": "sample_notes.txt",
        "type": "Text / Markdown Note",
        "size_kb": size_kb,
        "upload_time": datetime.now().strftime("%b %d, %H:%M"),
        "data": extracted,
        "status": "Ready",
        "error": None
    }
    db.save_material(item)
    return {"success": True, "material": item}

@app.put("/api/materials/{doc_id}/rename")
def rename_material_endpoint(doc_id: str, req: RenameMaterialRequest):
    """Renames a material with SQLite cascade."""
    material = db.get_material(doc_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.rename_material(doc_id, req.new_name.strip())
    return {"success": True, "new_name": req.new_name.strip()}

@app.delete("/api/materials/{doc_id}")
def delete_material_endpoint(doc_id: str):
    """Deletes material and all associated notes, flashcards, and quizzes."""
    db.delete_material(doc_id)
    return {"success": True}


# =========================================================
# 3. Smart Notes Generator
# =========================================================

# Track in-flight note generations to prevent duplicate requests from rapid user clicks
in_flight_notes = set()

@app.post("/api/notes/generate")
def generate_notes_endpoint(req: NoteGenerateRequest):
    """Generates one of 11 Smart Note formats and saves in SQLite."""
    request_key = f"{req.doc_id}:{req.style_key}"
    if request_key in in_flight_notes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Smart Notes generation request for this document and style is already currently in progress. Please wait."
        )

    material = db.get_material(req.doc_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if material["status"] != "Ready" or not material.get("content"):
        raise HTTPException(status_code=400, detail="Document content is not available or failed extraction")

    style_info = SUMMARY_STYLES.get(req.style_key)
    if not style_info:
        raise HTTPException(status_code=400, detail=f"Unknown style '{req.style_key}'")

    extracted_dict = {
        "type": "text",
        "content": material["content"],
        "file_name": material["name"]
    }

    in_flight_notes.add(request_key)
    try:
        content = generate_study_summary(
            extracted_data=extracted_dict,
            style_key=req.style_key,
            custom_instructions=req.custom_instructions
        )
        note_id = db.save_note(
            doc_id=req.doc_id,
            doc_name=material["name"],
            style_key=req.style_key,
            style_title=style_info["title"],
            content=content
        )
        return {
            "success": True,
            "id": note_id,
            "doc_id": req.doc_id,
            "doc_name": material["name"],
            "style_key": req.style_key,
            "style_title": style_info["title"],
            "content": content
        }
    except GeminiQuotaExhaustedError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"QUOTA_EXHAUSTED: {str(e)}"
        )
    except GeminiRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"RATE_LIMIT: {str(e)}"
        )
    except GeminiTemporaryUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"HIGH_DEMAND: {str(e)}"
        )
    except GeminiClientAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        in_flight_notes.discard(request_key)

@app.get("/api/notes/{doc_id}")
def get_notes_endpoint(doc_id: str):
    """Retrieves all saved notes for a material."""
    return db.get_notes_for_material(doc_id)

@app.put("/api/notes/{note_id}")
def update_note_endpoint(note_id: int, req: NoteUpdateRequest):
    """Updates an existing note."""
    db.update_note(note_id, req.content)
    return {"success": True}

@app.delete("/api/notes/{note_id}")
def delete_note_endpoint(note_id: int):
    """Deletes a saved note."""
    db.delete_note(note_id)
    return {"success": True}


# =========================================================
# 4. AI Flashcard Studio
# =========================================================

@app.post("/api/flashcards/generate")
def generate_flashcards_endpoint(req: FlashcardGenerateRequest):
    """Generates source-grounded flashcards with SRS metadata."""
    cards = generate_flashcards(req.doc_id, count=req.count, difficulty=req.difficulty)
    return cards

@app.get("/api/flashcards/{doc_id}")
def get_flashcards_endpoint(doc_id: str):
    """Retrieves saved flashcards for a document."""
    return db.get_flashcards(doc_id)

@app.post("/api/flashcards/review")
def review_flashcard_endpoint(req: FlashcardReviewRequest):
    """Updates spaced-repetition card review status."""
    db.update_flashcard_review(req.card_id, req.rating)
    return {"success": True}

@app.delete("/api/flashcards/{card_id}")
def delete_flashcard_endpoint(card_id: int):
    """Deletes a flashcard."""
    db.delete_flashcard(card_id)
    return {"success": True}


# =========================================================
# 5. AI Study Agent (Document-Grounded Tutor)
# =========================================================

@app.post("/api/tutor/chat")
def tutor_chat_endpoint(req: TutorChatRequest):
    """Conversational AI study agent with dynamic response formats."""
    try:
        result = generate_dynamic_response(req.doc_id, req.message)
        return {
            'content': result.get('summary', ''),
            'response': result.get('summary', ''),
            'citations': [],
            'level': req.level,
            'raw_agent_response': result
        }
    except GeminiClientAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except GeminiServiceAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except (GeminiQuotaExhaustedError, GeminiServiceQuotaExhaustedError) as e:
        raise HTTPException(status_code=429, detail=f"API quota exhausted: {str(e)}")
    except (GeminiRateLimitError, GeminiServiceRateLimitError) as e:
        raise HTTPException(status_code=429, detail=f"Rate limit reached, please try again shortly: {str(e)}")
    except (GeminiTemporaryUnavailableError, GeminiServiceTemporaryError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

@app.get("/api/tutor/history/{doc_id}")
def get_tutor_history_endpoint(doc_id: str):
    """Gets conversation history for active document."""
    return db.get_chat_history(doc_id)

@app.delete("/api/tutor/history/{doc_id}")
def clear_tutor_history_endpoint(doc_id: str):
    """Clears conversation history."""
    db.clear_chat_history(doc_id)
    return {"success": True}


# =========================================================
# 6. Quiz Arena & Misconception Detector
# =========================================================

@app.post("/api/quiz/generate")
def generate_quiz_endpoint(req: QuizGenerateRequest):
    """Generates diagnostic quiz questions grounded in study material."""
    questions = generate_quiz(req.doc_id, num_questions=req.num_questions, difficulty=req.difficulty)
    return questions

@app.post("/api/quiz/submit")
def submit_quiz_endpoint(req: QuizSubmitRequest):
    """Evaluates answers, runs Misconception Detector, and saves attempt in SQLite."""
    results = evaluate_quiz(req.doc_id, req.questions, req.answers)
    return results

@app.get("/api/quiz/attempts/{doc_id}")
def get_quiz_attempts_endpoint(doc_id: str):
    """Returns past quiz attempts for document."""
    return db.get_quiz_attempts(doc_id)


# =========================================================
# 7. Knowledge Map
# =========================================================

@app.get("/api/knowledge-map/{doc_id}")
def get_knowledge_map_endpoint(doc_id: str):
    """Extracts authentic topic nodes and flags topics needing revision."""
    return generate_knowledge_map(doc_id)


# =========================================================
# 8. Visual Learning
# =========================================================

@app.post("/api/visuals/explain")
async def explain_visual_endpoint(
    doc_id: str = Form(...),
    question: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Explains an uploaded diagram or visual figure using Gemini vision."""
    content = await file.read()
    res = explain_visual_diagram(doc_id, content, user_question=question)
    return res

@app.post("/api/visuals/generate-art")
def generate_visual_art_endpoint(req: VisualArtRequest):
    """Generates study diagram / visual art using Google Imagen."""
    res = generate_concept_illustration(req.prompt)
    return res


# =========================================================
# 9. Learning Progress & Dashboard Analytics
# =========================================================

@app.get("/api/progress/analytics")
def get_progress_endpoint():
    """Returns genuine, non-fabricated learning analytics."""
    return db.get_learning_progress()
