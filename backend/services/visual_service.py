import base64
import io
from typing import Dict, Any, Optional
from PIL import Image
from google.genai import types
from config import get_gemini_client, DEFAULT_MODEL
import db

def explain_visual_diagram(doc_id: str, image_bytes: bytes, user_question: Optional[str] = None) -> Dict[str, Any]:
    """Uses Gemini multimodal understanding to explain diagrams, charts, or figures."""
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    task_desc = user_question if user_question else (
        "Provide a comprehensive, pedagogical breakdown of this visual diagram:\n"
        "1. **Core Subject & Purpose**: What does this diagram illustrate?\n"
        "2. **Key Components & Labels**: Identify and define all major labels, flows, and symbols.\n"
        "3. **Formulas / Scientific Principles**: Note any chemical reactions, mathematical equations, or physical laws depicted.\n"
        "4. **Study Takeaway**: What is the single most important concept a student must remember from this visual?"
    )

    client = get_gemini_client()
    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=[image, task_desc],
        config=types.GenerateContentConfig(
            system_instruction="You are StudyVerse Visual Learning Specialist. Explain visual diagrams with academic precision, highlighting relationships and processes.",
            temperature=0.2
        )
    )

    return {
        "explanation": response.text,
        "width": image.width,
        "height": image.height,
        "format": image.format or "PNG"
    }

def generate_concept_illustration(prompt: str) -> Dict[str, Any]:
    """Generates an educational concept illustration using Google's Imagen model."""
    client = get_gemini_client()
    enhanced_prompt = f"Educational textbook diagram, clean vector style, clear labels, academic, modern scientific illustration: {prompt}"
    
    try:
        result = client.models.generate_images(
            model="imagen-3.0-generate-002",
            prompt=enhanced_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/png",
                aspect_ratio="1:1"
            )
        )
        if result.generated_images:
            img_bytes = result.generated_images[0].image.image_bytes
            b64_str = base64.b64encode(img_bytes).decode("utf-8")
            return {
                "success": True,
                "image_b64": f"data:image/png;base64,{b64_str}",
                "prompt": prompt
            }
        return {"success": False, "error": "No image was returned by Imagen."}
    except Exception as e:
        return {"success": False, "error": f"Image generation unavailable: {str(e)}"}
