from typing import List, Optional
from PIL import Image
from services.gemini_caller import call_gemini_with_retry
import logging

logger = logging.getLogger(__name__)

def ocr_image(image: Image.Image) -> str:
    """Runs OCR on a single image using the Gemini multimodal model."""
    prompt = (
        "Extract all the text, handwriting, and mathematical notation from this image exactly as it appears. "
        "Preserve the original layout, paragraph breaks, numbered lists, and headings as much as possible. "
        "If the image contains a diagram, label its parts. "
        "Do not invent text that is not there. If an equation or handwriting is completely unreadable, mark it as [Unreadable]."
    )
    try:
        # Convert RGBA to RGB if needed to avoid transparency issues
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
            
        result = call_gemini_with_retry(
            contents=[image, prompt],
            temperature=0.1
        )
        return result.strip()
    except Exception as e:
        logger.warning(f"OCR failed: {e}")
        return f"[OCR Failed: {str(e)}]"

def ocr_images_batched(images: List[Image.Image]) -> List[str]:
    """Runs OCR on a list of images. Processes individually to preserve precise page matching and prevent massive prompt context."""
    results = []
    for i, img in enumerate(images):
        results.append(ocr_image(img))
    return results
