// Checks a webOS Developer Mode session with LG, renews it only when few days are left, and prints
// app/devmode.js for it: the token and when the session ends, for the home screen's countdown.
// Node 18+ (global fetch).
//   node devmode-session.mjs <session token> > devmode.js
const token = process.argv[2];
const LG = 'https://developer.lge.com/secure/';
const DAY_MS = 24 * 60 * 60 * 1000;
const RENEW_UNDER_DAYS = 7;

async function call(name) {
  const res = await fetch(LG + name + '.dev?sessionToken=' + encodeURIComponent(token));
  return res.json();
}

// The check answers the time left as "HHH:MM:SS" in errorMsg
async function timeLeft() {
  const check = await call('CheckDevModeSession');
  const left = /(\d+):(\d{2}):(\d{2})/.exec(check.errorMsg || '');
  if (check.result !== 'success' || !left) {
    console.error('Could not check the session: ' + (check.errorMsg || check.errorCode));
    process.exit(1);
  }
  return ((Number(left[1]) * 60 + Number(left[2])) * 60 + Number(left[3])) * 1000;
}

let leftMs = await timeLeft();
if (leftMs < RENEW_UNDER_DAYS * DAY_MS) {
  const reset = await call('ResetDevModeSession');
  if (reset.result !== 'success') {
    console.error('Could not renew the session: ' + (reset.errorMsg || reset.errorCode));
    process.exit(1);
  }
  leftMs = await timeLeft();
  console.error('Developer Mode renewed: ' + Math.floor(leftMs / DAY_MS) + ' days left');
} else {
  console.error('Developer Mode: ' + Math.floor(leftMs / DAY_MS) + ' days left, no renewal needed');
}

process.stdout.write('// Written by tools/install-tv.sh when it installed the app.\n' +
  'window.DEVMODE = ' + JSON.stringify({token, expiresAt: Date.now() + leftMs}) + ';\n');
