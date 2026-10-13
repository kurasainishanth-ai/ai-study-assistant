import os
from concurrent.futures import ThreadPoolExecutor
from PIL import Image


def _needs_ocr(text: str, has_scanned_image: bool = False) -> bool:
    """Only OCR image-backed pages with missing or clearly corrupted text."""
    cleaned = text.strip()
    # Empty pages and sparse vector-only pages cannot benefit from image OCR.
    # Scanned pages usually have a full-page raster image and little/no text.
    return has_scanned_image and (len(cleaned) < 80 or "�" in cleaned)


def _has_scanned_page_image(page, images) -> bool:
    """Return true when raster images cover enough of the page to indicate a scan."""
    if not images:
        return False
    try:
        page_area = float(page.rect.get_area())
        if page_area <= 0:
            return False
        image_area = sum(
            rect.get_area()
            for image in images
            for rect in page.get_image_rects(image[0])
        )
        return image_area / page_area >= 0.25
    except (AttributeError, TypeError, ValueError):
        return False

def extract_pdf_content(file_path: str) -> dict:
    """Extracts text content, handles scanned/handwritten pages via OCR."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        import fitz
        from services.ocr_service import ocr_image
        
        doc = fitz.open(file_path)
        total_pages = len(doc)
        extracted_text = {}
        ocr_page_numbers = set()
        page_images = []

        ocr_pool = ThreadPoolExecutor(max_workers=2)
        pending_ocr = []
        try:
            for idx, page in enumerate(doc, start=1):
                text = page.get_text() or ""
                images = page.get_images(full=True)
                has_scanned_image = _has_scanned_page_image(page, images)

                if _needs_ocr(text, has_scanned_image=has_scanned_image):
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        pending_ocr.append((idx, text, ocr_pool.submit(ocr_image, img)))
                        if len(pending_ocr) == 2:
                            _collect_ocr_results(pending_ocr, extracted_text, ocr_page_numbers)
                            pending_ocr.clear()
                    except Exception as page_e:
                        print(f"OCR preparation failed for page {idx}: {page_e}")
                        if text.strip():
                            extracted_text[idx] = text.strip()
                elif text.strip():
                    extracted_text[idx] = text.strip()
            
            # Check for embedded images (limit to first 10 images across doc)
                if len(page_images) < 10:
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

            if pending_ocr:
                _collect_ocr_results(pending_ocr, extracted_text, ocr_page_numbers)
                pending_ocr.clear()
        finally:
            ocr_pool.shutdown(wait=True)

        doc.close()
        full_text = "\n\n".join(
            f"--- [Page {idx}{' (OCR)' if idx in ocr_page_numbers else ''}] ---\n{text}"
            for idx, text in sorted(extracted_text.items())
        )
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


def _collect_ocr_results(pending, extracted_text, ocr_page_numbers):
    """Collect a small OCR batch while preserving page order and fallback text."""
    for idx, fallback_text, future in pending:
        try:
            ocr_text = future.result()
            if ocr_text and "[OCR Failed" not in ocr_text:
                extracted_text[idx] = ocr_text.strip()
                ocr_page_numbers.add(idx)
            elif fallback_text.strip():
                extracted_text[idx] = fallback_text.strip()
        except Exception as page_error:
            print(f"OCR failed for page {idx}: {page_error}")
            if fallback_text.strip():
                extracted_text[idx] = fallback_text.strip()
