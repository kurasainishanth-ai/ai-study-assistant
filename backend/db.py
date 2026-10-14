import sqlite3
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "studyverse.db"))

def get_connection():
    """Returns an active SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes comprehensive SQLite schema for StudyVerse AI."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Study Materials
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS materials (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                size_kb REAL NOT NULL,
                upload_time TEXT NOT NULL,
                content TEXT,
                total_units INTEGER DEFAULT 1,
                unit_name TEXT DEFAULT 'units',
                status TEXT NOT NULL,
                error TEXT,
                source_url TEXT,
                metadata_json TEXT
            )
        """)

        cursor.execute("PRAGMA table_info(materials)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if "source_url" not in existing_cols:
            try:
                cursor.execute("ALTER TABLE materials ADD COLUMN source_url TEXT")
            except Exception:
                pass
        if "metadata_json" not in existing_cols:
            try:
                cursor.execute("ALTER TABLE materials ADD COLUMN metadata_json TEXT")
            except Exception:
                pass

        # 2. Smart Notes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                doc_name TEXT NOT NULL,
                style_key TEXT NOT NULL,
                style_title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        # 3. Flashcards with Spaced Repetition (SRS)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flashcards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                topic TEXT,
                difficulty TEXT DEFAULT 'medium',
                source_ref TEXT,
                review_count INTEGER DEFAULT 0,
                rating TEXT DEFAULT 'new', -- new, know_it, review_again, difficult
                next_review TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        # 4. Chat Messages (AI Study Agent)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                role TEXT NOT NULL, -- user, assistant
                content TEXT NOT NULL,
                level TEXT DEFAULT 'intermediate',
                citations TEXT, -- JSON array of references
                timestamp TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        # 4b. Chat Sessions Metadata
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                source_doc_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (source_doc_id) REFERENCES materials (id) ON DELETE SET NULL
            )
        """)

        # 5. Quiz Attempts & Performance
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                doc_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                percentage REAL NOT NULL,
                topic_breakdown TEXT, -- JSON
                details TEXT, -- JSON
                timestamp TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        # Generated quizzes are stored separately from attempts so an in-progress
        # quiz can be restored after a refresh without being re-generated.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS generated_quizzes (
                doc_id TEXT PRIMARY KEY,
                questions TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        # Persist the latest map per material.  Replacing a map only happens
        # after a successful explicit regeneration.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_maps (
                doc_id TEXT PRIMARY KEY,
                graph_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS infographics (
                doc_id TEXT PRIMARY KEY,
                infographic_type TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS revision_plans (
                doc_id TEXT PRIMARY KEY,
                plan_data TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES materials (id) ON DELETE CASCADE
            )
        """)

        # 6. Activity Log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        # Durable, structured study events let Tutor connect tool use and
        # learner-reported outcomes without treating activity as a mistake.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learner_memory_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_doc_id TEXT,
                activity_type TEXT NOT NULL,
                topic TEXT,
                details TEXT,
                created_at TEXT NOT NULL
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_learner_memory_source ON learner_memory_events(source_doc_id, id)")

        conn.commit()


def _record_learning_event(cursor, source_doc_id: Optional[str], activity_type: str,
                           topic: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
    cursor.execute(
        "INSERT INTO learner_memory_events (source_doc_id, activity_type, topic, details, created_at) VALUES (?, ?, ?, ?, ?)",
        (source_doc_id, activity_type, topic, json.dumps(details or {}), datetime.now().isoformat(timespec="seconds")),
    )


def record_learning_event(source_doc_id: Optional[str], activity_type: str,
                          topic: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
    """Persist a standalone learning event, such as a Tutor conversation turn."""
    init_db()
    with get_connection() as conn:
        _record_learning_event(conn.cursor(), source_doc_id, activity_type, topic, details)
        conn.commit()


def _delete_tutor_events_for_chat(cursor, chat_id: str):
    rows = cursor.execute(
        "SELECT id, details FROM learner_memory_events WHERE activity_type = 'tutor_turn'"
    ).fetchall()
    matching_ids = []
    for row in rows:
        try:
            details = json.loads(row["details"]) if row["details"] else {}
        except (TypeError, json.JSONDecodeError):
            continue
        if details.get("chat_id") == chat_id:
            matching_ids.append(row["id"])
    if matching_ids:
        placeholders = ",".join("?" for _ in matching_ids)
        cursor.execute(f"DELETE FROM learner_memory_events WHERE id IN ({placeholders})", matching_ids)


def get_learning_events(source_doc_ids: Optional[List[str]] = None, limit: int = 30) -> List[Dict[str, Any]]:
    """Return recent persistent study events, optionally scoped to selected sources."""
    init_db()
    source_ids = list(dict.fromkeys(item for item in (source_doc_ids or []) if item))
    with get_connection() as conn:
        if source_ids:
            placeholders = ",".join("?" for _ in source_ids)
            rows = conn.execute(
                f"SELECT * FROM learner_memory_events WHERE source_doc_id IN ({placeholders}) ORDER BY id DESC LIMIT ?",
                (*source_ids, max(1, min(int(limit), 100))),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM learner_memory_events ORDER BY id DESC LIMIT ?",
                (max(1, min(int(limit), 100)),),
            ).fetchall()
        events = []
        for row in rows:
            try:
                details = json.loads(row["details"]) if row["details"] else {}
            except (TypeError, json.JSONDecodeError):
                details = {}
            events.append({
                "id": row["id"], "source_doc_id": row["source_doc_id"],
                "activity_type": row["activity_type"], "topic": row["topic"],
                "details": details, "created_at": row["created_at"],
            })
        return events


def mark_interrupted_uploads():
    """Mark uploads left mid-processing by a previous server run as failed."""
    init_db()
    with get_connection() as conn:
        conn.execute(
            "UPDATE materials SET status = ?, error = ? WHERE status = ?",
            ("Error", "Processing was interrupted. Upload this file again.", "Processing"),
        )
        conn.commit()

# --- Material Operations ---

def save_material(item: Dict[str, Any]):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        data = item.get("data") or {}
        source_url = item.get("source_url") or (data.get("video_url") if isinstance(data, dict) else None)
        meta_dict = item.get("metadata") or (data.get("metadata") if isinstance(data, dict) else None)
        if not meta_dict and isinstance(data, dict):
            meta_dict = {
                "thumbnail_url": data.get("thumbnail_url"),
                "author": data.get("author"),
                "duration_formatted": data.get("duration_formatted"),
                "duration_seconds": data.get("duration_seconds"),
                "youtube_id": data.get("youtube_id"),
                "segments": data.get("segments", [])
            }
        meta_json = json.dumps(meta_dict) if meta_dict else None

        cursor.execute("""
            INSERT OR REPLACE INTO materials 
            (id, name, file_type, size_kb, upload_time, content, total_units, unit_name, status, error, source_url, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"],
            item["name"],
            item["type"],
            item["size_kb"],
            item["upload_time"],
            data.get("content", ""),
            data.get("total_units", 1),
            data.get("unit_name", "units"),
            item["status"],
            item.get("error"),
            source_url,
            meta_json
        ))
        conn.commit()

def rename_material(doc_id: str, new_name: str):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE materials SET name = ? WHERE id = ?", (new_name, doc_id))
        cursor.execute("UPDATE notes SET doc_name = ? WHERE doc_id = ?", (new_name, doc_id))
        cursor.execute("UPDATE quiz_attempts SET doc_name = ? WHERE doc_id = ?", (new_name, doc_id))
        conn.commit()

def get_all_materials() -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        content_sql, content_params = _supported_content_select()
        cursor.execute(f"""
            SELECT id, name, file_type, size_kb, upload_time,
                   {content_sql} AS content,
                   total_units, unit_name, status, error, source_url, metadata_json
            FROM materials
            ORDER BY upload_time DESC
        """, content_params)
        rows = cursor.fetchall()
        materials = []
        for r in rows:
            meta = {}
            if "metadata_json" in r.keys() and r["metadata_json"]:
                try:
                    meta = json.loads(r["metadata_json"])
                except Exception:
                    pass
            content = r["content"] or ""
            status = r["status"]
            error = r["error"]
            if not _is_supported_material(r["name"], r["file_type"], meta):
                # Legacy uploads may contain arbitrary binary data stored as text.
                # Keep the material record, but never send that payload to the UI or AI.
                content = ""
                status = "Error"
                error = "Unsupported file type. Upload a PDF, presentation, Word document, image, or text file."
            materials.append({
                "id": r["id"],
                "name": r["name"],
                "type": r["file_type"],
                "size_kb": r["size_kb"],
                "upload_time": r["upload_time"],
                "status": status,
                "error": error,
                "content": content,
                "total_units": r["total_units"] or 1,
                "unit_name": r["unit_name"] or "units",
                "source_url": r["source_url"] if "source_url" in r.keys() else None,
                "metadata": meta
            })
        return materials

def get_material(doc_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        content_sql, content_params = _supported_content_select()
        cursor.execute(f"""
            SELECT id, name, file_type, size_kb, upload_time,
                   {content_sql} AS content,
                   total_units, unit_name, status, error, source_url, metadata_json
            FROM materials
            WHERE id = ?
        """, (*content_params, doc_id))
        r = cursor.fetchone()
        if not r:
            return None
        meta = {}
        if "metadata_json" in r.keys() and r["metadata_json"]:
            try:
                meta = json.loads(r["metadata_json"])
            except Exception:
                pass
        content = r["content"] or ""
        status = r["status"]
        error = r["error"]
        if not _is_supported_material(r["name"], r["file_type"], meta):
            content = ""
            status = "Error"
            error = "Unsupported file type. Upload a PDF, presentation, Word document, image, or text file."
        return {
            "id": r["id"],
            "name": r["name"],
            "type": r["file_type"],
            "size_kb": r["size_kb"],
            "upload_time": r["upload_time"],
            "status": status,
            "error": error,
            "content": content,
            "total_units": r["total_units"] or 1,
            "unit_name": r["unit_name"] or "units",
            "source_url": r["source_url"] if "source_url" in r.keys() else None,
            "metadata": meta
        }


def _is_supported_material(name: str, file_type: str, metadata: Dict[str, Any]) -> bool:
    """Preserve legacy YouTube items and filter unsupported legacy file uploads."""
    if file_type == "YouTube Lecture" or metadata.get("youtube_id"):
        return True
    from extractors.dispatcher import is_supported_file
    return is_supported_file(name)


def _supported_content_select():
    """Build a safe SQL expression that never reads legacy unsupported binary text."""
    from extractors.dispatcher import SUPPORTED_FILE_SUFFIXES
    supported_conditions = ["file_type = 'YouTube Lecture'"]
    suffix_patterns = []
    for suffix in sorted(SUPPORTED_FILE_SUFFIXES):
        supported_conditions.append("lower(name) LIKE ?")
        suffix_patterns.append(f"%{suffix}")
    expression = f"CASE WHEN {' OR '.join(supported_conditions)} THEN content ELSE NULL END"
    return expression, tuple(suffix_patterns)

def delete_material(doc_id: str):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM materials WHERE id = ?", (doc_id,))
        cursor.execute("DELETE FROM notes WHERE doc_id = ?", (doc_id,))
        cursor.execute("DELETE FROM flashcards WHERE doc_id = ?", (doc_id,))
        cursor.execute("DELETE FROM chat_messages WHERE doc_id = ?", (doc_id,))
        cursor.execute("DELETE FROM quiz_attempts WHERE doc_id = ?", (doc_id,))
        cursor.execute("DELETE FROM generated_quizzes WHERE doc_id = ?", (doc_id,))
        cursor.execute("DELETE FROM knowledge_maps WHERE doc_id = ?", (doc_id,))
        cursor.execute("DELETE FROM learner_memory_events WHERE source_doc_id = ?", (doc_id,))
        conn.commit()

# --- Smart Notes Operations ---

def save_note(doc_id: str, doc_name: str, style_key: str, style_title: str, content: str) -> int:
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notes (doc_id, doc_name, style_key, style_title, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, doc_name, style_key, style_title, content, now_str, now_str))
        note_id = cursor.lastrowid
        _record_learning_event(cursor, doc_id, "smart_notes_created", details={"style": style_key})
        conn.commit()
        return note_id

def update_note(note_id: int, content: str):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        cursor = conn.cursor()
        note = cursor.execute("SELECT doc_id, style_key FROM notes WHERE id = ?", (note_id,)).fetchone()
        cursor.execute("UPDATE notes SET content = ?, updated_at = ? WHERE id = ?", (content, now_str, note_id))
        if note:
            _record_learning_event(cursor, note["doc_id"], "smart_notes_edited", details={"note_id": note_id, "style": note["style_key"]})
        conn.commit()

def get_notes_for_material(doc_id: str) -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notes WHERE doc_id = ? ORDER BY id DESC", (doc_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def delete_note(note_id: int):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()

# --- Generated Study Sets ---

def save_generated_quiz(doc_id: str, questions: List[Dict[str, Any]]):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO generated_quizzes (doc_id, questions, created_at) VALUES (?, ?, ?)",
            (doc_id, json.dumps(questions), now_str)
        )
        _record_learning_event(conn.cursor(), doc_id, "quiz_generated", details={"question_count": len(questions)})
        conn.commit()

def get_generated_quiz(doc_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM generated_quizzes WHERE doc_id = ?", (doc_id,)).fetchone()
        if not row:
            return None
        try:
            questions = json.loads(row["questions"])
        except (TypeError, json.JSONDecodeError):
            return None
        return {"doc_id": doc_id, "questions": questions, "created_at": row["created_at"]}

def save_knowledge_map(doc_id: str, graph_data: Dict[str, Any]):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO knowledge_maps (doc_id, graph_data, created_at) VALUES (?, ?, ?)",
            (doc_id, json.dumps(graph_data), now_str)
        )
        _record_learning_event(conn.cursor(), doc_id, "knowledge_map_created", details={"node_count": len(graph_data.get("nodes", []))})
        conn.commit()

def get_knowledge_map(doc_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM knowledge_maps WHERE doc_id = ?", (doc_id,)).fetchone()
        if not row:
            return None
        try:
            data = json.loads(row["graph_data"])
        except (TypeError, json.JSONDecodeError):
            return None
        return data if isinstance(data, dict) else None


def save_infographic(doc_id: str, infographic_type: str, data: Dict[str, Any]):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO infographics (doc_id, infographic_type, data, created_at) VALUES (?, ?, ?, ?)",
            (doc_id, infographic_type, json.dumps(data), now_str)
        )
        _record_learning_event(conn.cursor(), doc_id, "infographic_created", details={"infographic_type": infographic_type})
        conn.commit()


def get_infographic(doc_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM infographics WHERE doc_id = ?", (doc_id,)).fetchone()
        if not row:
            return None
        try:
            data = json.loads(row["data"])
        except (TypeError, json.JSONDecodeError):
            return None
        return {
            "doc_id": doc_id,
            "type": row["infographic_type"],
            "data": data,
            "created_at": row["created_at"]
        }


def save_revision_plan(doc_id: str, plan_data: Dict[str, Any]):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO revision_plans (doc_id, plan_data, updated_at) VALUES (?, ?, ?)",
            (doc_id, json.dumps(plan_data), now_str)
        )
        _record_learning_event(conn.cursor(), doc_id, "revision_plan_created", details={"day_count": len(plan_data.get("days", []))})
        conn.commit()


def get_revision_plan(doc_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM revision_plans WHERE doc_id = ?", (doc_id,)).fetchone()
        if not row:
            return None
        try:
            data = json.loads(row["plan_data"])
        except (TypeError, json.JSONDecodeError):
            return None
        return {"doc_id": doc_id, "plan_data": data, "updated_at": row["updated_at"]}


def update_revision_task_status(doc_id: str, task_id: str, completed: bool) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM revision_plans WHERE doc_id = ?", (doc_id,)).fetchone()
        if not row:
            return None
        try:
            plan = json.loads(row["plan_data"])
        except (TypeError, json.JSONDecodeError):
            return None

        found = False
        completed_count = 0
        total_tasks = 0
        for day in plan.get("days", []):
            for task in day.get("tasks", []):
                total_tasks += 1
                if task.get("id") == task_id:
                    task["completed"] = completed
                    found = True
                if task.get("completed"):
                    completed_count += 1

        if found:
            plan["completion_percentage"] = round((completed_count / max(total_tasks, 1)) * 100)
            plan["completed_tasks"] = completed_count
            now_str = datetime.now().strftime("%b %d, %H:%M")
            conn.execute(
                "UPDATE revision_plans SET plan_data = ?, updated_at = ? WHERE doc_id = ?",
                (json.dumps(plan), now_str, doc_id)
            )
            _record_learning_event(conn.cursor(), doc_id, "revision_task_status_changed", details={"task_id": task_id, "completed": bool(completed)})
            conn.commit()
        return plan

# --- Flashcards & SRS Operations ---

def save_flashcards(doc_id: str, cards: List[Dict[str, Any]]):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        cursor = conn.cursor()
        for c in cards:
            cursor.execute("""
                INSERT INTO flashcards (doc_id, front, back, topic, difficulty, source_ref, rating, next_review, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)
            """, (
                doc_id,
                c.get("front", ""),
                c.get("back", ""),
                c.get("topic", "General"),
                c.get("difficulty", "medium"),
                c.get("source_ref", ""),
                now_str,
                now_str
            ))
        if cards:
            topics = sorted({str(card.get("topic") or "General") for card in cards})
            _record_learning_event(cursor, doc_id, "flashcards_created", details={"card_count": len(cards), "topics": topics[:30]})
        conn.commit()

def get_flashcards(doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        if doc_id:
            cursor.execute("SELECT * FROM flashcards WHERE doc_id = ? ORDER BY id ASC", (doc_id,))
        else:
            cursor.execute("SELECT * FROM flashcards ORDER BY id DESC")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def update_flashcard_review(card_id: int, rating: str):
    """Updates card review status with simple spaced repetition intervals."""
    init_db()
    now = datetime.now()
    now_str = now.strftime("%b %d, %H:%M")
    
    # Calculate interval based on rating
    if rating == "know_it":
        next_dt = now + timedelta(days=3)
    elif rating == "difficult":
        next_dt = now + timedelta(hours=6)
    else:  # review_again
        next_dt = now + timedelta(days=1)
        
    next_str = next_dt.strftime("%b %d, %H:%M")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE flashcards 
            SET review_count = review_count + 1, rating = ?, next_review = ?
            WHERE id = ?
        """, (rating, next_str, card_id))
        if cursor.rowcount:
            card = conn.execute("SELECT doc_id, topic FROM flashcards WHERE id = ?", (card_id,)).fetchone()
            if card:
                _record_learning_event(cursor, card["doc_id"], "flashcard_rated", topic=card["topic"], details={"rating": rating})
        conn.commit()

def delete_flashcard(card_id: int):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM flashcards WHERE id = ?", (card_id,))
        conn.commit()

# --- AI Tutor Chat Operations ---

def save_chat_message(doc_id: str, role: str, content: str, level: str = "intermediate", citations: Optional[List[str]] = None):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    cit_json = json.dumps(citations or [])
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chat_messages (doc_id, role, content, level, citations, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (doc_id, role, content, level, cit_json, now_str))
        conn.commit()

def get_chat_history(doc_id: str) -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chat_messages WHERE doc_id = ? ORDER BY id ASC", (doc_id,))
        rows = cursor.fetchall()
        messages = []
        for r in rows:
            messages.append({
                "id": r["id"],
                "doc_id": r["doc_id"],
                "role": r["role"],
                "content": r["content"],
                "level": r["level"],
                "citations": json.loads(r["citations"]) if r["citations"] else [],
                "timestamp": r["timestamp"]
            })
        return messages

def clear_chat_history(doc_id: str):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_messages WHERE doc_id = ?", (doc_id,))
        _delete_tutor_events_for_chat(cursor, doc_id)
        conn.commit()

# --- Quiz Attempts & Mastery Analytics ---

def save_quiz_attempt(doc_id: str, doc_name: str, score: int, total_questions: int, topic_breakdown: Dict[str, Any], details: List[Dict[str, Any]]):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    percentage = round((score / max(total_questions, 1)) * 100, 1)
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO quiz_attempts (doc_id, doc_name, score, total_questions, percentage, topic_breakdown, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id,
            doc_name,
            score,
            total_questions,
            percentage,
            json.dumps(topic_breakdown),
            json.dumps(details),
            now_str
        ))
        incorrect_topics = sorted({
            str(item.get("topic") or "General")
            for item in details
            if not item.get("is_correct") and item.get("student_answer") not in (None, "", "No answer submitted")
        })
        incorrect_answers = [
            {
                "topic": str(item.get("topic") or "General")[:100],
                "question": str(item.get("question") or "")[:300],
                "student_answer": str(item.get("student_answer") or "")[:240],
                "correct_answer": str(item.get("correct_answer") or "")[:240],
                "misconception": str(item.get("misconception_analysis") or "")[:240],
            }
            for item in details
            if not item.get("is_correct") and item.get("student_answer") not in (None, "", "No answer submitted")
        ][:10]
        _record_learning_event(cursor, doc_id, "quiz_submitted", details={
            "score": score, "total_questions": total_questions,
            "topic_breakdown": topic_breakdown, "incorrect_topics": incorrect_topics[:30],
            "incorrect_answers": incorrect_answers,
        })
        conn.commit()

def get_quiz_attempts(doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        if doc_id:
            cursor.execute("SELECT * FROM quiz_attempts WHERE doc_id = ? ORDER BY id DESC", (doc_id,))
        else:
            cursor.execute("SELECT * FROM quiz_attempts ORDER BY id DESC")
        rows = cursor.fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "doc_id": r["doc_id"],
                "doc_name": r["doc_name"],
                "score": r["score"],
                "total_questions": r["total_questions"],
                "percentage": r["percentage"],
                "topic_breakdown": json.loads(r["topic_breakdown"]) if r["topic_breakdown"] else {},
                "details": json.loads(r["details"]) if r["details"] else [],
                "timestamp": r["timestamp"]
            })
        return results

def get_learning_progress() -> Dict[str, Any]:
    """Computes genuine, non-fabricated learning analytics from real user study data."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Material counts
        cursor.execute("SELECT COUNT(*) FROM materials")
        mat_count = cursor.fetchone()[0]
        
        # 2. Notes counts
        cursor.execute("SELECT COUNT(*) FROM notes")
        notes_count = cursor.fetchone()[0]
        
        # 3. Flashcards stats
        cursor.execute("SELECT COUNT(*), SUM(CASE WHEN rating = 'know_it' THEN 1 ELSE 0 END), SUM(CASE WHEN rating = 'difficult' THEN 1 ELSE 0 END) FROM flashcards")
        fc_row = cursor.fetchone()
        fc_total = fc_row[0] or 0
        fc_known = fc_row[1] or 0
        fc_difficult = fc_row[2] or 0
        
        # 4. Quiz stats
        cursor.execute("SELECT COUNT(*), AVG(percentage), SUM(score), SUM(total_questions) FROM quiz_attempts")
        q_row = cursor.fetchone()
        quiz_count = q_row[0] or 0
        avg_score = round(q_row[1], 1) if q_row[1] is not None else 0.0
        
        # 5. Topic mastery estimation based on quiz breakdown
        cursor.execute("SELECT topic_breakdown FROM quiz_attempts ORDER BY id DESC")
        topic_rows = cursor.fetchall()
        from services.learner_model import estimate_topic_mastery
        topic_mastery = estimate_topic_mastery(topic_rows)
        revision_topics = []
        for topic, estimate in topic_mastery.items():
            if estimate["average_score"] < 60:
                revision_topics.append(topic)
                
        # Recommended next activity
        if fc_difficult > 0:
            recommendation = {
                "activity": "Review Difficult Flashcards",
                "reason": f"You flagged {fc_difficult} flashcard(s) as difficult.",
                "nav": "flashcards"
            }
        elif revision_topics:
            recommendation = {
                "activity": f"Revisit {revision_topics[0]}",
                "reason": f"Topic accuracy in {revision_topics[0]} is below 70%.",
                "nav": "notes"
            }
        elif quiz_count == 0 and mat_count > 0:
            recommendation = {
                "activity": "Take Your First Diagnostic Quiz",
                "reason": "Practice tests build memory retention and identify gaps.",
                "nav": "quizzes"
            }
        elif mat_count == 0:
            recommendation = {
                "activity": "Upload Study Material",
                "reason": "Get started by adding lecture notes or a textbook chapter to your library.",
                "nav": "library"
            }
        else:
            recommendation = {
                "activity": "Test Understanding in AI Tutor",
                "reason": "Engage with the conversational tutor to test edge cases.",
                "nav": "tutor"
            }

        return {
            "total_materials": mat_count,
            "total_notes": notes_count,
            "total_flashcards": fc_total,
            "known_flashcards": fc_known,
            "difficult_flashcards": fc_difficult,
            "total_quizzes": quiz_count,
            "average_quiz_score": avg_score,
            "topic_mastery": topic_mastery,
            "revision_topics": revision_topics,
            "recommended_activity": recommendation
        }

def ensure_chat_session(chat_id: str, title: Optional[str] = None, source_doc_id: Optional[str] = None):
    """Creates or updates a chat session in SQLite."""
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, source_doc_id FROM chat_sessions WHERE id = ?", (chat_id,))
        row = cursor.fetchone()
        if row:
            # Update timestamp, and update source_doc_id if provided
            new_source = source_doc_id if source_doc_id is not None else row["source_doc_id"]
            cursor.execute("UPDATE chat_sessions SET updated_at = ?, source_doc_id = ? WHERE id = ?", (now_str, new_source, chat_id))
        else:
            clean_title = (title or "New Chat").strip()
            if len(clean_title) > 40:
                clean_title = clean_title[:40] + "..."
            cursor.execute("""
                INSERT INTO chat_sessions (id, title, source_doc_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (chat_id, clean_title, source_doc_id, now_str, now_str))
        conn.commit()

def get_chat_session(chat_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single chat session metadata."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT cs.*, m.name AS source_name
            FROM chat_sessions cs
            LEFT JOIN materials m ON m.id = cs.source_doc_id
            WHERE cs.id = ?
        """, (chat_id,))
        r = cursor.fetchone()
        if not r:
            # Fallback for doc_ids that might be material IDs directly
            mat = get_material(chat_id)
            if mat:
                return {
                    "id": chat_id,
                    "title": mat["name"],
                    "source_doc_id": chat_id,
                    "source_name": mat["name"],
                    "created_at": mat["upload_time"],
                    "updated_at": mat["upload_time"]
                }
            return None
        return {
            "id": r["id"],
            "title": r["title"],
            "source_doc_id": r["source_doc_id"],
            "source_name": r["source_name"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"]
        }

def delete_chat_session(chat_id: str):
    """Deletes a chat session and all its messages."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_sessions WHERE id = ?", (chat_id,))
        cursor.execute("DELETE FROM chat_messages WHERE doc_id = ?", (chat_id,))
        _delete_tutor_events_for_chat(cursor, chat_id)
        conn.commit()

def get_recent_chats() -> List[Dict[str, Any]]:
    """Returns recent chat sessions with source document info, sorted by most recent activity."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        # 1. Fetch from chat_sessions
        cursor.execute("""
            SELECT 
                cs.id,
                cs.title,
                cs.source_doc_id,
                cs.updated_at,
                m.name AS source_name
            FROM chat_sessions cs
            LEFT JOIN materials m ON m.id = cs.source_doc_id
            ORDER BY cs.rowid DESC
        """)
        rows = cursor.fetchall()
        
        results = []
        seen_ids = set()
        for r in rows:
            seen_ids.add(r["id"])
            title = r["title"] or "New Chat"
            results.append({
                "id": r["id"],
                "title": title,
                "timestamp": r["updated_at"],
                "source_doc_id": r["source_doc_id"],
                "source_name": r["source_name"],
                "is_doc_chat": bool(r["source_doc_id"])
            })

        # 2. Legacy fallback: fetch chat_messages for doc_ids not yet in chat_sessions
        cursor.execute("""
            SELECT 
                cm.doc_id,
                cm.content AS first_user_msg,
                cm.timestamp AS last_ts,
                m.name AS source_name
            FROM chat_messages cm
            LEFT JOIN materials m ON m.id = cm.doc_id
            WHERE cm.role = 'user'
            GROUP BY cm.doc_id
            ORDER BY MAX(cm.id) DESC
        """)
        legacy_rows = cursor.fetchall()
        for r in legacy_rows:
            doc_id = r["doc_id"]
            if doc_id not in seen_ids:
                seen_ids.add(doc_id)
                msg = r["first_user_msg"] or "Chat"
                title = msg[:35] + ("..." if len(msg) > 35 else "")
                results.append({
                    "id": doc_id,
                    "title": title,
                    "timestamp": r["last_ts"],
                    "source_doc_id": doc_id if not doc_id.startswith("chat_") else None,
                    "source_name": r["source_name"],
                    "is_doc_chat": not doc_id.startswith("chat_")
                })
        return results

