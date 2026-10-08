import os
from PIL import Image
import io

def extract_pdf_content(file_path: str) -> dict:
    """Extracts text content, handles scanned/handwritten pages via OCR."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        import fitz
        from services.ocr_service import ocr_image
        
        doc = fitz.open(file_path)
        total_pages = len(doc)
        extracted_text = []
        page_images = []
        
        for idx, page in enumerate(doc, start=1):
            text = page.get_text() or ""
            
            # If the page has very little text (likely scanned or handwritten image)
            if len(text.strip()) < 50:
                # Render the page to an image
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Run OCR
                ocr_text = ocr_image(img)
                
                if ocr_text and "[OCR Failed" not in ocr_text:
                    extracted_text.append(f"--- [Page {idx} (OCR)] ---\n{ocr_text.strip()}")
                else:
                    if text.strip():
                        extracted_text.append(f"--- [Page {idx}] ---\n{text.strip()}")
            else:
                extracted_text.append(f"--- [Page {idx}] ---\n{text.strip()}")
            
            # Check for embedded images (limit to first 10 images across doc)
            if len(page_images) < 10:
                images = page.get_images(full=True)
                for img_idx, img in enumerate(images):
                    if len(page_images) >= 10:
                        break
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    page_images.append({
                        "page": idx,
                        "ext": base_image.get("ext", "png"),
                        "bytes": base_image.get("image"),
                        "name": f"page_{idx}_img_{img_idx+1}.{base_image.get('ext', 'png')}"
                    })

        doc.close()
        full_text = "\n\n".join(extracted_text)
        return {
            "type": "text",
            "total_units": total_pages,
            "unit_name": "pages",
            "content": full_text,
            "images": page_images
        }
    except Exception as e:
        # Fallback to pypdf
        print(f"PyMuPDF extraction failed, falling back to pypdf: {e}")
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
        extracted_text = []
        for idx, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_text.append(f"--- [Page {idx}] ---\n{page_text.strip()}")
        return {
            "type": "text",
            "total_units": total_pages,
            "unit_name": "pages",
            "content": "\n\n".join(extracted_text),
            "images": []
        }
