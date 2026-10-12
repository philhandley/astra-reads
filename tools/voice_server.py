"""Local server for making voice recordings in the browser (Kokoro runs there, so Windows never loads its DLLs).

  python tools/voice_server.py 8303      then open http://127.0.0.1:8303/dev/voice-build.html

Serves the project folder. Only listens on 127.0.0.1.
  POST /save?name=<file.wav>          sample files, into dev/voices/
  POST /voice/clip?kind=s|w&id=<hex8> a recorded clip, into tools/voice/clips/<kind>/<id>.ogg
  POST /voice/lines                   the list of lines (JSON), into tools/voice/lines.json
  POST /voice/log                     one progress line, appended to tools/voice/progress.log
  POST /voice/done                    marks the run finished, which ends any /__hold wait
  GET  /voice/have                    {"s": [ids], "w": [ids]} of clips already made
  GET  /__hold?s=N                    waits up to N seconds (or until /voice/done), so a headless
                                      browser using --dump-dom stays on the page while it works
"""
import json
import re
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dev' / 'voices'
VOICE = ROOT / 'tools' / 'voice'
CLIPS = VOICE / 'clips'
DONE = threading.Event()
LOG_LOCK = threading.Lock()


class Handler(SimpleHTTPRequestHandler):
    def _send(self, code, body=b'', ctype='text/plain'):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/__hold':
            secs = 60
            try:
                secs = min(6 * 3600, int(parse_qs(u.query).get('s', ['60'])[0]))
            except ValueError:
                pass
            DONE.clear()
            end = time.time() + secs
            while time.time() < end and not DONE.is_set():
                time.sleep(1)
            return self._send(200, b'<!doctype html><title>held</title>', 'text/html')
        if u.path == '/voice/have':
            have = {k: sorted(p.stem for p in (CLIPS / k).glob('*.ogg')) if (CLIPS / k).exists() else [] for k in ('s', 'w')}
            return self._send(200, json.dumps(have).encode(), 'application/json')
        super().do_GET()

    def _body(self, limit=50_000_000):
        n = int(self.headers.get('Content-Length', '0'))
        if n <= 0 or n > limit:
            return None
        return self.rfile.read(n)

    def do_POST(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path == '/save':
            name = q.get('name', [''])[0]
            if not re.fullmatch(r'[a-z0-9_-]+\.wav', name):
                return self.send_error(400, 'bad name')
            body = self._body()
            if body is None:
                return self.send_error(400, 'bad size')
            OUT.mkdir(parents=True, exist_ok=True)
            (OUT / name).write_bytes(body)
            return self._send(204)
        if u.path == '/voice/clip':
            kind = q.get('kind', [''])[0]
            cid = q.get('id', [''])[0]
            if kind not in ('s', 'w') or not re.fullmatch(r'[0-9a-f]{8}', cid):
                return self.send_error(400, 'bad clip name')
            body = self._body(2_000_000)
            if body is None or body[:4] != b'OggS':
                return self.send_error(400, 'not an Ogg file')
            (CLIPS / kind).mkdir(parents=True, exist_ok=True)
            (CLIPS / kind / f'{cid}.ogg').write_bytes(body)
            return self._send(204)
        if u.path == '/voice/lines':
            body = self._body()
            if body is None:
                return self.send_error(400, 'bad size')
            json.loads(body)
            VOICE.mkdir(parents=True, exist_ok=True)
            (VOICE / 'lines.json').write_bytes(body)
            return self._send(204)
        if u.path == '/voice/log':
            body = self._body(100_000) or b''
            VOICE.mkdir(parents=True, exist_ok=True)
            with LOG_LOCK, open(VOICE / 'progress.log', 'ab') as f:
                f.write(body.rstrip(b'\n') + b'\n')
            return self._send(204)
        if u.path == '/voice/done':
            DONE.set()
            return self._send(204)
        self.send_error(404)

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8302
ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(ROOT))).serve_forever()
