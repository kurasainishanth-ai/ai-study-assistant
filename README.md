# StudyVerse: Multimodal AI Study Assistant

StudyVerse is a modern, AI-powered study platform built to help students learn more effectively. It processes various document formats (PDF, DOCX, PPTX, Images, and Text) and automatically generates interactive study materials such as Smart Notes, Flashcards, Diagnostic Quizzes, and Force-Directed Knowledge Maps. 

Powered by Google's Gemini AI, the platform also features a grounded AI Tutor that answers questions based exclusively on the context of your uploaded materials.

## 🚀 Tech Stack

* **Backend:** FastAPI (Python), SQLite, Google GenAI SDK
* **Frontend:** React 19, Vite, Tailwind CSS v4
* **AI Engine:** Google Gemini (Multimodal & Text)

## 🛠️ Prerequisites

* **Python:** 3.10 or higher
* **Node.js:** 18 or higher (for the frontend)
* **API Key:** A free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

## ⚙️ Setup Instructions

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the project root directory.
2. Create and activate a Python virtual environment:
   \\\ash
   python -m venv .venv
   # On Windows:
   .\.venv\Scripts\activate
   \\\
3. Install the required Python dependencies:
   \\\ash
   pip install -r requirements.txt
   \\\
4. Set up your environment variables:
   * Copy the \.env.example\ file to \.env\.
   * Open \.env\ and replace \your_gemini_api_key_here\ with your actual Google Gemini API key.
5. Start the FastAPI development server:
   \\\ash
   python -m uvicorn server:app --reload
   \\\
   *The backend will be available at \http://127.0.0.1:8000\.*

### 2. Frontend Setup (React)

1. Open a **new, separate terminal** and navigate to the \rontend\ directory:
   \\\ash
   cd frontend
   \\\
2. Install the Node.js dependencies:
   \\\ash
   npm install
   \\\
3. Start the Vite development server:
   \\\ash
   npm run dev
   \\\
   *The frontend will typically be available at \http://localhost:5173\.*

## 📁 Project Structure

* \/agent\: AI orchestration, robust response parsing, and JSON schema prompts.
* \/extractors\: Document parsing pipelines (PDF, PPTX, DOCX, Images, Text) with OCR fallback.
* \/services\: Business logic for Quizzes, Flashcards, Knowledge Maps, AI Tutor, and Gemini API calls.
* \/frontend\: The React SPA (Single Page Application).
* \server.py\: The FastAPI application and REST endpoints.
* \db.py\: SQLite database schema and persistence layer.
* \config.py\: Environment and API key configuration.

## 🤝 Contributing

1. Switch to your assigned feature branch: \git checkout feature/[your-name]\
2. Commit your changes: \git commit -m "feat: added something awesome"\
3. Push to your branch: \git push origin feature/[your-name]\
4. Create a Pull Request against \main\.
