import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const HOST = '0.0.0.0';
const PORT = Number.parseInt(process.env.SERVER_PORT || process.env.PORT || '31025', 10);
const ROOT = path.resolve(process.cwd(), 'public');
const VERSION = 'Tux Paint 0.9.35 (WebAssembly)';
const REQUIRED = ['index.html', 'tuxpaint.js', 'tuxpaint.wasm', 'tuxpaint.data'];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};
function ready() {
  return REQUIRED.every(f => {
    try { return fs.statSync(path.join(ROOT, f)).isFile(); }
    catch { return false; }
  });
}
const server = http.createServer((req, res) => {
  const common = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Access-Control-Allow-Origin': 'same-origin'
  };
  if (req.url === '/health' || req.url === '/health/') {
    const ok = ready();
    res.writeHead(ok ? 200 : 503, {
      ...common, 'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({ok, app:'tuxpaint-original-wasm', version:VERSION, sound:'SDL2 Mixer', mode:'per-browser'}));
    return;
  }
  if (!['GET','HEAD'].includes(req.method || '')) {
    res.writeHead(405, {...common, Allow:'GET, HEAD'}); res.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
  catch { res.writeHead(400, common); res.end('Invalid URL'); return; }
  const target = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!(target === ROOT || target.startsWith(ROOT + path.sep))) {
    res.writeHead(403, common); res.end('Forbidden'); return;
  }
  fs.stat(target, (error, st) => {
    if (error || !st.isFile()) {
      res.writeHead(404, {...common, 'Content-Type':'text/plain; charset=utf-8'});
      res.end('Not found'); return;
    }
    const ext = path.extname(target).toLowerCase();
    const headers = {
      ...common,
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
      'Content-Length': st.size
    };
    let start=0, end=st.size - 1, status=200;
    if (req.headers.range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!m || (!m[1] && !m[2])) {
        res.writeHead(416, {...common, 'Content-Range': 'bytes */'+st.size}); res.end(); return;
      }
      if (!m[1]) {
        const suffix=Number(m[2]); start=Math.max(0, st.size-suffix);
      } else {
        start=Number(m[1]);
        if (m[2]) end=Math.min(end, Number(m[2]));
      }
      if (start > end || start >= st.size) {
        res.writeHead(416, {...common, 'Content-Range':'bytes */'+st.size}); res.end(); return;
      }
      status=206;
      headers['Content-Range']='bytes '+start+'-'+end+'/'+st.size;
      headers['Content-Length']=end-start+1;
    }
    res.writeHead(status, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    const stream=fs.createReadStream(target, {start,end});
    stream.on('error', err => { console.error('stream error',err); res.destroy(); });
    stream.pipe(res);
  });
});
server.listen(PORT, HOST, () => {
  console.log('Tux Paint original WebAssembly server listening on '+HOST+':'+PORT);
  console.log('Ready: '+ready()+'; files: '+REQUIRED.join(', '));
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
