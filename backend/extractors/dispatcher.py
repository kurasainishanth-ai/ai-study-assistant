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

SUPPORTED_FILE_SUFFIXES = frozenset(
    extension
    for extensions in SUPPORTED_EXTENSIONS.values()
    for extension in extensions
)


def is_supported_file(file_path: str) -> bool:
    """Return whether a filename is one of the formats the app can extract."""
    _, ext = os.path.splitext(os.path.basename(file_path).lower())
    return ext in SUPPORTED_FILE_SUFFIXES

def extract_content(file_path: str) -> dict:
    """Detects file format and extracts content accordingly."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    _, ext = os.path.splitext(file_path.lower())

    if ext not in SUPPORTED_FILE_SUFFIXES:
        raise ValueError(f"Unsupported file type '{ext or 'unknown'}'. Upload a PDF, presentation, Word document, image, or text file.")
    
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
        data = extract_text_content(file_path)
        
    data["file_path"] = file_path
    data["file_name"] = os.path.basename(file_path)
    return data
