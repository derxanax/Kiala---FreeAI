import os
# Ensure fallback software rendering to silence nouveau driver errors
os.environ.setdefault('QT_QUICK_BACKEND', 'software')
import sys
import json
import threading
import webview
from flask import Flask, render_template, request, jsonify, Response
from app.core.gemini_client import get_gemini_response_sync

if getattr(sys, 'frozen', False):
    template_folder = os.path.join(sys._MEIPASS, 'app', 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'app', 'static')
else:
    current_script_directory = os.path.dirname(os.path.abspath(__file__))
    template_folder = os.path.join(current_script_directory, 'templates')
    static_folder = os.path.join(current_script_directory, 'static')

# Let's make sure the folders exist.
app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
app.config['SECRET_KEY'] = os.urandom(32)

flask_server_url = "http://127.0.0.1:5175"
window = None

# Let's make sure Flask and webview are running in the same thread
@app.route('/')
def index():
    try:
        resp = Response(render_template('index.html'))
        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
        return resp
    except Exception as e:
        print(f"CRITICAL ERROR while rendering index.html: {e}")
        raise

@app.route('/api/ask_gemini', methods=['POST'])
def ask_gemini_route():
    if not request.is_json:
        print("ERROR: Request /api/ask_gemini is not in JSON format.")
        return jsonify({"error": "Request must be in JSON format"}), 415
    
    data = request.get_json()
    
    user_message = data.get('message')
    js_chat_history = data.get('chatHistory', [])
    api_key = data.get('apiKey')
    system_instruction = data.get('systemInstruction')

    if not user_message:
        print("ERROR: Missing 'message' in request /api/ask_gemini")
        return jsonify({"error": "Parameter 'message' is missing or empty"}), 400

    gemini_history_for_api = []
    for msg in js_chat_history:
        sender = msg.get("sender")
        text = msg.get("text", "").strip()
        if sender and text:
            role = "user" if sender == "user" else "model"
            gemini_history_for_api.append({"role": role, "parts": [text]})
    
    print(f"INFO: Request to Gemini (sync): '{user_message[:70].replace(chr(10), ' ')}...' | Story: {len(gemini_history_for_api)} message | API key: {'Available' if api_key else 'No'} | Instruction: {'Available' if system_instruction else 'No'}")

    try:
        bot_response = get_gemini_response_sync(
            prompt=user_message, 
            chat_history_for_api=gemini_history_for_api, 
            api_key=api_key,
            system_instruction=system_instruction
        )
        print(f"INFO: Response from Gemini (synchronous) received: '{str(bot_response)[:100]}...'")
        return jsonify({"reply": bot_response})
    except Exception as e:
        print(f"CRITICAL ERROR in route /api/ask_gemini when calling get_gemini_response_sync: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return jsonify({"error": f"Internal server error while accessing Gemini. Details: {str(e)[:200]}"}), 500

# Run Flask app in a separate thread to avoid blocking the main thread
def run_flask_app():
    try:
        app.run(host='127.0.0.1', port=int(flask_server_url.split(':')[-1]), threaded=True, debug=False, use_reloader=False)
    except Exception as e:
        print(f"Failed to start Flask server: {e}", file=sys.stderr)
        if window:
            window.evaluate_js(f"alert('Failed to start internal web server: {str(e).replace('\"', '')}');")

def is_qt_available() -> bool:
    """Return True if Qt backend is importable via qtpy."""
    try:
        import qtpy  # noqa: F401
        return True
    except Exception:
        return False

# Create the GUI using webview
def create_gui():
    global window
    
    window_title = "Kiala"
    window_width = 1100
    window_height = 780
    resizable = True
    min_size = (800, 600)

    icon_path = "app/static/img/kiala_icon.png" #Doesn't work on Linux (haven't tested on Windows)
    if hasattr(sys, '_MEIPASS'):
        icon_path = os.path.join(sys._MEIPASS, icon_path)
    
    if not os.path.exists(icon_path):
        icon_path = None

    window = webview.create_window(
        window_title,
        url=flask_server_url, 
        width=window_width,
        height=window_height,
        resizable=resizable,
        min_size=min_size,
        text_select=True,
        confirm_close=True
    )
    
    window.events.closed += on_window_closed
    
    gui_backend = 'qt' if is_qt_available() else 'gtk'
    if gui_backend == 'gtk':
        print("INFO: Qt backend unavailable, falling back to GTK.")
    try:
        webview.start(debug=False, gui=gui_backend)  # debug=True for developer tools
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to start webview with backend '{gui_backend}'. {e}", file=sys.stderr)
        sys.exit(1)

def on_window_closed():
    print("The Kiala window was closed by the user.")
    print("The Kiala app is shutting down...")
    os._exit(0)

def main_app_loop():
    print(f"Kiala launch...")

    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()

    try:
        create_gui()
    except Exception as e:
        print(f"CRITICAL ERROR while creating GUI: {e}", file=sys.stderr)
        try:
            import tkinter as tk
            from tkinter import messagebox
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Kiala Launch Error", f"Failed to launch Kiala GUI.\n\nError details:\n{e}\n\nPlease check the logs or contact the developer.")
            root.destroy()
        except ImportError:
            pass
        sys.exit(1)