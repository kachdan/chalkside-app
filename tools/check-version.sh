#!/bin/sh
# Fails when a cached file changed but sw.js VERSION did not.
#
# A stale worker serves the old build after a successful push, which is
# indistinguishable from a deploy that failed. Pages has no build log, so the
# only symptom is "the app didn't change".

set -e
REMOTE_REF="${1:-origin/main}"

remote_head=$(git rev-parse --verify --quiet "$REMOTE_REF") || exit 0
[ -z "$remote_head" ] && exit 0

CACHED="docs/pitch-count.html docs/manifest.json docs/favicon.png docs/apple-touch-icon.png docs/icon-192.png docs/icon-512.png"

changed=$(git diff --name-only "$remote_head" HEAD -- $CACHED)
[ -z "$changed" ] && exit 0

version_at() { git show "$1:docs/sw.js" 2>/dev/null | sed -n 's/^var VERSION = \([0-9][0-9]*\);.*/\1/p'; }
old=$(version_at "$remote_head")
new=$(version_at HEAD)

if [ -n "$old" ] && [ "$old" = "$new" ]; then
  echo "" >&2
  echo "PUSH BLOCKED: a cached file changed but sw.js VERSION is still $new." >&2
  echo "" >&2
  echo "Changed:" >&2
  echo "$changed" | sed 's/^/  /' >&2
  echo "" >&2
  echo "Phones on the old worker keep serving the previous build, which looks" >&2
  echo "exactly like a failed deploy. Bump VERSION at the top of docs/sw.js," >&2
  echo "amend the commit, and push again." >&2
  echo "" >&2
  exit 1
fi
exit 0
