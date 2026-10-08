import db
from agent.orchestrator import generate_dynamic_response
import logging
from services.gemini_caller import call_gemini_with_retry
from agent.prompts import build_system_instruction
from google.genai import types

logging.basicConfig(level=logging.DEBUG)
db.init_db()
doc_id = 'test_doc_123'
db.save_material({
    'id': doc_id,
    'name': 'test.pdf',
    'type': 'pdf',
    'size_kb': 1,
    'upload_time': 'now',
    'data': {'content': 'This is a test PDF about Machine Learning.', 'total_units': 1, 'unit_name': 'pages'},
    'status': 'success',
    'error': ''
})

print("Testing raw API output...")
contents = [
    types.Content(role="user", parts=[types.Part.from_text(text="Here is the study material context:\n\nThis is a test PDF about Machine Learning.\n\n[System message: Please acknowledge receipt and do not generate any educational output yet.]")]),
    types.Content(role="model", parts=[types.Part.from_text(text="Acknowledged.")]),
    types.Content(role="user", parts=[types.Part.from_text(text="Explain gradient descent to me.")])
]
sys_instruction = build_system_instruction()
raw = call_gemini_with_retry(contents=contents, system_instruction=sys_instruction, temperature=0.3)
print("RAW RESPONSE:")
print(raw)

print("PARSED:")
res = generate_dynamic_response(doc_id, 'Explain gradient descent to me.')
print(res)