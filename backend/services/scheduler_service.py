"""
scheduler_service.py — feature/yagnesh

Smart Revision Scheduler:
Builds adaptive, spaced revision plans tailored to student exam dates,
daily available time, and authentic learning progress (quiz scores).
"""

import json
import logging
import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional

import db

logger = logging.getLogger("studyverse.scheduler")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(levelname)s] [%(name)s] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


def _extract_fallback_topics(content: str, doc_name: str) -> List[str]:
    """Extracts authentic candidate topic headings from text when no map or notes exist."""
    lines = content.split("\n")
    candidates = []
    for line in lines:
        cleaned = line.strip().strip("#*- \t")
        if (
            len(cleaned) >= 5
            and len(cleaned) <= 60
            and not cleaned.lower().startswith("page ")
            and not cleaned.lower().startswith("slide ")
            and not cleaned.lower().startswith("figure ")
            and not cleaned.lower().startswith("http")
            and not cleaned.endswith(".")
        ):
            if re.match(r"^[A-Z0-9][A-Za-z0-9\s\-_:()]+$", cleaned):
                if cleaned not in candidates:
                    candidates.append(cleaned)
        if len(candidates) >= 8:
            break

    if not candidates:
        base = doc_name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
        candidates = [
            f"{base} — Core Principles",
            f"{base} — Methodologies & Operations",
            f"{base} — Key Algorithms & Mechanisms",
            f"{base} — Comparative Analysis",
            f"{base} — Real-world Applications & Edge Cases"
        ]
    return candidates[:8]


def get_material_topics(doc_id: str) -> Dict[str, Any]:
    """
    Extracts authentic topics for a document and decorates them with real quiz performance.
    Does NOT fabricate quiz scores when none exist.
    """
    mat = db.get_material(doc_id)
    if not mat:
        raise ValueError(f"Study material '{doc_id}' not found.")

    doc_name = mat.get("name", "Document")
    content = mat.get("content", "") or ""

    # 1. Gather topics from existing Knowledge Map or Notes if available
    topic_names = []
    
    # Try Knowledge Map nodes first (most granular and structured)
    try:
        km = db.get_knowledge_map(doc_id)
        if km and km.get("nodes"):
            for n in km["nodes"]:
                label = n.get("label", "").strip()
                if label and label not in topic_names:
                    topic_names.append(label)
    except Exception:
        pass

    # If few topics, check Notes headings
    if len(topic_names) < 4:
        try:
            notes = db.get_notes(doc_id)
            if notes and isinstance(notes, list):
                for note in notes:
                    note_content = note.get("content", "")
                    headings = re.findall(r"^##?\s+([^\n]+)", note_content, re.MULTILINE)
                    for h in headings:
                        h_clean = h.strip().strip("#* ")
                        if h_clean and h_clean not in topic_names and len(h_clean) <= 60:
                            topic_names.append(h_clean)
        except Exception:
            pass

    # Fallback to document structural extraction
    if len(topic_names) < 3:
        fallback = _extract_fallback_topics(content, doc_name)
        for fb in fallback:
            if fb not in topic_names:
                topic_names.append(fb)

    topic_names = topic_names[:10]  # Cap at 10 high-yield topics

    # 2. Correlate with genuine quiz performance
    attempts = db.get_quiz_attempts(doc_id)
    topic_quiz_scores: Dict[str, List[float]] = {}
    for a in attempts:
        tb = a.get("topic_breakdown", {})
        if isinstance(tb, dict):
            for t_name, stat in tb.items():
                t_lower = t_name.strip().lower()
                if isinstance(stat, dict):
                    pct = (stat.get("correct", 0) / max(stat.get("total", 1), 1)) * 100
                else:
                    try:
                        pct = float(stat)
                    except (ValueError, TypeError):
                        pct = 50.0
                topic_quiz_scores.setdefault(t_lower, []).append(pct)

    # 3. Build enriched topic metadata
    decorated_topics = []
    for idx, t in enumerate(topic_names):
        t_lower = t.strip().lower()
        
        # Check direct or partial match in quiz breakdown
        matched_scores = []
        for q_topic, scores in topic_quiz_scores.items():
            if q_topic in t_lower or t_lower in q_topic:
                matched_scores.extend(scores)

        if matched_scores:
            avg_score = round(sum(matched_scores) / len(matched_scores), 1)
            has_data = True
            if avg_score < 70.0:
                priority = "weak"
            elif avg_score < 85.0:
                priority = "medium"
            else:
                priority = "strong"
        else:
            avg_score = None
            has_data = False
            priority = "medium"  # Neutral default for student self-rating

        decorated_topics.append({
            "id": f"topic_{idx + 1}",
            "name": t,
            "performance_data_available": has_data,
            "quiz_score": avg_score,
            "priority": priority,  # "weak" | "medium" | "strong"
            "attempts_count": len(matched_scores)
        })

    return {
        "doc_id": doc_id,
        "doc_name": doc_name,
        "has_quiz_data": len(attempts) > 0,
        "topics": decorated_topics
    }


def generate_revision_plan(
    doc_id: str,
    exam_date_str: str,
    daily_hours: float,
    start_date_str: Optional[str] = None,
    topic_overrides: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Constructs a concrete, day-by-day revision schedule respecting time constraints,
    prioritizing weak concepts, and incorporating spaced repetition & final review.
    """
    topic_meta = get_material_topics(doc_id)
    doc_name = topic_meta["doc_name"]
    topics = topic_meta["topics"]

    if not topics:
        raise ValueError(f"No study topics could be identified for material '{doc_id}'.")

    # 1. Validate Dates
    today = date.today()
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError(f"Invalid start date format '{start_date_str}'. Expected YYYY-MM-DD.")
    else:
        start_date = today

    try:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Invalid exam date format '{exam_date_str}'. Expected YYYY-MM-DD.")

    if exam_date < start_date:
        raise ValueError(f"Exam date ({exam_date}) must be on or after revision start date ({start_date}).")

    available_days = (exam_date - start_date).days
    if available_days == 0:
        available_days = 1  # Same-day / crash revision

    # 2. Validate Daily Hours
    daily_hours = max(0.5, min(float(daily_hours), 12.0))
    daily_mins = int(daily_hours * 60)
    total_available_mins = available_days * daily_mins

    # 3. Apply Student Topic Overrides
    if topic_overrides and isinstance(topic_overrides, dict):
        for t in topics:
            if t["id"] in topic_overrides:
                override_val = topic_overrides[t["id"]].lower()
                if override_val in ("weak", "medium", "strong"):
                    t["priority"] = override_val
            elif t["name"] in topic_overrides:
                override_val = topic_overrides[t["name"]].lower()
                if override_val in ("weak", "medium", "strong"):
                    t["priority"] = override_val

    # 4. Group & Prioritize Topics
    weak_topics = [t for t in topics if t["priority"] == "weak"]
    medium_topics = [t for t in topics if t["priority"] == "medium"]
    strong_topics = [t for t in topics if t["priority"] == "strong"]

    # Calculate recommended revision minutes
    # Weak topics: 90 mins (concept study + spaced recall + quiz)
    # Medium topics: 55 mins (focused study + recall)
    # Strong topics: 25 mins (rapid refresher)
    recommended_mins = (
        len(weak_topics) * 90
        + len(medium_topics) * 55
        + len(strong_topics) * 25
        + (60 if available_days >= 3 else 30)  # Final review
    )

    is_tight = total_available_mins < (recommended_mins * 0.75)
    tight_warning = None
    if is_tight:
        avail_hrs = round(total_available_mins / 60, 1)
        rec_hrs = round(recommended_mins / 60, 1)
        tight_warning = (
            f"Tight Revision Window: You have {avail_hrs} hours available across {available_days} day(s), "
            f"while thorough revision takes ~{rec_hrs} hours. Sessions have been condensed and concentrated "
            f"on your highest-priority weak topics."
        )

    # 5. Day-by-Day Task Allocation
    days_list = []
    task_counter = 1

    # Reserve the last day for final review if available_days >= 2
    regular_days_count = available_days - 1 if available_days >= 2 else 1

    # Prepare queue of topics with required sessions
    # Each item: (topic, session_type, minutes, priority, tips)
    primary_sessions = []

    # Weak topics get primary deep dive
    for t in weak_topics:
        primary_sessions.append({
            "topic": t["name"],
            "type": "Deep Conceptual Breakdown",
            "minutes": 45 if not is_tight else 30,
            "priority": "weak",
            "tips": "Focus on foundational rules, edge cases, and work through 2 concrete examples."
        })

    # Medium topics get focused review
    for t in medium_topics:
        primary_sessions.append({
            "topic": t["name"],
            "type": "Core Concept Review",
            "minutes": 35 if not is_tight else 25,
            "priority": "medium",
            "tips": "Summarize key formulas, definitions, and operational sequences."
        })

    # Strong topics get rapid refresher
    for t in strong_topics:
        primary_sessions.append({
            "topic": t["name"],
            "type": "Rapid Knowledge Refresh",
            "minutes": 20 if not is_tight else 15,
            "priority": "strong",
            "tips": "Fast active recall: verify key terminology and high-yield summary points."
        })

    # Secondary spaced recall sessions for weak topics (if time permits)
    secondary_sessions = []
    for t in weak_topics:
        secondary_sessions.append({
            "topic": t["name"],
            "type": "Spaced Recall & Practice Quiz",
            "minutes": 30 if not is_tight else 20,
            "priority": "weak",
            "tips": "Test yourself without looking at notes. Take a practice quiz on this topic."
        })

    # Distribute sessions across available regular days
    day_buckets: List[List[Dict[str, Any]]] = [[] for _ in range(regular_days_count)]
    day_remaining_mins = [daily_mins for _ in range(regular_days_count)]

    # Pass 1: Place primary sessions
    for session in primary_sessions:
        # Find day with most remaining time
        best_day = max(range(regular_days_count), key=lambda d: day_remaining_mins[d])
        day_buckets[best_day].append(session)
        day_remaining_mins[best_day] -= session["minutes"]

    # Pass 2: Place secondary spaced sessions (spaced out later in the schedule)
    for session in secondary_sessions:
        # Prefer the second half of regular days for spaced recall
        half_start = regular_days_count // 2 if regular_days_count > 1 else 0
        best_day = max(range(half_start, regular_days_count), key=lambda d: day_remaining_mins[d])
        day_buckets[best_day].append(session)
        day_remaining_mins[best_day] -= session["minutes"]

    # Assemble each regular day into structured payload
    for d_idx in range(regular_days_count):
        cur_date = start_date + timedelta(days=d_idx)
        cur_date_str = cur_date.strftime("%Y-%m-%d")
        cur_date_display = cur_date.strftime("%a, %b %d")

        tasks = []
        for s in day_buckets[d_idx]:
            tasks.append({
                "id": f"task_{task_counter}",
                "day_number": d_idx + 1,
                "date": cur_date_str,
                "topic": s["topic"],
                "task_type": s["type"],
                "estimated_minutes": s["minutes"],
                "priority": s["priority"],
                "completed": False,
                "tips": s["tips"]
            })
            task_counter += 1

        days_list.append({
            "day_number": d_idx + 1,
            "date": cur_date_str,
            "date_display": cur_date_display,
            "focus": "Core Learning & Practice" if d_idx == 0 else "Topic Coverage & Spaced Review",
            "tasks": tasks
        })

    # Final Exam Review Day (if available_days >= 2)
    if available_days >= 2:
        final_date = start_date + timedelta(days=available_days - 1)
        final_tasks = [
            {
                "id": f"task_{task_counter}",
                "day_number": available_days,
                "date": final_date.strftime("%Y-%m-%d"),
                "topic": f"Comprehensive {doc_name} Review",
                "task_type": "Exam Readiness & High-Yield Drill",
                "estimated_minutes": min(45, daily_mins),
                "priority": "weak",
                "completed": False,
                "tips": "Review your missed quiz questions and run through high-yield flashcards once more."
            },
            {
                "id": f"task_{task_counter + 1}",
                "day_number": available_days,
                "date": final_date.strftime("%Y-%m-%d"),
                "topic": "Final Formula & Pitfall Check",
                "task_type": "Rapid Cheat Sheet Review",
                "estimated_minutes": min(30, max(15, daily_mins - 45)),
                "priority": "medium",
                "completed": False,
                "tips": "Quick check of common student pitfalls, key definitions, and test-taking pacing."
            }
        ]
        task_counter += 2

        days_list.append({
            "day_number": available_days,
            "date": final_date.strftime("%Y-%m-%d"),
            "date_display": final_date.strftime("%a, %b %d"),
            "focus": "🎯 Final Exam Simulation & Consolidation",
            "tasks": final_tasks
        })

    all_tasks = [t for d in days_list for t in d["tasks"]]
    total_planned_mins = sum(t["estimated_minutes"] for t in all_tasks)

    plan = {
        "doc_id": doc_id,
        "doc_name": doc_name,
        "exam_date": exam_date_str,
        "start_date": start_date_str or start_date.strftime("%Y-%m-%d"),
        "available_days": available_days,
        "daily_hours": daily_hours,
        "total_planned_hours": round(total_planned_mins / 60, 1),
        "total_tasks": len(all_tasks),
        "completed_tasks": 0,
        "completion_percentage": 0,
        "is_tight": is_tight,
        "tight_warning": tight_warning,
        "topic_counts": {
            "weak": len(weak_topics),
            "medium": len(medium_topics),
            "strong": len(strong_topics),
            "total": len(topics)
        },
        "topics": topics,
        "days": days_list
    }

    # Persist in SQLite
    try:
        db.save_revision_plan(doc_id, plan)
    except Exception as err:
        logger.warning(f"Could not persist revision plan to SQLite: {err}")

    return plan
