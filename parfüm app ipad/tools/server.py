#!/usr/bin/env python3
"""
Lokaler Entwicklungsserver für die Parfüm-App (ohne Abhängigkeiten).

    python tools/server.py          # http://localhost:8000/web/
    python tools/server.py 8080     # anderer Port

- Liefert das ganze Repo aus (wie GitHub Pages), damit preview.html
  auch ../scriptable/DuftDesTages.js laden kann.
- Schickt "Cache-Control: no-store", damit Änderungen sofort sichtbar sind.
- Nimmt vom Platzhalter-Generator (tools/platzhalter.html) Bilder per POST
  entgegen und speichert sie nach web/images/ bzw. web/icons/.
  Der Server lauscht nur auf 127.0.0.1.
"""

import http.server
import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ERLAUBTE_ZIELE = re.compile(r"^web/(images|icons)/[a-z0-9-]+\.(jpg|png)$")
MAX_GROESSE = 15 * 1024 * 1024
# Bilder, die das Bildstudio erzeugt hat. Alle anderen (z. B. eigene Fotos) überschreibt es nur auf ausdrücklichen Wunsch.
STUDIO_LISTE = ROOT / "tools" / "studio-bilder.json"


def studio_bilder():
    try:
        return set(json.loads(STUDIO_LISTE.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return set()


class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows-Registry liefert für .js manchmal text/plain – hier fest vorgeben.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".svg": "image/svg+xml",
        ".md": "text/markdown; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != "/__speichern":
            self.send_error(404)
            return
        parameter = parse_qs(url.query)
        ziel = parameter.get("pfad", [""])[0]
        if not ERLAUBTE_ZIELE.match(ziel):
            self.send_error(400, "Ungültiger Zielpfad")
            return
        laenge = int(self.headers.get("Content-Length", 0))
        if laenge <= 0 or laenge > MAX_GROESSE:
            self.send_error(413, "Datei zu groß oder leer")
            return
        datei = ROOT / ziel
        studio = studio_bilder()
        erzwingen = parameter.get("ueberschreiben", ["0"])[0] == "1"
        if ziel.startswith("web/images/") and datei.exists() and ziel not in studio and not erzwingen:
            self.rfile.read(laenge)
            self.send_error(409, "Eigenes Bild – nicht überschrieben")
            return
        datei.parent.mkdir(parents=True, exist_ok=True)
        datei.write_bytes(self.rfile.read(laenge))
        if ziel.startswith("web/images/") and ziel not in studio:
            STUDIO_LISTE.write_text(json.dumps(sorted(studio | {ziel}), indent=2), encoding="utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(f"gespeichert: {ziel}".encode())
        self.log_message("gespeichert: %s (%d Bytes)", ziel, laenge)


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as server:
        print(f"Parfüm-App läuft auf http://localhost:{PORT}/web/")
        print(f"Widget-Vorschau:      http://localhost:{PORT}/web/preview.html")
        print(f"Platzhalter-Generator: http://localhost:{PORT}/tools/platzhalter.html")
        print("Beenden mit Strg+C")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
