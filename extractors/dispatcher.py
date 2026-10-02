import os
from .pdf_extractor import extract_pdf_content
from .ppt_extractor import extract_ppt_content
from .docx_extractor import extract_docx_content
from .image_extractor import extract_image_content
from .text_extractor import extract_text_content

SUPPORTED_EXTENSIONS = {
    "pdf": [".pdf"],
    "ppt": [".pptx", ".ppt"],
    "docx": [".docx", ".doc"],
    "image": [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"],
    "text": [".txt", ".md", ".py", ".csv", ".json", ".html", ".rst"]
}

def extract_content(file_path: str) -> dict:
    """Detects file format and extracts content accordingly."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    _, ext = os.path.splitext(file_path.lower())
    
    if ext in SUPPORTED_EXTENSIONS["pdf"]:
        data = extract_pdf_content(file_path)
    elif ext in SUPPORTED_EXTENSIONS["ppt"]:
        data = extract_ppt_content(file_path)
    elif ext in SUPPORTED_EXTENSIONS["docx"]:
        data = extract_docx_content(file_path)
    elif ext in SUPPORTED_EXTENSIONS["image"]:
        data = extract_image_content(file_path)
    elif ext in SUPPORTED_EXTENSIONS["text"]:
        data = extract_text_content(file_path)
    else:
        # Fallback to plain text attempt
        data = extract_text_content(file_path)
        
    data["file_path"] = file_path
    data["file_name"] = os.path.basename(file_path)
    return data
