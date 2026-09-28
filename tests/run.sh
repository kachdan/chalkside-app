#!/bin/sh
# CHALK-148. THE one command. Runs every suite, every static check, and proves
# the suites can fail.
#
#     ./tests/run.sh
#
# It PRINTS WHAT IT FOUND, always. Six suites were lost from /tmp and nobody
# noticed for a week, because a runner that finds no tests reports no failures.
# The roster and the assertion count are the point, not just the word PASSED.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$DIR")"

echo "SUITES"
total=0; files=0; bad=0; skipped=0
for f in "$DIR"/*.js; do
  name=$(basename "$f" .js)
  case "$name" in harness|make-known-bad) continue;; esac
  files=$((files+1))
  out=$(node "$f" 2>&1) || bad=$((bad+1))
  last=$(printf '%s\n' "$out" | tail -1)
  case "$last" in
    "ALL "*" PASSED")
      n=$(printf '%s\n' "$last" | awk '{print $2}')
      total=$((total+n))
      printf '  %-12s %s\n' "$name" "$last" ;;
    *SKIPPED*|*"cannot run on the app alone"*)
      skipped=$((skipped+1)); printf '  %-12s SKIPPED\n' "$name" ;;
    *) bad=$((bad+1)); printf '  %-12s %s\n' "$name" "$last" ;;
  esac
done
[ "$files" -eq 0 ] && { echo "FAIL: tests/ holds no suites"; exit 1; }
echo "  ----"
echo "  $files suites, $total assertions, $skipped skipped, $bad failing"

echo ""
echo "CHECKS"
printf '  syntax      '; "$ROOT"/tools/check-syntax.sh | tail -1
printf '  names       '; "$ROOT"/tools/check-names.sh | tail -2 | head -1
printf '  icons       '; node "$ROOT"/tools/check-icons.js | tail -1
printf '  version     '; "$ROOT"/tools/check-version.sh >/dev/null 2>&1 && echo "cache version guard ok" || echo "BLOCKED"

echo ""
echo "PROOF that the suites can fail"
"$DIR"/prove.sh || bad=$((bad+1))

echo ""
[ "$bad" -eq 0 ] || { echo "FAILING: $bad"; exit 1; }
echo "green: $files suites, $total assertions, and every known-bad build caught"
