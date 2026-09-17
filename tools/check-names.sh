#!/bin/sh
# Catches the silent-overwrite hazard: a name that exists BOTH as a top level
# function declaration and as a var/assignment somewhere else. var hoists to
# function scope, so the assignment wins at load and the function quietly
# disappears. Nothing throws.
#
# That is what happened to CHALK-130: "var ask = function(){...}" inside the
# wake lock if-block overwrote "function ask(o,onYes)", so every confirmation
# in the app became a wake lock request that opened nothing.
#
# Two earlier versions of this check were wrong. One only looked at
# "^function name" and never saw the var. The other tried to track brace depth
# across 89KB of JS to tell globals from locals, drifted, and passed a file with
# the bug deliberately put back. This version does no scope analysis at all: it
# pairs declaration forms, which is the thing that actually bites.
set -e
python3 - "${1:-docs/pitch-count.html}" <<'PY'
import io,re,sys
s=io.open(sys.argv[1],encoding='utf-8').read()
js=''.join(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S))
js=re.sub(r'/\*.*?\*/','',js,flags=re.S)
js=re.sub(r'//[^\n]*','',js)

funcs=set(re.findall(r'\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(', js))
assigned=set(re.findall(r'\b(?:var|let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=', js))
assigned |= set(re.findall(r'^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function', js, re.M))

shadowed=sorted(funcs & assigned)
ids=set(re.findall(r'''\bid=["']([A-Za-z0-9_-]+)["']''',s))
idclash=sorted(ids & funcs)

bad=False
if shadowed:
    print('FUNCTION SILENTLY OVERWRITTEN BY AN ASSIGNMENT:')
    for n in shadowed: print('  %s  is both "function %s(" and an assignment'%(n,n))
    bad=True
else:
    print('functions shadowed by an assignment: none  (%d functions checked)'%len(funcs))
if idclash:
    print('ELEMENT IDS THAT SHADOW A FUNCTION:')
    for n in idclash: print('  '+n)
    bad=True
else:
    print('ids colliding with a function: none  (%d ids checked)'%len(ids))
sys.exit(1 if bad else 0)
PY
