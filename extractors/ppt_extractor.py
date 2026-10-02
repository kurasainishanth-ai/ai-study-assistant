import os
from pptx import Presentation

def extract_ppt_content(file_path: str) -> dict:
    """Extracts text content and notes from a PowerPoint (.pptx) presentation."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    prs = Presentation(file_path)
    total_slides = len(prs.slides)
    
    extracted_text = []
    for idx, slide in enumerate(prs.slides, start=1):
        slide_parts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    line = paragraph.text.strip()
                    if line:
                        slide_parts.append(line)
        
        # Check for slide notes if available
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                slide_parts.append(f"[Notes: {notes}]")
                
        if slide_parts:
            slide_content = "\n".join(slide_parts)
            extracted_text.append(f"--- [Slide {idx}] ---\n{slide_content}")
            
    full_text = "\n\n".join(extracted_text)
    return {
        "type": "text",
        "total_units": total_slides,
        "unit_name": "slides",
        "content": full_text
    }
