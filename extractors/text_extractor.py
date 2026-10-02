import os

def extract_text_content(file_path: str) -> dict:
    """Reads content from plain text, markdown, or code files."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Try utf-8 first, fallback to latin-1
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(file_path, "r", encoding="latin-1") as f:
            content = f.read()

    lines = content.splitlines()
    return {
        "type": "text",
        "total_units": len(lines),
        "unit_name": "lines",
        "content": content
    }
