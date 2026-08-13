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
const fs = require('fs'), path = require('path'), os = require('os');
const { makeSupa } = require('./supa.js');
const SB = require('./supabase.js');

const CFG = path.join(__dirname, 'agent-config.json');
const CLOUDFLARED = [
  path.join(__dirname, '..', 'tools', 'cloudflared.exe'), // dev/repo layout
  path.join(__dirname, 'cloudflared.exe'),                // installed layout
].find(p => fs.existsSync(p)) || path.join(__dirname, 'cloudflared.exe');

let cfg;
try { cfg = JSON.parse(fs.readFileSync(CFG, 'utf8')); }
catch { console.error('No agent-config.json — run the agent once first.'); process.exit(1); }
if (!fs.existsSync(CLOUDFLARED)) { console.error('cloudflared.exe not found in tools\\'); process.exit(1); }

console.log('Starting AdamPrint agent + tunnel…');

// 1) headless agent (its own logs stream through)
const agent = spawn('node', [path.join(__dirname, 'agent.js')], { stdio: 'inherit' });

// 2) cloudflare tunnel → the agent
const cf = spawn(CLOUDFLARED, ['tunnel', '--url', 'http://localhost:7777', '--no-autoupdate']);

async function publish(agentUrl) {
  const c = JSON.parse(fs.readFileSync(CFG, 'utf8'));
  if (!c.supabase || !c.supabase.refresh_token) {
    console.log('  (Not paired yet — run pair.bat once to make this automatic.');
    console.log('   Until then, use "Link this PC" in the website with the URL + token above.)\n');
    return;
  }
  try {
    const supa = makeSupa(SB.url, SB.anonKey);
    const s = await supa.refresh(c.supabase.refresh_token);
    if (s.refresh_token && s.refresh_token !== c.supabase.refresh_token) {
      c.supabase.refresh_token = s.refresh_token; fs.writeFileSync(CFG, JSON.stringify(c, null, 2));
    }
    await supa.publish(s.access_token, { user_id: c.supabase.user_id, agent_url: agentUrl, agent_token: c.token, host: os.hostname() });
    console.log('  ✓ Published to your account (' + c.supabase.email + ') — the website auto-connects on login.\n');
  } catch (e) {
    console.log('  (Auto-publish failed: ' + e.message + ' — you can still use Link this PC.)\n');
  }
}

let shown = false;
function scan(buf) {
  const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m && !shown) {
    shown = true;
    console.log('\n==================================================================');
    console.log('  Your PC is live at:');
    console.log('    Agent URL :  ' + m[0]);
    console.log('    Token     :  ' + cfg.token);
    console.log('  Keep this window open — closing it disconnects your PC.');
    console.log('==================================================================');
    publish(m[0]);
  }
}
cf.stdout.on('data', scan);
cf.stderr.on('data', scan);

function shutdown(){ try{agent.kill();}catch{} try{cf.kill();}catch{} process.exit(0); }
process.on('SIGINT', shutdown);
cf.on('exit', () => { console.log('Tunnel closed.'); shutdown(); });
