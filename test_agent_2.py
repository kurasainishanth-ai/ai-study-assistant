import db
import uuid
from agent.orchestrator import generate_dynamic_response
db.init_db()
doc_id = str(uuid.uuid4())
db.save_material({'id': doc_id, 'name': 'test.pdf', 'file_type': 'pdf', 'size_kb': 1, 'upload_time': 'now', 'content': 'This is a test PDF about Machine Learning.', 'total_units': 1, 'unit_name': 'pages', 'status': 'success', 'error': ''})
result = generate_dynamic_response(doc_id, 'What is the PDF about? Keep it very brief.')
print(result)
