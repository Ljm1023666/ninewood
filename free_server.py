"""本地订阅服务器 — 为 v2rayN 提供 freefq 节点"""
import http.server
import os

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'free_sub.txt')
PORT = 18888

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/', '/sub', '/sub.txt'):
            try:
                with open(FILE, 'rb') as f:
                    data = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(data)
                print(f'[{self.log_date_time_string()}] 200 {len(data)} bytes -> {self.path}')
            except FileNotFoundError:
                self.send_error(404, 'subscription file not found')
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        print(f'[{self.log_date_time_string()}] {args[0]}')

print(f'Freefq 订阅服务器已启动: http://127.0.0.1:{PORT}/sub')
print('在 v2rayN 中添加订阅: 订阅 → 添加 → 输入上述 URL')
print('按 Ctrl+C 停止')
httpd = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print('\n已停止')
    httpd.shutdown()
