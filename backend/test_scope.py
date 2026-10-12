from unittest.mock import patch
import sys
sys.path.append(r'C:\Users\kuras\Desktop\ai-study-assistant\backend')
from services.ai_tutor import ask_ai_tutor
import db

def mock_get_material(doc_id):
    if doc_id == 'doc_ml':
        return {
            'id': 'doc_ml',
            'name': 'ML Guide',
            'content': 'Normalization scales data to [0,1] or standardizes it. This helps algorithms converge faster.'
        }
    return None

@patch('db.get_material', side_effect=mock_get_material)
@patch('db.get_chat_history', return_value=[])
@patch('db.save_chat_message', return_value=None)
@patch('db.get_chat_session', return_value=None)
@patch('db.ensure_chat_session', return_value=None)
@patch('db.get_all_materials', return_value=[])
def run_tests(*args):
    print("=== A. NO DOCUMENT / NEW CHAT ===")
    tests_a = [
        "Explain gradient descent.",
        "Teach me binary trees.",
        "Help me understand backpropagation.",
        "What movies should I watch?",
        "Which phone should I buy?"
    ]
    for q in tests_a:
        print(f"\nQ: {q}")
        r = ask_ai_tutor('chat_new', q)
        print(f"A: {r['answer']}")

    print("\n\n=== B. DOCUMENT AVAILABLE ===")
    tests_b = [
        "Explain normalization from this PDF.",
        "The PDF doesn't explain why normalization reduces redundancy. Explain why.",
        "Recommend some movies."
    ]
    for q in tests_b:
        print(f"\nQ: {q}")
        r = ask_ai_tutor('chat_withdoc', q, source_doc_id='doc_ml')
        print(f"A: {r['answer']}")

run_tests()
