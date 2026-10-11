import sys

file_path = r"C:\Users\kuras\Desktop\ai-study-assistant\backend\extractors\pdf_extractor.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

heuristic = """
def _needs_ocr(text: str) -> bool:
    \"\"\"Heuristic to determine if a page needs OCR due to math/corruption or low text density.\"\"\"
    if len(text.strip()) < 50:
        return True
    if '' in text:
        return True
    lines = [l.strip() for l in text.split('\\n') if l.strip()]
    if not lines:
        return True
    # PyMuPDF flattens complex math equations into multiple 1-2 character lines.
    short_lines = sum(1 for l in lines if len(l) <= 3)
    if len(lines) > 10 and (short_lines / len(lines)) > 0.15:
        return True
    # High density of symbols that are often corrupted or present in math
    suspect_chars = sum(text.count(c) for c in ['^', '~', '\\\\', '|', '_', '{', '}'])
    if suspect_chars > 30:
        return True
    return False

def extract_pdf_content(file_path: str) -> dict:"""

content = content.replace("def extract_pdf_content(file_path: str) -> dict:", heuristic)

old_loop = """            # If the page has very little text (likely scanned or handwritten image)
            if len(text.strip()) < 50:
                # Render the page to an image
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Run OCR
                ocr_text = ocr_image(img)
                
                if ocr_text and "[OCR Failed" not in ocr_text:
                    extracted_text.append(f"--- [Page {idx} (OCR)] ---\\n{ocr_text.strip()}")
                else:
                    if text.strip():
                        extracted_text.append(f"--- [Page {idx}] ---\\n{text.strip()}")
            else:
                extracted_text.append(f"--- [Page {idx}] ---\\n{text.strip()}")"""

new_loop = """            if _needs_ocr(text):
                try:
                    # Render the page to an image
                    pix = page.get_pixmap(dpi=150)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    
                    # Run OCR
                    ocr_text = ocr_image(img)
                    
                    if ocr_text and "[OCR Failed" not in ocr_text:
                        extracted_text.append(f"--- [Page {idx} (OCR)] ---\\n{ocr_text.strip()}")
                    else:
                        if text.strip():
                            extracted_text.append(f"--- [Page {idx}] ---\\n{text.strip()}")
                except Exception as page_e:
                    print(f"OCR failed for page {idx}: {page_e}")
                    if text.strip():
                        extracted_text.append(f"--- [Page {idx}] ---\\n{text.strip()}")
            else:
                extracted_text.append(f"--- [Page {idx}] ---\\n{text.strip()}")"""

if old_loop in content:
    content = content.replace(old_loop, new_loop)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patch applied successfully.")
else:
    print("Could not find old loop block. Check code manually.")
