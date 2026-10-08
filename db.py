import sqlite3
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

DB_PATH = "studyverse.db"

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
                error TEXT
            )
        """)

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

        # 6. Activity Log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """)

        conn.commit()

# --- Material Operations ---

def save_material(item: Dict[str, Any]):
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        data = item.get("data") or {}
        cursor.execute("""
            INSERT OR REPLACE INTO materials 
            (id, name, file_type, size_kb, upload_time, content, total_units, unit_name, status, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            item.get("error")
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
        cursor.execute("SELECT * FROM materials ORDER BY upload_time DESC")
        rows = cursor.fetchall()
        materials = []
        for r in rows:
            materials.append({
                "id": r["id"],
                "name": r["name"],
                "type": r["file_type"],
                "size_kb": r["size_kb"],
                "upload_time": r["upload_time"],
                "status": r["status"],
                "error": r["error"],
                "content": r["content"] or "",
                "total_units": r["total_units"] or 1,
                "unit_name": r["unit_name"] or "units"
            })
        return materials

def get_material(doc_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM materials WHERE id = ?", (doc_id,))
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r["id"],
            "name": r["name"],
            "type": r["file_type"],
            "size_kb": r["size_kb"],
            "upload_time": r["upload_time"],
            "status": r["status"],
            "error": r["error"],
            "content": r["content"] or "",
            "total_units": r["total_units"] or 1,
            "unit_name": r["unit_name"] or "units"
        }

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
        conn.commit()
        return note_id

def update_note(note_id: int, content: str):
    init_db()
    now_str = datetime.now().strftime("%b %d, %H:%M")
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notes SET content = ?, updated_at = ? WHERE id = ?", (content, now_str, note_id))
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
        cursor.execute("SELECT topic_breakdown FROM quiz_attempts")
        topic_rows = cursor.fetchall()
        topic_scores: Dict[str, List[float]] = {}
        for r in topic_rows:
            if r[0]:
                tb = json.loads(r[0])
                for topic, stat in tb.items():
                    if isinstance(stat, dict):
                        pct = (stat.get("correct", 0) / max(stat.get("total", 1), 1)) * 100
                    else:
                        pct = float(stat)
                    topic_scores.setdefault(topic, []).append(pct)
                    
        topic_mastery = {}
        revision_topics = []
        for t, scores in topic_scores.items():
            avg_t = round(sum(scores) / len(scores), 1)
            topic_mastery[t] = {
                "average_score": avg_t,
                "attempts": len(scores),
                "status": "Mastered" if avg_t >= 85 and len(scores) >= 2 else ("Review Recommended" if avg_t < 70 else "In Progress")
            }
            if avg_t < 70:
                revision_topics.append(t)
                
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

def get_recent_chats() -> List[Dict[str, Any]]:
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT doc_id, MIN(id) as first_id, content, timestamp 
            FROM chat_messages 
            WHERE doc_id LIKE 'chat_%' AND role = 'user'
            GROUP BY doc_id
            ORDER BY MAX(id) DESC
        """)
        rows = cursor.fetchall()
        return [{"id": r["doc_id"], "title": r["content"][:30] + ("..." if len(r["content"]) > 30 else ""), "timestamp": r["timestamp"]} for r in rows]

