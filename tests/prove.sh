#!/bin/sh
# CHALK-148. Proves the suites can fail.
#
# A check you have not seen fail is not a check. This runs every suite against
# every known-bad build and reports which suites NOTICED. A break that nothing
# notices is a gap in the suites, and it is printed as one.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
node "$DIR/make-known-bad.js" >/dev/null || { echo "FAIL: could not build the known-bad set"; exit 1; }

gaps=0
for bad in "$DIR"/known-bad/*.html; do
  name=$(basename "$bad" .html)
  caught=""
  for f in "$DIR"/*.js; do
    suite=$(basename "$f" .js)
    case "$suite" in harness|make-known-bad) continue;; esac
    if ! APP="$bad" node "$f" >/dev/null 2>&1; then
      caught="$caught $suite"
    fi
  done
  if [ -n "$caught" ]; then
    printf '  %-24s caught by%s\n' "$name" "$caught"
  else
    printf '  %-24s NOTHING CAUGHT IT\n' "$name"
    gaps=$((gaps+1))
  fi
done

echo "  ----"
if [ "$gaps" -gt 0 ]; then
  echo "  $gaps break(s) that no suite notices. That is a gap, not a pass."
  exit 1
fi
echo "  every known-bad build is caught by at least one suite"
