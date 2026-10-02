import os
from PIL import Image

def extract_image_content(file_path: str) -> dict:
    """Loads and validates an image file for multimodal analysis with Gemini."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    image = Image.open(file_path)
    
    # Convert RGBA or CMYK to RGB if needed
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
        
    return {
        "type": "image",
        "total_units": 1,
        "unit_name": "image",
        "image": image,
        "dimensions": f"{image.width}x{image.height}",
        "format": image.format or "JPEG"
    }
