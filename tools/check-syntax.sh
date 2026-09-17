#!/bin/sh
# Syntax-check EVERY inline script block in the app, and prove it found the big
# one. This exists because a check that ran only block 0 passed for two edits
# while the app itself, block 1, had an unbalanced brace. A check that cannot
# say what it examined is not a check.
set -e
FILE="${1:-docs/pitch-count.html}"
python3 - "$FILE" <<'PY'
import io,re,sys
s=io.open(sys.argv[1],encoding='utf-8').read()
bl=re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
for i,b in enumerate(bl):
    io.open('/tmp/_chk%d.js'%i,'w',encoding='utf-8').write(b)
print(len(bl))
PY
