import sys
import os
import json

test_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_learner.db")
if os.path.exists(test_db_path):
    os.remove(test_db_path)

os.environ["DB_PATH"] = test_db_path
sys.path.insert(0, r"C:\Users\kuras\Desktop\ai-study-assistant\backend")

import db
from services.quiz_service import evaluate_quiz

def setup():
    db.DB_PATH = test_db_path
    db.init_db()
    db.save_material({
        "id": "doc_test1",
        "name": "Cellular Biology.pdf",
        "type": "PDF Document",
        "size_kb": 1024,
        "upload_time": "Oct 10, 10:00",
        "data": {"content": "Biology is the study of life."},
        "status": "Ready",
        "error": None
    })

def print_analytics():
    analytics = db.get_learning_progress()
    print("--- Analytics State ---")
    print(f"Total Quizzes: {analytics.get('total_quizzes')}")
    print(f"Average Score: {analytics.get('average_quiz_score')}")
    print(f"Topic Mastery: {json.dumps(analytics.get('topic_mastery'), indent=2)}")
    print(f"Revision Topics: {analytics.get('revision_topics')}")
    print(f"Recommended Activity: {json.dumps(analytics.get('recommended_activity'), indent=2)}")
    print("-----------------------\n")

def run():
    setup()
    
    questions = [
        {"id": "q1", "question": "What is mitochondria?", "correct_answer": "Powerhouse", "topic": "Mitochondria"},
        {"id": "q2", "question": "Where is mitochondria?", "correct_answer": "Cytoplasm", "topic": "Mitochondria"},
        {"id": "q3", "question": "What is DNA?", "correct_answer": "Genetic code", "topic": "Genetics"},
    ]
    
    print("Submitting Attempt 1: 0% on Mitochondria, 100% on Genetics")
    user_answers_1 = {
        "q1": "Brain",
        "q2": "Nucleus",
        "q3": "Genetic code"
    }
    
    from unittest.mock import patch
    with patch("services.gemini_caller.call_gemini_with_retry", return_value="[]"):
        res1 = evaluate_quiz("doc_test1", questions, user_answers_1)
        print(f"Attempt 1 Score: {res1['score']}/{res1['total_questions']} ({res1['percentage']}%)")
    
    print_analytics()
    
    print("Submitting Attempt 2: 100% on Mitochondria, 100% on Genetics")
    user_answers_2 = {
        "q1": "Powerhouse",
        "q2": "Cytoplasm",
        "q3": "Genetic code"
    }
    
    with patch("services.gemini_caller.call_gemini_with_retry", return_value="[]"):
        res2 = evaluate_quiz("doc_test1", questions, user_answers_2)
        print(f"Attempt 2 Score: {res2['score']}/{res2['total_questions']} ({res2['percentage']}%)")
        
    print_analytics()

if __name__ == "__main__":
    run()
    if os.path.exists(test_db_path):
        try:
            os.remove(test_db_path)
        except OSError:
            pass

