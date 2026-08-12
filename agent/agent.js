#!/usr/bin/env node
/*
 * AdamPrint local agent — the web ↔ PC bridge (Phase 1: local).
 *
 * Serves the console UI (../public) AND a small JSON API on localhost, so the
 * browser can see and manage this PC's files. No external deps (Node built-ins).
 * Preference, not a rule — see ../DESIGN-NOTES.md. The Phase-2 version dials out
 * to the cloud hub so the public site can reach it from anywhere.
 *
 *   node agent.js          → http://localhost:7777
 *
 * API:
 *   GET  /api/status                 → { agent, dataDir, connected, host, printer }
 *   GET  /api/config                 → { dataDir }
 *   POST /api/config {dataDir}        → set data folder (creates library/sliced/profiles)
 *   GET  /api/models                 → { dir, models:[{name,size,mtime}] } (STL/3MF/OBJ in library/)
 *   GET  /api/gcodes                 → { gcodes:[{name,size}] } (sliced/)
 *   GET  /api/file?path=library/x.stl → raw file bytes (sandboxed to dataDir)
 */
const http = require('http'), fs = require('fs'), path = require('path'),
      url = require('url'), os = require('os'), crypto = require('crypto');

const PORT = 7777;
const PUBLIC = path.join(__dirname, '..', 'public');
const CFG = path.join(__dirname, 'agent-config.json');

// No hardcoded default — each user sets their own data folder via the console.
// (Never assume a C:\ path; this is per-user and per-machine.)
function loadCfg(){ try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); }
  catch { return { dataDir: '' }; } }
function saveCfg(c){ fs.writeFileSync(CFG, JSON.stringify(c, null, 2)); }
function ensureDirs(dir){ for (const s of ['library','sliced','profiles'])
  fs.mkdirSync(path.join(dir, s), { recursive: true }); }

const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.json':'application/json','.svg':'image/svg+xml','.png':'image/png',
  '.stl':'application/octet-stream','.3mf':'application/octet-stream','.gcode':'text/plain'};

// generate an access token on first run (required for /api/* once exposed)
(function ensureToken(){ const c = loadCfg();
  if (!c.token) { c.token = crypto.randomBytes(24).toString('hex'); saveCfg(c); } })();

// create the workspace subfolders only once a data folder has been set
{ const _c = loadCfg(); if (_c.dataDir) ensureDirs(_c.dataDir); }

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  const json = (code, obj) => { res.writeHead(code, {'Content-Type':'application/json',
    'Access-Control-Allow-Origin':'*'}); res.end(JSON.stringify(obj)); };

  // ---------- auth: /api/* needs the token (header or ?token=) ----------
  if (u.pathname.startsWith('/api/')) {
    const tok = req.headers['x-adamprint-token'] || u.query.token;
    if (tok !== loadCfg().token) return json(401, { error:'unauthorized — missing/invalid token' });
  }

  // ---------- API ----------
  if (u.pathname === '/api/status')
    return json(200, { agent:'adamprint', version:'0.1', dataDir:loadCfg().dataDir,
      connected:true, host:os.hostname(), printer:'not_connected' });

  if (u.pathname === '/api/config' && req.method === 'GET')
    return json(200, loadCfg());

  if (u.pathname === '/api/config' && req.method === 'POST') {
    let b=''; req.on('data', d => b += d); req.on('end', () => {
      try { const { dataDir } = JSON.parse(b);
        if (!dataDir) return json(400, { ok:false, error:'dataDir required' });
        ensureDirs(dataDir); const c = loadCfg(); c.dataDir = dataDir; saveCfg(c);
        json(200, { ok:true, dataDir });
      } catch (e) { json(400, { ok:false, error:e.message }); } });
    return;
  }

  if (u.pathname === '/api/models') {
    const dd = loadCfg().dataDir; if (!dd) return json(200, { dir:null, models:[] });
    const dir = path.join(dd, 'library'); let models=[];
    try { models = fs.readdirSync(dir).filter(f => /\.(stl|3mf|obj)$/i.test(f))
      .map(f => { const st = fs.statSync(path.join(dir,f)); return {name:f,size:st.size,mtime:st.mtimeMs}; }); } catch {}
    return json(200, { dir, models });
  }

  if (u.pathname === '/api/gcodes') {
    const dd = loadCfg().dataDir; if (!dd) return json(200, { gcodes:[] });
    const dir = path.join(dd, 'sliced'); let gcodes=[];
    try { gcodes = fs.readdirSync(dir).filter(f => /\.gcode$/i.test(f))
      .map(f => ({ name:f, size:fs.statSync(path.join(dir,f)).size })); } catch {}
    return json(200, { gcodes });
  }

  if (u.pathname === '/api/file') {
    const root = loadCfg().dataDir; if (!root) return json(400, { error:'no data folder set' });
    const abs = path.resolve(root, u.query.path || '');
    if (!abs.startsWith(path.resolve(root))) return json(403, { error:'path outside data folder' });
    fs.readFile(abs, (e, data) => { if (e) return json(404, { error:'not found' });
      res.writeHead(200, { 'Content-Type':MIME[path.extname(abs).toLowerCase()]||'application/octet-stream',
        'Access-Control-Allow-Origin':'*' }); res.end(data); });
    return;
  }

  // ---------- static UI ----------
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const fp = path.resolve(PUBLIC, '.' + p);
  if (!fp.startsWith(path.resolve(PUBLIC))) { res.writeHead(403); return res.end('no'); }
  fs.readFile(fp, (e, data) => { if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream' });
    res.end(data); });
});

server.listen(PORT, '127.0.0.1', () => {
  const c = loadCfg();
  console.log(`AdamPrint agent → http://localhost:${PORT}  (data: ${c.dataDir})`);
  console.log(`Open the app:  http://localhost:${PORT}/app.html?token=${c.token}`);
});
