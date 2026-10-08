from unittest.mock import patch
import sys
sys.path.append(r'C:\Users\kuras\Desktop\ai-study-assistant\backend')
from services.ai_tutor import ask_ai_tutor

@patch('db.get_material', return_value=None)
@patch('db.get_chat_history', return_value=[])
@patch('db.save_chat_message', return_value=None)
@patch('db.get_chat_session', return_value=None)
@patch('db.ensure_chat_session', return_value=None)
@patch('db.get_all_materials', return_value=[])
def run_context_test(*args):
    q = "Explain Doctor Doom's powers scientifically and compare him with Iron Man."
    print(f"Q: {q}")
    r = ask_ai_tutor('chat_fiction', q)
    print(f"A: {r['answer']}")

run_context_test()
