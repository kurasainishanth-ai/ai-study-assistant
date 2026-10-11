import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from extractors.pdf_extractor import extract_pdf_content

# Assuming BayesianParameterEstimation.pdf is in the workspace root or some uploads folder?
# The user uploaded it, let's find it.
def find_pdf():
    for root, dirs, files in os.walk(r"C:\Users\kuras\Desktop\ai-study-assistant"):
        if "BayesianParameterEstimation.pdf" in files:
            return os.path.join(root, "BayesianParameterEstimation.pdf")
    return None

pdf_path = find_pdf()
if not pdf_path:
    print("Could not find the PDF file.")
    sys.exit(1)

print(f"Testing extraction on {pdf_path}")
result = extract_pdf_content(pdf_path)

content = result.get("content", "")
pages = content.split("--- [Page ")
for p in pages:
    if p.startswith("4"):
        print("PAGE 4 RESULT:\n")
        print(p)
