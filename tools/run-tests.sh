#!/bin/sh
# Runs every node suite in tools/tests and says WHICH ONES IT FOUND.
#
# That last part is the point. The suites used to live in /tmp; the OS cleaned
# it and six of nine disappeared without a word, because a runner that finds no
# tests reports no failures. This prints the roster every time, so a missing
# suite is visible rather than silent.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)/tests"
[ -d "$DIR" ] || { echo "FAIL: no tools/tests directory"; exit 1; }

total=0; files=0; bad=0; skipped=0
for f in "$DIR"/*.js; do
  name=$(basename "$f" .js)
  [ "$name" = "harness" ] && continue
  files=$((files+1))
  out=$(node "$f" 2>&1) || bad=$((bad+1))
  last=$(printf '%s\n' "$out" | tail -1)
  case "$last" in
    "ALL "*" PASSED")
      n=$(printf '%s\n' "$last" | awk '{print $2}')
      total=$((total+n))
      printf '  %-10s %s\n' "$name" "$last" ;;
    *SKIPPED*|*"cannot run on the app alone"*)
      skipped=$((skipped+1))
      printf '  %-10s SKIPPED\n' "$name" ;;
    *)
      bad=$((bad+1))
      printf '  %-10s %s\n' "$name" "$last" ;;
  esac
done

[ "$files" -eq 0 ] && { echo "FAIL: tools/tests holds no suites"; exit 1; }
echo "  ----"
echo "  $files suites found, $total assertions, $skipped skipped, $bad failing"
[ "$bad" -eq 0 ] || exit 1
