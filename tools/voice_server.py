"""Local server for making voice recordings in the browser (Kokoro runs there, so Windows never loads its DLLs).

  python tools/voice_server.py 8302      then open http://127.0.0.1:8302/dev/voices-make.html

Serves the project folder, and saves POST /save?name=<file.wav> bodies into dev/voices/.
Only listens on 127.0.0.1.
"""
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dev' / 'voices'


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/__hold'):
            import time
            secs = 60
            try: secs = min(1200, int(self.path.split('s=')[1].split('&')[0]))
            except (IndexError, ValueError): pass
            time.sleep(secs)
            body = b'<!doctype html><title>held</title>'
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != '/save':
            self.send_error(404)
            return
        name = parse_qs(u.query).get('name', [''])[0]
        if not re.fullmatch(r'[a-z0-9_-]+\.wav', name):
            self.send_error(400, 'bad name')
            return
        n = int(self.headers.get('Content-Length', '0'))
        if n <= 0 or n > 50_000_000:
            self.send_error(400, 'bad size')
            return
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / name).write_bytes(self.rfile.read(n))
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8302
ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(ROOT))).serve_forever()
