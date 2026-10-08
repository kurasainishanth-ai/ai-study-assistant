import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from extractors import extract_content, SUPPORTED_EXTENSIONS
from summarizer import generate_study_summary, SUMMARY_STYLES
from config import GEMINI_API_KEY

def print_banner():
    print("\n" + "=" * 55)
    print("      MULTIMODAL AI STUDY ASSISTANT (Powered by Gemini)")
    print("=" * 55)
    print("Supported formats: Images (.png, .jpg), PDF (.pdf),")
    print("                   Presentations (.pptx), Text (.txt, .md)")
    print("=" * 55 + "\n")

def check_api_key():
    is_placeholder = any(
        p in GEMINI_API_KEY.lower() 
        for p in ["your_", "placeholder", "actual_key", "here"]
    )
    if not GEMINI_API_KEY or is_placeholder:
        print("[!] Notice: No valid Gemini API key found in .env.")
        print("    Currently it is set to a placeholder.")
        print("    To fix this:")
        print("    1. Go to https://aistudio.google.com/app/apikey")
        print("    2. Click 'Create API key' (it is free).")
        print("    3. Copy the key (starts with 'AIzaSy...') and paste it in .env:")
        print("       GEMINI_API_KEY=AIzaSy...\n")
        return False
    return True

def select_style() -> str:
    print("\nSelect the type of study summary you need:")
    style_keys = list(SUMMARY_STYLES.keys())
    for idx, key in enumerate(style_keys, start=1):
        print(f"  [{idx}] {SUMMARY_STYLES[key]['title']}")
        
    while True:
        choice = input(f"\nEnter choice (1-{len(style_keys)}, default is 2): ").strip()
        if not choice:
            return "bullet"
        if choice.isdigit() and 1 <= int(choice) <= len(style_keys):
            return style_keys[int(choice) - 1]
        print(f"Invalid choice. Please enter a number between 1 and {len(style_keys)}.")

def save_summary(summary_text: str, source_filename: str):
    os.makedirs("output", exist_ok=True)
    base_name, _ = os.path.splitext(os.path.basename(source_filename))
    out_file = os.path.join("output", f"{base_name}_summary.md")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(summary_text)
    print(f"\n[+] Summary saved successfully to: {out_file}")

def main():
    print_banner()

    if not check_api_key():
        choice = input("Do you want to continue anyway if you have set it recently? (y/N): ").strip().lower()
        if choice != "y":
            sys.exit(0)

    # File input
    file_path = input("Enter the path to your study file (Image, PDF, PPTX, or Text): ").strip(' "\'')

    if not file_path:
        print("No file path provided. Exiting.")
        return

    if not os.path.exists(file_path):
        print(f"[!] Error: File does not exist at '{file_path}'")
        return

    # Extract content
    print(f"\n[*] Processing '{os.path.basename(file_path)}'...")
    try:
        data = extract_content(file_path)
        unit_info = f"({data.get('total_units', 1)} {data.get('unit_name', 'units')})"
        print(f"[+] Successfully loaded {data['type'].upper()} file {unit_info}")
    except Exception as e:
        print(f"[!] Extraction failed: {e}")
        return

    # Choose summary style
    style_key = select_style()

    # Optional custom instructions
    custom_inst = input("\nAny custom focus or instructions? (Press Enter to skip): ").strip()
    custom_inst = custom_inst if custom_inst else None

    # Generate summary with Gemini
    print("\n[*] Sending to Gemini AI to generate your study summary...")
    try:
        summary = generate_study_summary(data, style_key=style_key, custom_instructions=custom_inst)
        print("\n" + "=" * 55)
        print(f"       STUDY SUMMARY: {SUMMARY_STYLES[style_key]['title']}")
        print("=" * 55 + "\n")
        print(summary)
        print("\n" + "=" * 55)
        
        save_summary(summary, file_path)
    except Exception as e:
        print(f"\n[!] Error generating summary: {e}")

if __name__ == "__main__":
    main()
