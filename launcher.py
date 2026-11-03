"""Single-process loopback launcher, shared by source and portable Windows builds."""
import json
import os
from pathlib import Path
import shutil
import socket
import sys
import threading
import time
from urllib.request import build_opener, ProxyHandler
import webbrowser

ROOT = Path(__file__).resolve().parent

def main():
    os.chdir(ROOT)
    if not (ROOT / 'frontend/dist/index.html').is_file():
        print('Frontend build missing. Use the complete portable package, or run npm ci and npm run build in frontend.')
        return 1
    env = ROOT / 'backend/.env'
    if not env.exists():
        shutil.copyfile(ROOT / 'backend/.env.example', env)
    from dotenv import load_dotenv
    load_dotenv(env)
    try:
        port = int(os.getenv('PORTAL_PORT', '8000'))
        if not 1024 <= port <= 65535:
            raise ValueError()
    except ValueError:
        print('PORTAL_PORT must be an integer between 1024 and 65535. Edit backend/.env.')
        return 1
    url = f'http://127.0.0.1:{port}'
    opener = build_opener(ProxyHandler({}))
    sock = socket.socket()
    if sys.platform == 'win32':
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
    else:
        # Permit immediate restart after closed TCP connections enter TIME_WAIT.
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(('127.0.0.1', port))
    except OSError:
        sock.close()
        try:
            with opener.open(url + '/api/health', timeout=2) as response:
                running = json.load(response).get('app') == 'loong-ai-portal'
        except Exception:
            running = False
        if running:
            print(f'Portal is already running: {url}. Close the original window / Ctrl+C before changing configuration.')
            if '--no-browser' not in sys.argv:
                webbrowser.open(url)
            return 0
        print(f'Port {port} is occupied. Close that application or change PORTAL_PORT in backend/.env.')
        return 1
    import uvicorn
    from backend.main import app
    def open_when_ready():
        for _ in range(100):
            try:
                with opener.open(url + '/api/health', timeout=0.3):
                    if '--no-browser' not in sys.argv:
                        webbrowser.open(url)
                    return
            except Exception:
                time.sleep(0.1)
    threading.Thread(target=open_when_ready, daemon=True).start()
    print(f'LOONG AI Portal: {url}\nKeep this window open. Ctrl+C stops the server.\nConfiguration: {env}\nRestart after configuration changes. Chat is not saved.', flush=True)
    try:
        server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=port, log_level='info', access_log=False))
        server.run(sockets=[sock])
    finally:
        sock.close()
    return 0

if __name__ == '__main__':
    sys.exit(main())
