#!/bin/sh
# CHALK-148. Proves the suites can fail.
#
# A check you have not seen fail is not a check. This runs every suite against
# every known-bad build and reports which suites NOTICED. A break that nothing
# notices is a gap in the suites, and it is printed as one.
#
# CHALK-159. It now runs every suite against the REAL app first, and discounts
# any suite that is already failing there. A red suite fails on everything, so
# it "catches" every break while proving nothing: that is how t109 sat red
# through CHALK-150 while this script reported a clean sweep, and how t158 goes
# red on every ticket in the window between editing the app and stamping the
# worker. Discounting them here is the general cure, in the one place that
# reads the signal.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
node "$DIR/make-known-bad.js" >/dev/null || { echo "FAIL: could not build the known-bad set"; exit 1; }

red=""
for f in "$DIR"/*.js; do
  suite=$(basename "$f" .js)
  case "$suite" in harness|make-known-bad) continue;; esac
  if ! node "$f" >/dev/null 2>&1; then red="$red $suite"; fi
done
if [ -n "$red" ]; then
  echo "  RED AGAINST THE REAL APP, so discounted below:$red"
  echo "  (a suite that fails on correct code catches every break and proves nothing)"
  echo ""
fi

gaps=0
for bad in "$DIR"/known-bad/*.html; do
  name=$(basename "$bad" .html)
  caught=""
  for f in "$DIR"/*.js; do
    suite=$(basename "$f" .js)
    case "$suite" in harness|make-known-bad) continue;; esac
    case " $red " in *" $suite "*) continue;; esac
    if ! APP="$bad" node "$f" >/dev/null 2>&1; then
      caught="$caught $suite"
    fi
  done
  if [ -n "$caught" ]; then
    printf '  %-26s caught by%s\n' "$name" "$caught"
  else
    printf '  %-26s NOTHING CAUGHT IT\n' "$name"
    gaps=$((gaps+1))
  fi
done

echo "  ----"
if [ -n "$red" ]; then
  echo "  FAILING against the real app:$red"
  echo "  Fix those before trusting anything above."
  exit 1
fi
if [ "$gaps" -gt 0 ]; then
  echo "  $gaps break(s) that no suite notices. That is a gap, not a pass."
  exit 1
fi
echo "  every known-bad build is caught by at least one suite"
