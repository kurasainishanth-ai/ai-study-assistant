import sys
import os
import asyncio
import time
from typing import Optional, List, Dict, Any
from datetime import datetime

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_gemini_client, DEFAULT_MODEL, CONFIGURED_MODEL, GEMINI_API_KEY
from extractors import extract_content, extract_youtube_content, SUPPORTED_EXTENSIONS
from extractors.youtube_extractor import ACADEMIC_ONLY_MESSAGE, is_academic_context
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
from services.infographic_service import generate_infographic, INFOGRAPHIC_TYPES
from services.scheduler_service import get_material_topics, generate_revision_plan

# Initialize SQLite database on startup
db.init_db()
db.mark_interrupted_uploads()

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
    source_doc_id: Optional[str] = None

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

class YouTubeIngestRequest(BaseModel):
    url: str

class InfographicRequest(BaseModel):
    doc_id: str
    infographic_type: str = "concept_overview"

class GeneratePlanRequest(BaseModel):
    doc_id: str
    exam_date: str
    daily_hours: float = 2.0
    start_date: Optional[str] = None
    topic_overrides: Optional[Dict[str, str]] = None

class TaskStatusRequest(BaseModel):
    doc_id: str
    task_id: str
    completed: bool


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


def _material_is_youtube(material: dict) -> bool:
    metadata = material.get("metadata") or {}
    return (
        material.get("type") == "YouTube Lecture"
        or bool(metadata.get("youtube_id"))
        or "youtube.com" in (material.get("source_url") or "").lower()
        or "youtu.be" in (material.get("source_url") or "").lower()
    )


def _require_academic_sources(source_ids: Optional[str]):
    """Prevent unvalidated legacy YouTube material from reaching study generation."""
    if not source_ids:
        return
    for source_id in (part.strip() for part in source_ids.split(",")):
        if not source_id:
            continue
        material = db.get_material(source_id)
        if material and _material_is_youtube(material):
            metadata = material.get("metadata") or {}
            if metadata.get("academic_context_validated") is not True:
                raise HTTPException(status_code=400, detail=ACADEMIC_ONLY_MESSAGE)


def _require_ready_sources(source_ids: Optional[str]):
    """Require every selected source to be extracted before generating study tools."""
    if not source_ids:
        raise HTTPException(status_code=400, detail="Choose at least one study material first.")
    for source_id in (part.strip() for part in source_ids.split(",")):
        if not source_id:
            continue
        material = db.get_material(source_id)
        if not material:
            raise HTTPException(status_code=404, detail=f"Study material '{source_id}' was not found.")
        if material.get("status") != "Ready" or not material.get("content"):
            raise HTTPException(status_code=400, detail="Study material must finish processing before generating study tools.")


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

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@app.api_route("/api/materials/{doc_id}/file", methods=["GET", "HEAD"])
def get_material_raw_file(doc_id: str):
    """Serves the original uploaded file (e.g. PDF, images, txt) for direct previewing."""
    material = db.get_material(doc_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Check uploads directory for saved file with doc_id prefix
    if os.path.exists(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            if fname.startswith(f"{doc_id}_") or fname.startswith(f"{doc_id}."):
                filepath = os.path.join(UPLOADS_DIR, fname)
                media_type = "application/pdf" if fname.lower().endswith(".pdf") else "application/octet-stream"
                return FileResponse(
                    filepath,
                    media_type=media_type,
                    content_disposition_type="inline",
                    headers={"Content-Disposition": "inline"}
                )

    # Fallback for sample file
    if doc_id == "sample_notes_doc" and os.path.exists("sample_notes.txt"):
        return FileResponse(
            "sample_notes.txt",
            media_type="text/plain",
            content_disposition_type="inline",
            headers={"Content-Disposition": "inline"}
        )

    raise HTTPException(status_code=404, detail="Original document file not found on server")

@app.post("/api/materials/{doc_id}/reupload")
async def reupload_material_binary(doc_id: str, file: UploadFile = File(...)):
    """Re-saves the original binary file for an existing material to enable native PDF preview.
    Does NOT re-extract content — only persists the file for inline viewing."""
    material = db.get_material(doc_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    content = await file.read()
    # Remove any previously saved copies for this doc_id to avoid duplicates
    if os.path.exists(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            if fname.startswith(f"{doc_id}_") or fname.startswith(f"{doc_id}."):
                try:
                    os.remove(os.path.join(UPLOADS_DIR, fname))
                except OSError:
                    pass
    persistent_filename = f"{doc_id}_{file.filename}"
    persistent_path = os.path.join(UPLOADS_DIR, persistent_filename)
    with open(persistent_path, "wb") as pf:
        pf.write(content)
    return {"success": True, "message": "File saved for native preview", "filename": persistent_filename}

@app.post("/api/materials/upload")
async def upload_material(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Persists the file quickly and extracts it after the upload response."""
    return await _queue_uploaded_material(file, background_tasks)

@app.post("/api/materials/upload/batch")
async def upload_materials(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    """Queues multiple files for extraction and reports acceptance per file."""
    if not files:
        raise HTTPException(status_code=400, detail="Select at least one file to upload.")

    results = []
    for file in files:
        try:
            results.append(await _queue_uploaded_material(file, background_tasks))
        except HTTPException as exc:
            results.append({
                "success": False,
                "filename": file.filename,
                "error": exc.detail,
            })
        except Exception as exc:
            results.append({
                "success": False,
                "filename": file.filename,
                "error": str(exc),
            })

    return {
        "success": all(result["success"] for result in results),
        "results": results,
    }


async def _queue_uploaded_material(file: UploadFile, background_tasks: BackgroundTasks):
    filename = os.path.basename(file.filename or "upload")
    doc_id = f"doc_{time.time_ns()}"
    persistent_filename = f"{doc_id}_{filename}"
    persistent_path = os.path.join(UPLOADS_DIR, persistent_filename)
    try:
        size_bytes = 0
        with open(persistent_path, "wb") as uploaded_file:
            while chunk := await file.read(1024 * 1024):
                uploaded_file.write(chunk)
                size_bytes += len(chunk)

        item = {
            "id": doc_id,
            "name": filename,
            "type": get_friendly_file_type(filename),
            "size_kb": round(size_bytes / 1024, 1),
            "upload_time": datetime.now().strftime("%b %d, %H:%M"),
            "data": {"content": "", "total_units": 1, "unit_name": "units"},
            "status": "Processing",
            "error": None,
        }
        await asyncio.to_thread(db.save_material, item)
        background_tasks.add_task(_process_uploaded_material, item, persistent_path)

        return {
            "success": True,
            "material": {key: item[key] for key in ("id", "name", "type", "size_kb", "upload_time", "status")},
        }
    except Exception as exc:
        if os.path.exists(persistent_path):
            try:
                os.remove(persistent_path)
            except OSError:
                pass
        raise HTTPException(status_code=500, detail=f"Could not save {filename}: {exc}") from exc


async def _process_uploaded_material(item: dict, file_path: str):
    """Extracts one persisted upload and updates its library status."""
    try:
        extracted = await asyncio.to_thread(extract_content, file_path)
        extracted["file_name"] = item["name"]
        completed_item = {**item, "data": extracted, "status": "Ready", "error": None}
    except Exception as exc:
        completed_item = {**item, "data": None, "status": "Error", "error": str(exc)}

    try:
        # If a user deleted the item while extraction was running, don't recreate it.
        if await asyncio.to_thread(db.get_material, item["id"]) is not None:
            await asyncio.to_thread(db.save_material, completed_item)
    except Exception as exc:
        print(f"Failed to update upload status for {item['name']}: {exc}")

@app.post("/api/materials/youtube")
def ingest_youtube_endpoint(req: YouTubeIngestRequest):
    """Ingests a YouTube lecture video, extracting timestamped transcripts for grounding."""
    url = (req.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="YouTube URL or video ID is required.")

    try:
        extracted = extract_youtube_content(url)
        if extracted.get("academic_context_validated") is not True and not is_academic_context(
            extracted.get("title", ""), extracted.get("author", "")
        ):
            raise ValueError(ACADEMIC_ONLY_MESSAGE)
        extracted["academic_context_validated"] = True
        video_id = extracted["youtube_id"]
        doc_id = f"yt_{video_id}_{int(time.time())}"
        size_kb = round(len(extracted["content"]) / 1024, 1)

        item = {
            "id": doc_id,
            "name": extracted["title"],
            "type": "YouTube Lecture",
            "size_kb": size_kb,
            "upload_time": datetime.now().strftime("%b %d, %H:%M"),
            "data": extracted,
            "status": "Ready",
            "error": None,
            "source_url": extracted["video_url"],
            "metadata": {
                "thumbnail_url": extracted["thumbnail_url"],
                "author": extracted["author"],
                "duration_formatted": extracted["duration_formatted"],
                "duration_seconds": extracted["duration_seconds"],
                "youtube_id": extracted["youtube_id"],
                "segments": extracted["segments"],
                "academic_context_validated": True,
            }
        }
        db.save_material(item)

        response_material = {
            "id": item["id"],
            "name": item["name"],
            "type": item["type"],
            "size_kb": item["size_kb"],
            "upload_time": item["upload_time"],
            "status": item["status"],
            "source_url": item["source_url"],
            "metadata": item["metadata"]
        }
        return {"success": True, "material": response_material}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest YouTube video: {str(e)}")

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
    _require_academic_sources(req.doc_id)
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
    try:
        _require_academic_sources(req.doc_id)
        cards = generate_flashcards(req.doc_id, count=req.count, difficulty=req.difficulty)
        if not cards:
            raise HTTPException(status_code=422, detail="No flashcards could be generated from the readable document content.")
        return cards
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

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
        source_ids = req.source_doc_id
        if not source_ids and not req.doc_id.startswith("chat_"):
            source_ids = req.doc_id
        elif not source_ids:
            session = db.get_chat_session(req.doc_id)
            source_ids = session.get("source_doc_id") if session else None
        _require_academic_sources(source_ids)
        # ask_ai_tutor is the source-grounded path that records both messages
        # and returns usable citations.  The former agent call discarded this
        # state, making the history endpoint appear broken.
        result = ask_ai_tutor(req.doc_id, req.message, req.level, source_doc_id=req.source_doc_id)
        return {
            'chat_id': req.doc_id,
            'content': result.get('answer', ''),
            'response': result.get('answer', ''),
            'citations': result.get('citations', []),
            'level': req.level,
            'source_doc_id': result.get('source_doc_id'),
            'source_name': result.get('source_name'),
            'raw_agent_response': None
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
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
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
    try:
        _require_academic_sources(req.doc_id)
        questions = generate_quiz(req.doc_id, num_questions=req.num_questions, difficulty=req.difficulty)
        if not questions:
            raise HTTPException(status_code=422, detail="No quiz questions could be generated from the readable document content.")
        db.save_generated_quiz(req.doc_id, questions)
        return {"doc_id": req.doc_id, "questions": questions}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/quiz/generated/{doc_id}")
def get_generated_quiz_endpoint(doc_id: str):
    """Restores the latest generated quiz without triggering Gemini."""
    saved = db.get_generated_quiz(doc_id)
    return saved or {"doc_id": doc_id, "questions": []}

@app.post("/api/quiz/submit")
def submit_quiz_endpoint(req: QuizSubmitRequest):
    """Evaluates answers, runs Misconception Detector, and saves attempt in SQLite."""
    _require_academic_sources(req.doc_id)
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
    """Restores the persisted map; GET never unexpectedly runs generation."""
    return db.get_knowledge_map(doc_id) or {"nodes": [], "edges": []}

@app.post("/api/knowledge-map/{doc_id}")
def generate_knowledge_map_endpoint(doc_id: str):
    """Explicitly generates and saves a new source-grounded map."""
    try:
        _require_academic_sources(doc_id)
        graph = generate_knowledge_map(doc_id)
        if not graph.get("nodes"):
            raise HTTPException(status_code=422, detail=graph.get("empty_reason", "No map could be generated from this material."))
        db.save_knowledge_map(doc_id, graph)
        return graph
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =========================================================
# 8. Infographics and Revision Scheduler
# =========================================================

@app.get("/api/infographic/types")
def get_infographic_types():
    return {
        "types": [
            {"key": key, "title": value["title"], "description": value["description"]}
            for key, value in INFOGRAPHIC_TYPES.items()
        ]
    }


@app.get("/api/infographic/{doc_id}")
def get_infographic_endpoint(doc_id: str):
    _require_academic_sources(doc_id)
    return db.get_infographic(doc_id) or {"doc_id": doc_id, "data": None}


@app.post("/api/infographic/generate")
def generate_infographic_endpoint(req: InfographicRequest):
    _require_academic_sources(req.doc_id)
    _require_ready_sources(req.doc_id)
    try:
        return generate_infographic(req.doc_id, req.infographic_type)
    except GeminiClientAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except GeminiServiceAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except (GeminiQuotaExhaustedError, GeminiServiceQuotaExhaustedError) as exc:
        raise HTTPException(status_code=429, detail=f"API quota exhausted: {str(exc)}")
    except (GeminiRateLimitError, GeminiServiceRateLimitError) as exc:
        raise HTTPException(status_code=429, detail=f"Rate limit reached, please try again shortly: {str(exc)}")
    except (GeminiTemporaryUnavailableError, GeminiServiceTemporaryError) as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Infographic generation error: {str(exc)}")


@app.get("/api/scheduler/topics/{doc_id}")
def get_scheduler_topics_endpoint(doc_id: str):
    _require_academic_sources(doc_id)
    _require_ready_sources(doc_id)
    try:
        return get_material_topics(doc_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Topic extraction error: {str(exc)}")


@app.get("/api/scheduler/{doc_id}")
def get_scheduler_plan_endpoint(doc_id: str):
    _require_academic_sources(doc_id)
    return db.get_revision_plan(doc_id) or {"doc_id": doc_id, "plan_data": None}


@app.post("/api/scheduler/generate")
def generate_scheduler_plan_endpoint(req: GeneratePlanRequest):
    _require_academic_sources(req.doc_id)
    _require_ready_sources(req.doc_id)
    try:
        return generate_revision_plan(
            doc_id=req.doc_id,
            exam_date_str=req.exam_date,
            daily_hours=req.daily_hours,
            start_date_str=req.start_date,
            topic_overrides=req.topic_overrides,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scheduler plan generation error: {str(exc)}")


@app.post("/api/scheduler/task-status")
def update_task_status_endpoint(req: TaskStatusRequest):
    _require_academic_sources(req.doc_id)
    try:
        updated = db.update_revision_task_status(req.doc_id, req.task_id, req.completed)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Revision plan or task not found for '{req.doc_id}'.")
        return updated
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Task status update error: {str(exc)}")


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

@app.get("/api/chats")
def list_recent_chats():
    """Returns recent global chat sessions."""
    try:
        return db.get_recent_chats()
    except Exception as e:
        logger.error(f"Error fetching chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats/{chat_id}")
def get_chat_session_endpoint(chat_id: str):
    """Gets metadata for a specific chat session."""
    session = db.get_chat_session(chat_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Chat session '{chat_id}' not found.")
    return session

@app.delete("/api/chats/{chat_id}")
def delete_chat_session_endpoint(chat_id: str):
    """Deletes a chat session and its history."""
    db.delete_chat_session(chat_id)
    return {"success": True}

