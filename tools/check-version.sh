#!/bin/sh
# Refuses a push that changes WHAT is cached without bumping sw.js VERSION.
#
# Scope is deliberately narrow. The app HTML is stale-while-revalidate, so an
# ordinary change to docs/pitch-count.html reaches phones on its own, one app
# open later, and must NOT trip this. Guarding it would force a bump on every
# deploy, the cache would be rebuilt every time, and stale-while-revalidate
# would stop buying anything.
#
# What genuinely needs a bump is anything served CACHE-FIRST, because a phone
# that already installed will never refetch it while the cache name is the
# same:
#   - the manifest and the icons
#   - the SHELL list in sw.js, which is literally what gets cached
#
# Other edits to sw.js are self-healing: a byte-different worker installs and
# activates on its own, so fetch-logic changes take effect without a bump.

set -e
REMOTE_REF="${1:-origin/main}"

remote_head=$(git rev-parse --verify --quiet "$REMOTE_REF") || exit 0
[ -z "$remote_head" ] && exit 0

# Cache-first assets. No revalidate path, so a stale cache name strands them.
ASSETS="docs/manifest.json docs/favicon.png docs/apple-touch-icon.png docs/icon-192.png docs/icon-512.png"

version_at() { git show "$1:docs/sw.js" 2>/dev/null | sed -n 's/^var VERSION = \([0-9][0-9]*\);.*/\1/p'; }
shell_at()   { git show "$1:docs/sw.js" 2>/dev/null | sed -n '/^var SHELL = \[/,/^\];/p'; }

changed=$(git diff --name-only "$remote_head" HEAD -- $ASSETS)

if [ "$(shell_at "$remote_head")" != "$(shell_at HEAD)" ]; then
  changed=$(printf '%s\n%s\n' "$changed" "docs/sw.js (SHELL list)" | sed '/^$/d')
fi

[ -z "$changed" ] && exit 0

old=$(version_at "$remote_head")
new=$(version_at HEAD)

if [ -n "$old" ] && [ "$old" = "$new" ]; then
  echo "" >&2
  echo "PUSH BLOCKED: what gets cached changed but sw.js VERSION is still $new." >&2
  echo "" >&2
  echo "Changed:" >&2
  echo "$changed" | sed 's/^/  /' >&2
  echo "" >&2
  echo "These are served cache-first, so a phone that already installed will" >&2
  echo "never refetch them while the cache name is unchanged. Bump VERSION at" >&2
  echo "the top of docs/sw.js, amend the commit, and push again." >&2
  echo "" >&2
  echo "Note: docs/pitch-count.html is NOT guarded. It is stale-while-" >&2
  echo "revalidate and lands by itself on the next app open." >&2
  echo "" >&2
  exit 1
fi
exit 0
