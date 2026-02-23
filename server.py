import http.server
import os
import sys
import urllib.parse

PORT = 3000
DASHBOARD_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(DASHBOARD_DIR, '..', 'smart_city_poc')

MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ico': 'image/x-icon',
}


class DashboardHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        url_path = urllib.parse.unquote(self.path.split('?')[0])
        if url_path == '/':
            url_path = '/index.html'

        # Resolve file path
        if url_path.startswith('/assets/'):
            rel = url_path[len('/assets/'):]
            file_path = os.path.join(ASSETS_DIR, rel.replace('/', os.sep))
        else:
            file_path = os.path.join(DASHBOARD_DIR, url_path.lstrip('/').replace('/', os.sep))

        file_path = os.path.realpath(file_path)

        # Security check
        if not (file_path.startswith(os.path.realpath(DASHBOARD_DIR)) or
                file_path.startswith(os.path.realpath(ASSETS_DIR))):
            self.send_error(403, 'Forbidden')
            return

        if not os.path.isfile(file_path):
            self.send_error(404, 'Not Found')
            return

        ext = os.path.splitext(file_path)[1].lower()
        mime = MIME_TYPES.get(ext, 'application/octet-stream')
        file_size = os.path.getsize(file_path)

        # Range request support for video
        range_header = self.headers.get('Range')
        if range_header and mime.startswith('video/'):
            # --- Parse range header (only 416 here, before any headers are sent) ---
            try:
                parts = range_header.replace('bytes=', '').split('-')
                start = int(parts[0]) if parts[0] else file_size - int(parts[1])
                end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
                if start < 0 or start >= file_size or end >= file_size or start > end:
                    raise ValueError('Out of range')
                chunk_size: int = end - start + 1
            except (ValueError, IndexError):
                self.send_error(416, 'Range Not Satisfiable')
                return

            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Length', str(chunk_size))
            self.send_header('Content-Type', mime)
            self.end_headers()

            # --- Send data (connection drops are normal during video streaming) ---
            try:
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining: int = chunk_size
                    while remaining > 0:
                        read_size = min(remaining, 65536)
                        data = f.read(read_size)
                        if not data:
                            break
                        self.wfile.write(data)
                        remaining -= len(data)
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                pass  # Client disconnected — normal browser behaviour for video
            return

        # Normal response
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(file_size))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        with open(file_path, 'rb') as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)

    def log_message(self, format, *args):
        status = args[1] if len(args) > 1 else ''
        path = args[0] if args else ''
        color = '\033[32m' if str(status).startswith('2') else '\033[33m'
        print(f'  {color}{status}\033[0m {path}')


if __name__ == '__main__':
    print()
    print('  \033[36m\033[1m🔬 Vigilant Labs Dashboard\033[0m')
    print('  ─────────────────────────')
    print(f'  ➜ Local: \033[32mhttp://localhost:{PORT}\033[0m')
    print()

    server = http.server.HTTPServer(('', PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
        server.server_close()
