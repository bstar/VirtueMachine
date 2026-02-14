#!/usr/bin/env python3
import argparse
import mimetypes
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


class SecureU6Handler(BaseHTTPRequestHandler):
    server_version = "VirtueMachineHTTP/1.0"

    def do_GET(self):
        self._serve(send_body=True)

    def do_HEAD(self):
        self._serve(send_body=False)

    def _serve(self, send_body: bool):
        parsed = urlparse(self.path)
        req_path = unquote(parsed.path)

        if req_path == "/":
            self._redirect("/modern/client-web/")
            return

        candidate = self._resolve_candidate(req_path)
        if candidate is None:
            self._deny()
            return
        if candidate.is_dir():
            index = candidate / "index.html"
            if index.exists():
                candidate = index
            else:
                self._deny()
                return
        if not candidate.exists() or not candidate.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        ctype, _ = mimetypes.guess_type(str(candidate))
        if ctype is None:
            ctype = "application/octet-stream"

        try:
            size = candidate.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if send_body:
                with candidate.open("rb") as f:
                    self.wfile.write(f.read())
        except OSError:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "Read error")

    def _resolve_candidate(self, req_path: str):
        if not req_path.startswith("/"):
            return None

        # Only serve explicit allowlisted roots needed by the web client.
        allowed_prefixes = (
            "/modern/client-web/",
            "/modern/assets/runtime/",
            "/modern/assets/pristine/",
            "/modern/",
            "/docs/wiki/",
            "/legacy/u6-decompiled/SRC/",
        )
        if req_path not in ("/modern/client-web", "/modern/assets/runtime", "/modern/assets/pristine", "/docs/wiki", "/modern", "/legacy/u6-decompiled/SRC"):
            if not any(req_path.startswith(p) for p in allowed_prefixes):
                return None

        rel = req_path.lstrip("/")
        candidate = (self.server.root_dir / rel).resolve()
        try:
            candidate.relative_to(self.server.root_dir)
        except ValueError:
            return None
        return candidate

    def _redirect(self, location: str):
        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", location)
        self.end_headers()

    def _deny(self):
        self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")

    def log_message(self, format, *args):
        # Keep default logging style but avoid exposing local filesystem paths.
        super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser(description="VirtueMachine restricted dev web server")
    parser.add_argument("--root", required=True, help="Repository root path")
    parser.add_argument("--bind", default="0.0.0.0", help="Bind address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="Port (default: 8080)")
    args = parser.parse_args()

    root_dir = Path(args.root).resolve()
    if not root_dir.exists():
        raise SystemExit(f"Root does not exist: {root_dir}")

    server = ThreadingHTTPServer((args.bind, args.port), SecureU6Handler)
    server.root_dir = root_dir
    print(
        f"Serving VirtueMachine at http://{args.bind}:{args.port}/modern/client-web/ "
        "(allowlisted paths only)"
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
