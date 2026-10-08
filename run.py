import os
import sys
import time
import subprocess
import webbrowser
import urllib.request
import urllib.error

# Ensure root directory is working directory
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT_DIR)

def print_banner():
    print("=" * 60)
    print("   🚀 StudyVerse AI Platform - Automated Launcher 🚀")
    print("=" * 60)

def setup_environment():
    """Ensure .env exists, install Python and NPM dependencies if needed."""
    env_file = os.path.join(ROOT_DIR, ".env")
    env_example = os.path.join(ROOT_DIR, ".env.example")
    if not os.path.exists(env_file) and os.path.exists(env_example):
        print("📄 Creating .env from .env.example...")
        with open(env_example, "r", encoding="utf-8") as f_in:
            content = f_in.read()
        with open(env_file, "w", encoding="utf-8") as f_out:
            f_out.write(content)

    print("📦 Checking Python dependencies...")
    req_file = os.path.join(ROOT_DIR, "requirements.txt")
    if os.path.exists(req_file):
        try:
            import fastapi
            import uvicorn
            import google.genai
            import pypdf
        except ImportError:
            print("⏳ Installing missing Python requirements (one-time setup)...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", req_file], check=True)

    print("⚡ Checking Frontend dependencies...")
    node_modules = os.path.join(ROOT_DIR, "frontend", "node_modules")
    if not os.path.exists(node_modules):
        print("⏳ Installing NPM packages in frontend (one-time setup)...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=os.path.join(ROOT_DIR, "frontend"), check=True)

def wait_for_server(url, timeout=30):
    """Wait until a web server is up and returning HTTP responses."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.urlopen(url)
            if req.getcode() == 200:
                return True
        except Exception:
            time.sleep(0.5)
    return False

def main():
    print_banner()
    setup_environment()

    print("\n🔥 Starting Backend FastAPI Server (port 8000)...")
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = os.path.join(ROOT_DIR, "backend") + os.path.pathsep + backend_env.get("PYTHONPATH", "")
    
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.server:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=ROOT_DIR,
        env=backend_env
    )

    print("⏳ Waiting for backend to become ready...")
    backend_ready = wait_for_server("http://127.0.0.1:8000/docs", timeout=15)
    if backend_ready:
        print("✅ Backend ready at http://127.0.0.1:8000")
    else:
        print("⚠️ Backend server warm-up taking longer than expected, starting frontend...")

    print("\n🎨 Starting Frontend Vite Dev Server (port 5173)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=os.path.join(ROOT_DIR, "frontend")
    )

    frontend_url = "http://localhost:5173"
    print("⏳ Waiting for frontend to become ready...")
    frontend_ready = wait_for_server(frontend_url, timeout=15)
    
    print("\n🌐 Opening StudyVerse AI Platform in your default browser...")
    webbrowser.open(frontend_url)

    print("\n" + "=" * 60)
    print("✨ StudyVerse AI Platform is RUNNING!")
    print(f"👉 Frontend: {frontend_url}")
    print("👉 Backend API Docs: http://localhost:8000/docs")
    print("💡 Press Ctrl+C in this window to stop both servers.")
    print("=" * 60 + "\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down backend and frontend processes...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("👋 Bye!")

if __name__ == "__main__":
    main()
