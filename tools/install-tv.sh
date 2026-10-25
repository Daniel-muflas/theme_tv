#!/bin/sh
# Installs the home screen on a TV registered with ares-setup-device and opens it. On the way it renews the
# TV's Developer Mode session and hands the app the session's token and end, for its countdown and renewal.
# Runs in the cli image:
#   docker compose run --rm --build cli install-tv [DEVICE]    (DEVICE defaults to "tv")
set -eu
DEVICE="${1:-tv}"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cp -r /work/app "$WORK/app"
# Its version is now: a later push to GitHub updates it, an earlier one does not
echo "window.APP_VERSION = $(date +%s);" > "$WORK/app/version.js"

echo "Reading the Developer Mode session token from $DEVICE..."
# Only the token: ares-novacom also prints an "[Info] Set target device" line
TOKEN=$(ares-novacom -d "$DEVICE" --run "cat /var/luna/preferences/devmode_enabled" 2>/dev/null \
  | grep -oE '[0-9a-fA-F]{32,}' | head -n 1 || true)
if [ -n "$TOKEN" ] && node /usr/local/lib/devmode-session.mjs "$TOKEN" > "$WORK/devmode.js"; then
  mv "$WORK/devmode.js" "$WORK/app/devmode.js"
else
  echo "The countdown stays unknown: no session token, or LG did not answer."
fi

ares-package --no-minify "$WORK/app" -o "$WORK/out"
ares-install -d "$DEVICE" "$WORK"/out/*.ipk
ares-launch -d "$DEVICE" io.themetv.home
