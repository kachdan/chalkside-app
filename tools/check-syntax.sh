#!/bin/sh
# Syntax-check EVERY inline script block in the app, and prove it found the big
# one. This exists because a check that ran only block 0 passed for two edits
# while the app itself, block 1, had an unbalanced brace. A check that cannot
# say what it examined is not a check.
#
# The "biggest block over 10KB" assertion is the important half. Without it the
# script happily checks three tiny blocks, reports all green, and never touches
# the 90KB of application code the edit was actually in.
set -e
FILE="${1:-docs/pitch-count.html}"
DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT

COUNT=$(python3 - "$FILE" "$DIR" <<'PY'
import io,re,sys
s=io.open(sys.argv[1],encoding='utf-8').read()
bl=re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
for i,b in enumerate(bl):
    io.open('%s/block%d.js'%(sys.argv[2],i),'w',encoding='utf-8').write(b)
print(len(bl))
PY
)

[ "$COUNT" -gt 0 ] || { echo "FAIL: no inline script blocks found in $FILE"; exit 1; }

BIG=0
for f in "$DIR"/block*.js; do
  SIZE=$(wc -c < "$f" | tr -d ' ')
  if ! node --check "$f" >/dev/null 2>&1; then
    echo "FAIL: syntax error in $(basename "$f") ($SIZE bytes)"
    node --check "$f" || true
    exit 1
  fi
  echo "  ok  $(basename "$f")  $SIZE bytes"
  [ "$SIZE" -gt 10240 ] && BIG=$((BIG+1))
done

if [ "$BIG" -eq 0 ]; then
  echo "FAIL: no block over 10KB was checked. The app block was not seen."
  exit 1
fi

echo "$COUNT inline blocks checked, $BIG of them over 10KB"
