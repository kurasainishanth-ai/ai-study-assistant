import sys

file_path = r"C:\Users\kuras\Desktop\ai-study-assistant\backend\extractors\pdf_extractor.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("if '' in text:", "if '\uFFFD' in text:")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
