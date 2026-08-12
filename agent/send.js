#!/usr/bin/env node
/*
 * AdamPrint agent — send a sliced G-code file to the printer.
 *
 * Usage:  node send.js <path-to-gcode> [--start]
 *   --start  begin printing immediately after upload (otherwise just uploads)
 *
 * Config:  copy config.example.json -> config.json and set the printer IP.
 *
 * This is a working preference, not a rule (see ../DESIGN-NOTES.md). The
 * Moonraker path is the reliable, documented one. The stock FlashForge LAN
 * path (port 8899) is intentionally left to confirm against the real 5M —
 * rooting for Moonraker is the recommended route.
 *
 * No external dependencies — Node built-ins only.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

function loadConfig() {
  const p = path.join(__dirname, 'config.json');
  if (!fs.existsSync(p)) {
    console.error('No agent/config.json yet.');
    console.error('Copy config.example.json -> config.json and set "printerIp".');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Upload (and optionally start) a print via Moonraker's file API.
function sendMoonraker(cfg, gcodePath, autostart) {
  const data = fs.readFileSync(gcodePath);
  const filename = path.basename(gcodePath);
  const boundary = '----adamprint' + Date.now().toString(16);

  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`
  );
  const printField = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="print"\r\n\r\n` +
    `${autostart ? 'true' : 'false'}\r\n`
  );
  const tail = Buffer.from(`--${boundary}--\r\n`);
  const body = Buffer.concat([head, data, printField, tail]);

  const req = http.request(
    {
      host: cfg.printerIp,
      port: cfg.moonrakerPort || 7125,
      path: '/server/files/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    },
    (res) => {
      let out = '';
      res.on('data', (c) => (out += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(
            autostart
              ? `OK — uploaded and started: ${filename}`
              : `OK — uploaded (not started): ${filename}`
          );
        } else {
          console.error(`Moonraker ${res.statusCode}: ${out}`);
        }
      });
    }
  );
  req.on('error', (e) =>
    console.error(
      'Send failed:',
      e.message,
      `\n(Is the 5M on, reachable at ${cfg.printerIp}, and Moonraker enabled?)`
    )
  );
  req.write(body);
  req.end();
}

function main() {
  const args = process.argv.slice(2);
  const gcode = args.find((a) => !a.startsWith('--'));
  const autostart = args.includes('--start');

  if (!gcode) {
    console.error('Usage: node send.js <path-to-gcode> [--start]');
    process.exit(1);
  }
  if (!fs.existsSync(gcode)) {
    console.error('No such file: ' + gcode);
    process.exit(1);
  }

  const cfg = loadConfig();
  const mode = cfg.mode || 'moonraker';

  if (mode === 'moonraker') {
    sendMoonraker(cfg, gcode, autostart);
  } else {
    console.error(
      `mode "${mode}": the stock FlashForge LAN path (port 8899) isn't ` +
        `implemented yet — it needs verifying against the real 5M on arrival. ` +
        `Rooting the printer to enable Moonraker is the recommended path.`
    );
    process.exit(1);
  }
}

main();
