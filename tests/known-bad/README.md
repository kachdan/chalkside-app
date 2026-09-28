# Known-bad builds

A check you have not seen fail is not a check. Each file here is the app with
ONE rule broken on purpose, and `tests/prove.sh` runs every suite against every
one of them and reports which suites noticed.

They are generated from the current `docs/pitch-count.html` by
`tests/make-known-bad.js`, so they cannot go stale against a build they no
longer resemble.

The `.html` files here are NOT committed. They are generated from the current
`docs/pitch-count.html` every time `prove.sh` runs, so they can never be stale
against the build they are meant to test. `make-known-bad.js` refuses to write
a file whose anchor has moved, and says which, rather than producing something
that no longer breaks anything.
