import os
from PIL import Image

def extract_image_content(file_path: str) -> dict:
    """Loads an image file, runs OCR via Gemini, and returns extracted text."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    from services.ocr_service import ocr_image
    
    image = Image.open(file_path)
    
    ocr_text = ocr_image(image)
        
    return {
        "type": "text",  # Masquerade as text so all tools work seamlessly
        "total_units": 1,
        "unit_name": "image",
        "content": ocr_text if ocr_text else "[No text detected]",
        "dimensions": f"{image.width}x{image.height}",
        "format": image.format or "JPEG"
    }
