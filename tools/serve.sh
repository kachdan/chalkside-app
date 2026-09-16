#!/bin/sh
# Serve docs/ for a browser verification run, and refuse to be ambiguous.
#
# This exists because of a real failure: an http.server from an earlier session
# still owned port 8000, a second one failed to bind, nothing checked, and a
# verification run measured the WRONG REPO for several minutes. The only reason
# it surfaced was a function coming back undefined.
#
# A verification that cannot name what it measured is not a verification.

set -e
PORT="${1:-8000}"
ROOT=$(cd "$(dirname "$0")/../docs" && pwd)

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  holder=$(lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN | head -1)
  echo "" >&2
  echo "PORT $PORT IS ALREADY BOUND. Refusing to start." >&2
  echo "  pid $holder" >&2
  # cwd alone lies when the holder was started with --directory, so show both
  echo "  cwd:  $(lsof -a -p "$holder" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2-)" >&2
  echo "  argv: $(ps -o command= -p "$holder" 2>/dev/null)" >&2
  echo "" >&2
  echo "Anything you verify on this port measures THAT directory, not this one." >&2
  echo "Free it, or pass another port: tools/serve.sh 8001" >&2
  echo "" >&2
  exit 1
fi

python3 -m http.server "$PORT" --directory "$ROOT" >/tmp/chalkside-serve-$PORT.log 2>&1 &
pid=$!
# a bind failure is not instant; give it a moment, then prove it is really up
i=0
while [ $i -lt 20 ]; do
  if lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | grep -q "^$pid$"; then break; fi
  kill -0 "$pid" 2>/dev/null || { echo "SERVER DIED:" >&2; cat /tmp/chalkside-serve-$PORT.log >&2; exit 1; }
  i=$((i+1))
  perl -e 'select(undef,undef,undef,0.1)'
done

served=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2-)
echo "VERIFYING"
echo "  url:      http://localhost:$PORT/pitch-count.html"
echo "  serving:  $ROOT"
echo "  cwd:      $served"
echo "  pid:      $pid"
echo "  commit:   $(git -C "$ROOT/.." rev-parse --short HEAD) $(git -C "$ROOT/.." symbolic-ref --short HEAD 2>/dev/null)"
echo "  dirty:    $(git -C "$ROOT/.." status --porcelain -- docs | wc -l | tr -d ' ') uncommitted file(s) under docs/"
