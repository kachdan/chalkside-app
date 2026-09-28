#!/bin/sh
# CHALK-158. Refuses a release whose worker does not match the app it ships.
#
# WHAT IT REPLACES. This used to guard only "cache first" assets, on the
# reasoning that ordinary app changes reached phones through the worker's
# background revalidate and so needed no bump. That reasoning was wrong in the
# only place it mattered. The revalidate ran after the response was already
# sent, and a phone that suspends the worker at that moment never finishes it.
# Six releases, 148 151 152 153 156 and 157, went out and reached nobody, and
# the check stayed green through all six.
#
# So the check is now the simplest thing that cannot be wrong: the stamp in
# sw.js must equal the hash of the app being shipped.
set -e
# ROOT comes from git, not from $0. This script is ALSO the pre-push hook, via
# the symlink .git/hooks/pre-push, and there $0 is inside .git/hooks, so
# dirname/.. resolved to .git and the check failed looking for .git/docs.
# Caught by the hook refusing a real push, which is the hook doing its job.
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || ROOT=""
[ -n "$ROOT" ] || ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP="${CHECK_APP:-$ROOT/docs/pitch-count.html}"
SW="${CHECK_SW:-$ROOT/docs/sw.js}"

[ -f "$APP" ] || { echo "FAIL: no app at $APP"; exit 1; }
[ -f "$SW" ]  || { echo "FAIL: no worker at $SW"; exit 1; }

want=$(shasum -a 256 "$APP" | cut -c1-12)
got=$(sed -n "s/^var BUILD = '\([^']*\)';.*/\1/p" "$SW")

[ -n "$got" ] || { echo "FAIL: sw.js has no BUILD stamp at all"; exit 1; }

if [ "$got" != "$want" ]; then
  echo "FAIL: the worker ships a stamp for a different app."
  echo "      sw.js BUILD          $got"
  echo "      pitch-count.html is  $want"
  echo "      Run tools/stamp-sw.sh and commit the result."
  exit 1
fi

# The cache name must be derived from the stamp, or changing the stamp changes
# nothing that a phone can see.
grep -q "^var CACHE = 'chalkside-' + BUILD;" "$SW" || {
  echo "FAIL: CACHE is not derived from BUILD, so a new stamp reuses the old cache"; exit 1; }

echo "worker stamp $got matches the app it ships"
