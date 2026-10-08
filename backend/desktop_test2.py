from unittest.mock import patch
from services.ai_tutor import ask_ai_tutor
import db

def mock_get_chat_history(doc_id): return []
def mock_get_all_materials(): return []
def mock_save_chat_message(*args, **kwargs): pass
def mock_ensure_chat_session(*args, **kwargs): pass
def mock_get_chat_session(doc_id): return None

@patch('db.get_chat_session', side_effect=mock_get_chat_session)
@patch('db.get_all_materials', side_effect=mock_get_all_materials)
@patch('db.get_chat_history', side_effect=mock_get_chat_history)
@patch('db.save_chat_message', side_effect=mock_save_chat_message)
@patch('db.ensure_chat_session', side_effect=mock_ensure_chat_session)
def run_tests(*args):
    q = "What movies should I watch?"
    print(f"Q: {q}")
    r = ask_ai_tutor('chat_123', q)
    print(f"A: {r['answer']}")

run_tests()
