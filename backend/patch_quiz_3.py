import re
with open(r"C:\Users\kuras\Desktop\ai-study-assistant\backend\services\quiz_service.py", "r", encoding="utf-8") as f:
    text = f.read()

pattern = r'system_instruction = \(\n        "You are an expert.*?\)\n\n    # Gather bounded history'

replacement = """system_instruction = (
        "You are an expert psychometric test designer and educator. "
        "Create high-quality, concept-based diagnostic quiz questions strictly grounded in the provided text. "
        "Return ONLY a valid JSON array of question objects with this schema:\\n"
        "[\\n  {\\n    \\"id\\": 1,\\n    \\"type\\": \\"mcq | true_false | short_answer\\",\\n"
        "    \\"question\\": \\"Question text\\",\\n    \\"options\\": [\\"A) ...\\", \\"B) ...\\", \\"C) ...\\", \\"D) ...\\"] or [\\"True\\", \\"False\\"] or [],\\n"
        "    \\"correct_answer\\": \\"Exact correct option or answer text\\",\\n    \\"rationale\\": \\"Clear explanation of why this answer is correct and why common traps fail\\",\\n"
        "    \\"topic\\": \\"Specific subtopic tested\\",\\n    \\"source_ref\\": \\"Page X or Slide Y if identifiable\\"\\n  }\\n]\\n"
        "Do not include markdown code fence formatting. Return pure JSON text only."
    )

    # Gather bounded history"""

text = re.sub(pattern, replacement, text, flags=re.DOTALL)
with open(r"C:\Users\kuras\Desktop\ai-study-assistant\backend\services\quiz_service.py", "w", encoding="utf-8") as f:
    f.write(text)
print("done")
