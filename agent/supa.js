// agent/supa.js — minimal Supabase REST client (Node built-ins, no npm deps).
// Used by the agent to (1) pair once via email OTP and (2) publish its
// current tunnel URL + token to the user's printer_agents row on each startup.
const https = require('https');
const { URL } = require('url');

function req(base, path, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = { method, headers: { ...headers } };
    if (data) { opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(data); }
    const r = https.request(u, opts, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        let j = null; try { j = d ? JSON.parse(d) : null; } catch { j = d; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(j);
        else reject(new Error('HTTP ' + res.statusCode + ': ' + (typeof j === 'string' ? j : JSON.stringify(j))));
      });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

function makeSupa(url, anonKey) {
  const h = { apikey: anonKey };
  return {
    // send a one-time code to the email (must be an existing account)
    sendOtp: (email) => req(url, '/auth/v1/otp', { method: 'POST', headers: h, body: { email, create_user: false } }),
    // exchange the emailed code for a session
    verifyOtp: (email, token) => req(url, '/auth/v1/verify', { method: 'POST', headers: h, body: { email, token, type: 'email' } }),
    // trade a stored refresh token for a fresh access token (tokens rotate)
    refresh: (refresh_token) => req(url, '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: h, body: { refresh_token } }),
    // upsert this user's agent row (RLS: bearer's uid must equal user_id)
    publish: (accessToken, row) => req(url, '/rest/v1/printer_agents?on_conflict=user_id', {
      method: 'POST',
      headers: { ...h, Authorization: 'Bearer ' + accessToken, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: row,
    }),
  };
}

module.exports = { makeSupa };
