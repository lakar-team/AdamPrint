#!/usr/bin/env node
/*
 * One-time pairing — link this PC to your ADAMTOOL account.
 * Emails you a code; you paste it. We store a refresh token so the agent can
 * auto-publish its (changing) tunnel URL + token to your account from now on.
 * You only do this once per PC.
 */
const fs = require('fs'), path = require('path'), readline = require('readline');
const { makeSupa } = require('./supa.js');
const SB = require('./supabase.js');
const CFG = path.join(__dirname, 'agent-config.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

(async () => {
  const supa = makeSupa(SB.url, SB.anonKey);
  const cfg = (() => { try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch { return {}; } })();

  console.log('\n=== AdamPrint — pair this PC to your account ===\n');
  const email = (await ask('Your ADAMTOOL email: ')).trim();

  try { await supa.sendOtp(email); }
  catch (e) {
    console.error('\nCould not send a code:', e.message);
    console.error('(This email must already have an ADAMTOOL account.)');
    rl.close(); process.exit(1);
  }

  console.log('\nA sign-in code was emailed to you.');
  console.log('(If the email only has a link and no 6-digit code, add {{ .Token }} to the');
  console.log(' Supabase Magic-Link email template, then try again.)\n');
  const code = (await ask('Enter the code: ')).trim();

  let session;
  try { session = await supa.verifyOtp(email, code); }
  catch (e) { console.error('\nThat code did not verify:', e.message); rl.close(); process.exit(1); }

  if (!session || !session.refresh_token || !session.user) {
    console.error('\nUnexpected response — no session returned.'); rl.close(); process.exit(1);
  }

  cfg.supabase = { refresh_token: session.refresh_token, user_id: session.user.id, email };
  fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2));
  console.log('\n✓ Paired as ' + email + '.');
  console.log('  From now on just run link-my-pc.bat — the website connects to this PC automatically.\n');
  rl.close();
})();
