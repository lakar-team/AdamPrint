#!/usr/bin/env node
/*
 * AdamPrint — "expose my PC" launcher.
 * Starts the headless agent AND a Cloudflare tunnel, then prints the
 * Agent URL + token to paste into the website's "Link this PC" (once).
 *
 *   node go.js       (or double-click link-my-pc.bat)
 *
 * The website (adamprint.pages.dev) then drives this PC through the tunnel.
 * You never open a local page — the agent is just the bridge.
 */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

const CFG = path.join(__dirname, 'agent-config.json');
const CLOUDFLARED = path.join(__dirname, '..', 'tools', 'cloudflared.exe');

let cfg;
try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); }
catch { console.error('No agent-config.json — run the agent once first.'); process.exit(1); }
if (!fs.existsSync(CLOUDFLARED)) { console.error('cloudflared.exe not found in tools\\'); process.exit(1); }

console.log('Starting AdamPrint agent + tunnel…');

// 1) headless agent (its own logs stream through)
const agent = spawn('node', [path.join(__dirname, 'agent.js')], { stdio: 'inherit' });

// 2) cloudflare tunnel → the agent
const cf = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:7777', '--no-autoupdate']);

let shown = false;
function scan(buf) {
  const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !shown) {
    shown = true;
    console.log('\n==================================================================');
    console.log('  Your PC is live. In the website (adamprint.pages.dev), open the app,');
    console.log('  click "Link this PC", and paste:\n');
    console.log('    Agent URL :  ' + m[0]);
    console.log('    Token     :  ' + cfg.token);
    console.log('\n  Keep this window open — closing it disconnects your PC.');
    console.log('==================================================================\n');
  }
}
cf.stdout.on('data', scan);
cf.stderr.on('data', scan);

function shutdown(){ try{agent.kill();}catch{} try{cf.kill();}catch{} process.exit(0); }
process.on('SIGINT', shutdown);
cf.on('exit', () => { console.log('Tunnel closed.'); shutdown(); });
