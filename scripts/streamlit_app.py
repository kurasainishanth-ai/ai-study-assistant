import os
import tempfile
import time
from datetime import datetime
import streamlit as st

from config import GEMINI_API_KEY, DEFAULT_MODEL
from extractors import extract_content, SUPPORTED_EXTENSIONS
from summarizer import (
    generate_study_summary,
    SUMMARY_STYLES,
    GeminiTemporaryUnavailableError,
    GeminiClientAuthError,
    GeminiAPIError
)
import db

# ---------------------------------------------------------
# 1. Page Configuration & Custom Dark Theme
# ---------------------------------------------------------
st.set_page_config(
    page_title="Studyverse AI - Multimodal Learning Workspace",
    page_icon="🪐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Dark theme styling with clear contrast and responsive cards
st.markdown("""
<style>
    .block-container {
        padding-top: 1.8rem;
        padding-bottom: 2.5rem;
    }
    
    /* Hero Banner */
    .studyverse-hero {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
        padding: 24px 28px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        margin-bottom: 24px;
        color: #ffffff;
    }
    .studyverse-hero h1 {
        font-size: 2rem;
        font-weight: 700;
        margin: 0;
        color: #f8fafc;
    }
    .studyverse-hero p {
        font-size: 0.95rem;
        color: #cbd5e1;
        margin-top: 6px;
        margin-bottom: 0;
    }
    
    /* Metric Cards */
    .metric-card {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 16px 20px;
        color: #f8fafc;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .metric-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #38bdf8;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Badges */
    .badge-ready {
        background-color: #064e3b;
        color: #6ee7b7;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-error {
        background-color: #7f1d1d;
        color: #fca5a5;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------
# 2. Database & Session State Synchronization
# ---------------------------------------------------------
db.init_db()

# Synchronize materials from SQLite into session state on initial load
if "library" not in st.session_state:
    st.session_state["library"] = db.get_all_materials()

if "active_doc_id" not in st.session_state:
    # Default to first ready material if available
    ready_items = [m for m in st.session_state["library"] if m["status"] == "Ready"]
    st.session_state["active_doc_id"] = ready_items[0]["id"] if ready_items else None

if "summary" not in st.session_state:
    st.session_state["summary"] = None

if "summary_style_title" not in st.session_state:
    st.session_state["summary_style_title"] = None

if "source_filename" not in st.session_state:
    st.session_state["source_filename"] = None

if "is_generating" not in st.session_state:
    st.session_state["is_generating"] = False


# ---------------------------------------------------------
# 3. Helper Functions
# ---------------------------------------------------------
def get_friendly_file_type(filename: str) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext == ".pdf":
        return "PDF Document"
    elif ext in [".pptx", ".ppt"]:
        return "PowerPoint Presentation"
    elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
        return "Image"
    elif ext in [".txt", ".md"]:
        return "Text / Markdown Note"
    return "Document"


def process_uploaded_buffer(uploaded_file) -> dict:
    """Safely extracts content from an uploaded buffer on Windows using a temp file."""
    suffix = os.path.splitext(uploaded_file.name)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        tmp_file.write(uploaded_file.getbuffer())
        tmp_path = tmp_file.name

    try:
        data = extract_content(tmp_path)
        data["file_name"] = uploaded_file.name
        return data
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def add_file_to_library(uploaded_file):
    """Processes and stores a new uploaded file into the library state and SQLite DB."""
    # Check for duplicate by name and size
    for item in st.session_state["library"]:
        if item["name"] == uploaded_file.name and item["size_kb"] == round(uploaded_file.size / 1024, 1):
            return

    doc_id = f"doc_{int(time.time() * 1000)}"
    size_kb = round(uploaded_file.size / 1024, 1)
    upload_time = datetime.now().strftime("%b %d, %H:%M")

    try:
        data = process_uploaded_buffer(uploaded_file)
        new_item = {
            "id": doc_id,
            "name": uploaded_file.name,
            "type": get_friendly_file_type(uploaded_file.name),
            "size_kb": size_kb,
            "upload_time": upload_time,
            "data": data,
            "status": "Ready",
            "error": None
        }
    except Exception as e:
        new_item = {
            "id": doc_id,
            "name": uploaded_file.name,
            "type": get_friendly_file_type(uploaded_file.name),
            "size_kb": size_kb,
            "upload_time": upload_time,
            "data": None,
            "status": "Error",
            "error": str(e)
        }

    # Save to SQLite and update session state
    db.save_material(new_item)
    st.session_state["library"].insert(0, new_item)
    
    # Auto-set as active document if none selected
    if not st.session_state["active_doc_id"] and new_item["status"] == "Ready":
        st.session_state["active_doc_id"] = new_item["id"]


def load_sample_to_library():
    """Loads local sample_notes.txt into library and SQLite for instant testing."""
    sample_path = "sample_notes.txt"
    if os.path.exists(sample_path):
        size = os.path.getsize(sample_path)
        data = extract_content(sample_path)
        new_item = {
            "id": "sample_notes_doc",
            "name": "sample_notes.txt",
            "type": "Text / Markdown Note",
            "size_kb": round(size / 1024, 1),
            "upload_time": datetime.now().strftime("%b %d, %H:%M"),
            "data": data,
            "status": "Ready",
            "error": None
        }
        db.save_material(new_item)
        if not any(item["name"] == "sample_notes.txt" for item in st.session_state["library"]):
            st.session_state["library"].insert(0, new_item)
        st.session_state["active_doc_id"] = new_item["id"]


def get_active_document():
    """Returns the currently selected library document dict or None."""
    if not st.session_state["active_doc_id"]:
        return None
    for item in st.session_state["library"]:
        if item["id"] == st.session_state["active_doc_id"]:
            return item
    return None


# ---------------------------------------------------------
# 4. Sidebar Navigation
# ---------------------------------------------------------
with st.sidebar:
    st.title("🪐 Studyverse AI")
    st.caption("Multimodal Student Learning Platform")
    st.divider()

    nav_selection = st.radio(
        "Workspace Navigation",
        [
            "📊 Dashboard",
            "📂 Study Library",
            "✨ AI Study Studio",
            "🌌 Knowledge Galaxy [Phase 1 Prototype]",
            "🎯 Practice Zone [Phase 1 Prototype]",
            "📈 Mastery Dashboard [Phase 1 Prototype]"
        ],
        index=0
    )

    st.divider()
    
    # Active document badge in sidebar
    active_doc = get_active_document()
    if active_doc:
        st.caption("📌 **Active Material:**")
        st.info(f"**{active_doc['name']}**\n\n_{active_doc['type']} ({active_doc['size_kb']} KB)_")
    else:
        st.caption("📌 **Active Material:** None selected")

    st.divider()
    st.caption(f"⚙️ Model: `{DEFAULT_MODEL}`")
    st.caption("🔒 *API credentials secure & verified.*")


# ---------------------------------------------------------
# 5. VIEW 1: DASHBOARD
# ---------------------------------------------------------
if nav_selection == "📊 Dashboard":
    st.markdown("""
    <div class="studyverse-hero">
        <h1>Welcome to Studyverse AI 🪐</h1>
        <p>Your distinctive multimodal workspace for deep synthesis, exam preparation, and conceptual mastery.</p>
    </div>
    """, unsafe_allow_html=True)

    # Activity & Progress Cards
    db_stats = db.get_stats()
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Library Materials</div>
            <div class="metric-value">{db_stats['total_materials']}</div>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Summaries Synthesized</div>
            <div class="metric-value">{db_stats['total_summaries']}</div>
        </div>
        """, unsafe_allow_html=True)
    with c3:
        active_name = active_doc['name'] if active_doc else "None selected"
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Active Focus Document</div>
            <div class="metric-value" style="font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{active_name}</div>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Study Readiness</div>
            <div class="metric-value" style="color: #4ade80;">Active</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_recent, col_actions = st.columns([2, 1], gap="large")

    with col_recent:
        st.subheader("📚 Recent Study Materials")
        if not st.session_state["library"]:
            st.info(
                "✨ **Your library is currently empty!**  \n"
                "Upload textbook chapters, presentation slides, notes, or diagrams to unlock AI synthesis."
            )
            if st.button("🚀 Load Pre-built Sample Notes (Photosynthesis)", type="secondary"):
                load_sample_to_library()
                st.rerun()
        else:
            for item in st.session_state["library"][:4]:
                is_active = (item["id"] == st.session_state["active_doc_id"])
                border_color = "#3b82f6" if is_active else "#334155"
                st.markdown(f"""
                <div style="background-color: #1e293b; border: 1px solid {border_color}; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #f8fafc;">{item['name']}</strong> {'<span style="color: #38bdf8; font-size: 0.8rem; margin-left: 6px;">[Active]</span>' if is_active else ''}<br>
                        <span style="color: #94a3b8; font-size: 0.8rem;">{item['type']} • {item['size_kb']} KB • {item['upload_time']}</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)

    with col_actions:
        st.subheader("⚡ Quick Actions")
        st.markdown("Jump straight into study workflows:")
        
        st.info("💡 **Navigation Tip:** Use the sidebar menu on the left to switch between workspace views.")
        if st.button("📝 Load Sample Notes Material", use_container_width=True):
            load_sample_to_library()
            st.success("Loaded 'sample_notes.txt' into Library and set as active!")
            st.rerun()


# ---------------------------------------------------------
# 6. VIEW 2: STUDY LIBRARY
# ---------------------------------------------------------
elif nav_selection == "📂 Study Library":
    st.title("📂 Study Library")
    st.markdown("Upload, organize, and inspect your multimodal study resources with full SQLite persistence.")

    col_up, col_list = st.columns([1, 1], gap="large")

    with col_up:
        st.subheader("Upload New Material")
        uploaded_files = st.file_uploader(
            "Upload lecture notes, slides, book chapters, or diagrams:",
            type=["pdf", "pptx", "txt", "md", "png", "jpg", "jpeg", "webp"],
            accept_multiple_files=True,
            help="Supports PDF, PowerPoint, images, and text/markdown notes."
        )

        if uploaded_files:
            newly_added = 0
            for f in uploaded_files:
                before_count = len(st.session_state["library"])
                add_file_to_library(f)
                if len(st.session_state["library"]) > before_count:
                    newly_added += 1
            if newly_added > 0:
                st.success(f"✅ Successfully processed and stored {newly_added} new material(s)!")
                st.rerun()

        st.markdown("---")
        st.caption("Quick Test:")
        if st.button("📥 Load Built-In Sample Notes", use_container_width=True):
            load_sample_to_library()
            st.success("Loaded 'sample_notes.txt' into Library!")
            st.rerun()

    with col_list:
        st.subheader(f"Library Materials ({len(st.session_state['library'])})")

        if not st.session_state["library"]:
            st.info("Your library is currently empty. Upload files on the left to get started!")
        else:
            for item in st.session_state["library"]:
                is_active = (item["id"] == st.session_state["active_doc_id"])
                
                with st.expander(f"📄 {item['name']} ({item['type']})", expanded=is_active):
                    st.write(f"**Format:** {item['type']}")
                    st.write(f"**Size:** {item['size_kb']} KB")
                    st.write(f"**Added:** {item['upload_time']}")
                    
                    if item["status"] == "Ready":
                        st.markdown('<span class="badge-ready">Processing Status: Ready</span>', unsafe_allow_html=True)
                        if item["data"]:
                            units = f"{item['data'].get('total_units', 1)} {item['data'].get('unit_name', 'units')}"
                            st.caption(f"Extracted Content: {units}")
                    else:
                        st.markdown('<span class="badge-error">Processing Status: Extraction Failed</span>', unsafe_allow_html=True)
                        st.error(f"Error: {item['error']}")

                    b1, b2 = st.columns([1, 1])
                    with b1:
                        if not is_active and item["status"] == "Ready":
                            if st.button("📌 Set as Active", key=f"act_{item['id']}"):
                                st.session_state["active_doc_id"] = item["id"]
                                st.rerun()
                        elif is_active:
                            st.caption("⭐ *Currently Active Material*")
                    with b2:
                        if st.button("🗑️ Remove", key=f"del_{item['id']}"):
                            db.delete_material(item["id"])
                            st.session_state["library"] = [i for i in st.session_state["library"] if i["id"] != item["id"]]
                            if st.session_state["active_doc_id"] == item["id"]:
                                st.session_state["active_doc_id"] = None
                            st.rerun()


# ---------------------------------------------------------
# 7. VIEW 3: AI STUDY STUDIO
# ---------------------------------------------------------
elif nav_selection == "✨ AI Study Studio":
    st.title("✨ AI Study Studio")
    st.markdown("Transform your study materials into structured, multi-tier summaries with Gemini.")

    active_doc = get_active_document()

    if not active_doc:
        st.warning("⚠️ **No material selected!**")
        st.markdown("Please choose an active document from your **Study Library** or load our sample note:")
        if st.button("📥 Load Sample Note (Photosynthesis)", type="primary"):
            load_sample_to_library()
            st.rerun()
    else:
        st.info(f"📄 **Current Active Document:** `{active_doc['name']}` ({active_doc['type']})")

        col_cfg, col_view = st.columns([1, 1], gap="large")

        with col_cfg:
            st.subheader("1. Configure Study Mode")

            # All 8 study styles (5 existing + 3 new requested)
            style_map = {info["title"]: key for key, info in SUMMARY_STYLES.items()}
            style_choices = list(style_map.keys())

            selected_style_name = st.selectbox(
                "Choose summary mode:",
                options=style_choices,
                index=1,  # Default to Bullet Points & Key Takeaways
                help="Select between executive overviews, flashcards, deep dives, beginner explanations, or exam revision modes."
            )
            selected_style_key = style_map[selected_style_name]

            # Brief mode description
            st.caption(f"_{SUMMARY_STYLES[selected_style_key]['prompt'][:110]}..._")

            custom_instructions = st.text_area(
                "Optional Custom Focus / Instructions:",
                placeholder="e.g. Focus on definitions, emphasize exam traps, explain using medical analogies...",
                help="Tailor the output to your specific exam syllabus or curriculum."
            )

            # Prevent duplicate clicks using is_generating flag
            generate_btn = st.button(
                "🚀 Generate Summary",
                type="primary",
                use_container_width=True,
                disabled=st.session_state["is_generating"]
            )

        with col_view:
            st.subheader("2. Generated Study Material")
            retry_status_box = st.empty()

            if generate_btn:
                if not GEMINI_API_KEY:
                    st.error("🔑 Gemini API key is missing. Please configure GEMINI_API_KEY in your `.env` file.")
                elif active_doc["status"] != "Ready" or not active_doc["data"]:
                    st.error("❌ The active document failed extraction and cannot be processed.")
                else:
                    st.session_state["is_generating"] = True
                    retry_status_box.empty()

                    def handle_retry(attempt: int, max_retries: int, delay: float, reason: str):
                        retry_status_box.warning(
                            f"⏳ **Gemini is busy ({reason})**  \n"
                            f"Automatically retrying (Attempt {attempt} of {max_retries}) in {delay:.1f}s..."
                        )

                    with st.spinner("Synthesizing concepts with Gemini..."):
                        try:
                            summary_text = generate_study_summary(
                                extracted_data=active_doc["data"],
                                style_key=selected_style_key,
                                custom_instructions=custom_instructions.strip() or None,
                                on_retry=handle_retry
                            )

                            st.session_state["summary"] = summary_text
                            st.session_state["summary_style_title"] = selected_style_name
                            st.session_state["source_filename"] = active_doc["name"]
                            
                            # Persist in SQLite
                            db.save_summary_record(
                                doc_id=active_doc["id"],
                                doc_name=active_doc["name"],
                                style_key=selected_style_key,
                                style_title=selected_style_name,
                                summary_text=summary_text
                            )

                            retry_status_box.empty()
                            st.success("✅ Summary synthesized and saved successfully!")

                        except GeminiTemporaryUnavailableError as e:
                            retry_status_box.empty()
                            st.error(f"⏳ **Service Temporarily Unavailable**: {str(e)}")
                        except GeminiClientAuthError as e:
                            retry_status_box.empty()
                            st.error(f"🔑 **Authentication Error**: {str(e)}")
                        except GeminiAPIError as e:
                            retry_status_box.empty()
                            st.error(f"⚠️ **Gemini API Error**: {str(e)}")
                        except Exception as e:
                            retry_status_box.empty()
                            st.error(f"❌ **Unexpected Error**: {str(e)}")
                        finally:
                            st.session_state["is_generating"] = False

            # Display active summary
            if st.session_state["summary"]:
                base_name = os.path.splitext(st.session_state["source_filename"] or "study_material")[0]
                download_filename = f"{base_name}_{selected_style_key}_summary.md"

                # Action row: Download + Regenerate info
                act_col1, act_col2 = st.columns([1, 1])
                with act_col1:
                    st.download_button(
                        label="📥 Download Markdown (.md)",
                        data=st.session_state["summary"],
                        file_name=download_filename,
                        mime="text/markdown",
                        use_container_width=True
                    )
                with act_col2:
                    st.caption(f"**Source:** `{st.session_state['source_filename']}`  \n**Mode:** {st.session_state['summary_style_title']}")

                # Readable section tabs
                tab_read, tab_raw = st.tabs(["📖 Formatted View", "📋 Raw Markdown / Copy"])
                with tab_read:
                    st.markdown("---")
                    st.markdown(st.session_state["summary"])
                with tab_raw:
                    st.markdown("---")
                    st.text_area("Raw Markdown Text (Select All & Copy):", value=st.session_state["summary"], height=350)
            else:
                st.info("💡 Your generated study guide, flashcards, or exam revision will appear here.")


# ---------------------------------------------------------
# 8. VIEW 4: KNOWLEDGE GALAXY (Phase 1 Prototype)
# ---------------------------------------------------------
elif nav_selection == "🌌 Knowledge Galaxy [Phase 1 Prototype]":
    st.title("🌌 Knowledge Galaxy")
    st.markdown("Explore conceptual relationships and topic clusters extracted from your material.")

    st.info("ℹ️ **Phase 1 Feature Preview:** This section extracts real, non-hallucinated topic nodes from your active material. The 3D interactive force-directed graph is scheduled for Phase 2.")

    active_doc = get_active_document()

    if not active_doc:
        st.warning("⚠️ No active study material selected. Please select a document in the Study Library first.")
    else:
        st.subheader(f"Concept Clusters: `{active_doc['name']}`")
        
        # Real topic extraction from document text headings without hallucinating
        doc_content = active_doc['data'].get('content', '') if active_doc.get('data') else ''
        
        if not doc_content.strip():
            st.info("No readable text found in active document to extract concepts from.")
        else:
            lines = doc_content.splitlines()
            headings = [line.strip("# -*").strip() for line in lines if line.startswith(("#", "##", "--- [Page", "--- [Slide"))]
            
            if headings:
                st.markdown("**Identified Key Topic Nodes:**")
                cols = st.columns(min(len(headings), 3))
                for i, h in enumerate(headings[:6]):
                    with cols[i % len(cols)]:
                        st.markdown(f"""
                        <div style="background-color: #1e293b; border: 1px solid #4338ca; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                            <span style="color: #a5b4fc; font-weight: 600; font-size: 0.9rem;">📍 Node {i+1}</span><br>
                            <span style="color: #f8fafc; font-size: 0.95rem;">{h}</span>
                        </div>
                        """, unsafe_allow_html=True)
            else:
                st.info("Document loaded. Detailed subtopic graph mapping will be computed in Phase 2.")


# ---------------------------------------------------------
# 9. VIEW 5: PRACTICE ZONE (Phase 1 Prototype)
# ---------------------------------------------------------
elif nav_selection == "🎯 Practice Zone [Phase 1 Prototype]":
    st.title("🎯 Practice Zone")
    st.markdown("Test your recall with AI-generated questions grounded strictly in your study material.")

    st.warning("🚧 **Phase 1 Prototype:** Interactive quiz generation and score persistence are planned for Phase 2.")

    st.markdown("""
    ### Upcoming Capabilities:
    * **Grounded Multiple Choice Questions**: Diagnostic questions derived directly from your notes.
    * **Short Answer Practice**: Explain concepts in your own words with instant AI grading.
    * **Answer Rationales**: Comprehensive explanations of why choices are correct or incorrect.
    * **Attempt History**: Automatic tracking of strengths and weaknesses by subtopic.
    """)

    active_doc = get_active_document()
    if active_doc:
        st.success(f"Active Document `{active_doc['name']}` is ready to be linked to quizzes once Phase 2 launches.")


# ---------------------------------------------------------
# 10. VIEW 6: MASTERY DASHBOARD (Phase 1 Prototype)
# ---------------------------------------------------------
elif nav_selection == "📈 Mastery Dashboard [Phase 1 Prototype]":
    st.title("📈 Mastery Dashboard")
    st.markdown("Evidence-based tracking of your retention and topic mastery over time.")

    st.warning("🚧 **Phase 1 Prototype:** Mastery analytics require verified quiz attempt data from the Practice Zone before declaring mastery.")

    st.markdown("""
    ### Honest Mastery Principles:
    - **No False Confidence**: Mastery percentages are calculated from quiz evidence, not superficial views.
    - **Spaced Repetition Triggers**: Flags topics that require review before memory decay sets in.
    - **Actionable Next Steps**: Suggests whether to re-read deep dives or drill flashcards next.
    """)

    st.info("📊 Topic mastery tracking will activate as soon as quiz attempts are completed in Phase 2.")
