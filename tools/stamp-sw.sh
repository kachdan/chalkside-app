#!/bin/sh
# CHALK-158. Stamps docs/sw.js with a hash of docs/pitch-count.html.
#
# Run it after any change to the app, before committing. check-version.sh
# refuses a release where the stamp does not match, so forgetting this is
# caught rather than shipped.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP="$ROOT/docs/pitch-count.html"
SW="$ROOT/docs/sw.js"

[ -f "$APP" ] || { echo "FAIL: no $APP"; exit 1; }
[ -f "$SW" ]  || { echo "FAIL: no $SW";  exit 1; }

stamp=$(shasum -a 256 "$APP" | cut -c1-12)
before=$(grep -c "^var BUILD = '" "$SW" || true)
[ "$before" = "1" ] || { echo "FAIL: expected exactly one BUILD line in sw.js, found $before"; exit 1; }

old=$(sed -n "s/^var BUILD = '\([^']*\)';.*/\1/p" "$SW")
tmp=$(mktemp)
sed "s/^var BUILD = '[^']*';/var BUILD = '$stamp';/" "$SW" > "$tmp"
mv "$tmp" "$SW"

new=$(sed -n "s/^var BUILD = '\([^']*\)';.*/\1/p" "$SW")
[ "$new" = "$stamp" ] || { echo "FAIL: the stamp did not take, sw.js still says '$new'"; exit 1; }

if [ "$old" = "$new" ]; then
  echo "BUILD unchanged at $new (pitch-count.html has not changed)"
else
  echo "BUILD $old -> $new"
fi
