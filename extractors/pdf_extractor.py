import os

def extract_pdf_content(file_path: str) -> dict:
    """Extracts text content, page boundaries, and embedded images from a PDF file using PyMuPDF (fitz) or pypdf."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Try PyMuPDF (fitz) first
    try:
        import fitz
        doc = fitz.open(file_path)
        total_pages = len(doc)
        extracted_text = []
        page_images = []

        for idx, page in enumerate(doc, start=1):
            text = page.get_text() or ""
            if text.strip():
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
    except Exception:
        # Fallback to pypdf
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
