// Renews a webOS Developer Mode session with LG and prints app/devmode.js for it: the token and when the
// session ends, for the home screen's countdown. Node 18+ (global fetch).
//   node devmode-session.mjs <session token> > devmode.js
const token = process.argv[2];
const LG = 'https://developer.lge.com/secure/';
const SESSION_MS = 1000 * 60 * 60 * 1000; // 1000 hours

async function call(name) {
  const res = await fetch(LG + name + '.dev?sessionToken=' + encodeURIComponent(token));
  return res.json();
}

const reset = await call('ResetDevModeSession');
if (reset.result !== 'success') {
  console.error('Could not renew the session: ' + (reset.errorMsg || reset.errorCode));
  process.exit(1);
}

// The check answers the time left as "HHH:MM:SS" in errorMsg
const check = await call('CheckDevModeSession');
const left = /(\d+):(\d{2}):(\d{2})/.exec(check.errorMsg || '');
const leftMs = left ? ((Number(left[1]) * 60 + Number(left[2])) * 60 + Number(left[3])) * 1000 : SESSION_MS;
const expiresAt = Date.now() + leftMs;

console.error('Developer Mode renewed: ' + Math.floor(leftMs / 86400000) + ' days left');
process.stdout.write('// Written by tools/install-tv.sh when it installed the app.\n' +
  'window.DEVMODE = ' + JSON.stringify({token, expiresAt}) + ';\n');
