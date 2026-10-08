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
def run_tests(*args):
    with open('fiction_test_results.txt', 'w', encoding='utf-8') as f:
        tests = [
            ("Obvious entertainment", "What movies should I watch?"),
            ("Genuine science", "Explain gamma radiation and its effects on DNA."),
            ("Fiction used to teach science", "Use Hulk as an analogy to explain conservation of mass."),
            ("Entertainment disguised as science", "Explain Doctor Doom's powers scientifically and compare him with Iron Man."),
            ("Entertainment disguised as science 2", "Who would win between Thor and Hulk according to physics?"),
            ("Fictional scientific speculation", "Could Mjolnir's behavior be explained using electromagnetism?"),
        ]
        
        for name, q in tests:
            f.write(f"\n--- {name} ---\nQ: {q}\n")
            r = ask_ai_tutor('chat_fiction', q)
            f.write(f"A: {r['answer']}\n")

run_tests()
