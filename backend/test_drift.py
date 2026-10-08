from unittest.mock import patch
import sys
sys.path.append(r'C:\Users\kuras\Desktop\ai-study-assistant\backend')
from services.ai_tutor import ask_ai_tutor

@patch('db.get_material', return_value=None)
@patch('db.save_chat_message', return_value=None)
@patch('db.get_chat_session', return_value=None)
@patch('db.ensure_chat_session', return_value=None)
@patch('db.get_all_materials', return_value=[])
def run_context_test(*args):
    history = [
        {"role": "user", "content": "Explain Hulk's gamma radiation scientifically."},
        {"role": "assistant", "content": "Gamma radiation is high-frequency electromagnetic radiation... [Academic explanation]"}
    ]
    with patch('db.get_chat_history', return_value=history):
        q = "Okay, now Thor and Hulk."
        print(f"Q: {q}")
        r = ask_ai_tutor('chat_fiction', q)
        print(f"A: {r['answer']}")

run_context_test()
