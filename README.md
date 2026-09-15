# ChalkSide

Youth baseball coaching tools. Static HTML, no build step, no framework,
no npm. Every app is a single self-contained file that runs from the
filesystem or from any static host.

## Apps

| File | What it is | Status |
| --- | --- | --- |
| `pitch-count.html` | Game day pitch count and rest eligibility | Ships first |

This repo holds the pitch count app only. The practice drill tool is a
separate project and does not live here.

The eventual destination is one app on a shared roster and a shared Google
Sheet. That merge is deliberate future work, not something to do
incidentally.

## Running locally

Open `pitch-count.html` directly in a browser, or serve the folder:

```
python3 -m http.server 8080
```

In VS Code, the Live Preview extension gives an in-editor preview pane:
open `pitch-count.html` and run **Live Preview: Show Preview** (or click the
preview icon in the editor title bar). See `.vscode/extensions.json`.

`localStorage` is per-origin, so `file://` and `http://localhost:8080` keep
separate data. Pick one and stay on it while testing.

## State

Everything lives in `localStorage` on the device. Keys in use:

| Key | Holds |
| --- | --- |
| `pitchcount_v1` | Roster, outing log, current game, opponent count |
| `chalkside_seeded_v1` | Dead key from the old seeding build, left in place |
| `chalkside_sync_url` | Google Apps Script web app URL |
| `chalkside_team_name` | Team name, typed in Settings, never in source |

Bump the version suffix rather than mutating an existing shape.

The roster starts empty. Paste a team list into **Settings > Roster** to fill
it; no roster ships in source.

## Google Sheet sync

Outings POST to an Apps Script web app URL set from **Settings > Sheet setup**.
The payload carries a `sheet` field so the script routes to the right tab:
game data to `Game Log`, practice data to `Pitching History`.

A failed POST must never lose the outing. The record stays local and unsent,
and **Send unsent** retries it.

## Deploy

GitHub Pages, served from `main` with `/docs` as the publish folder, at
https://chalkside.com. The app is at
`/pitch-count.html`. `CNAME` holds the domain and `robots.txt` disallows
crawling, as does a `noindex, nofollow` meta in the app itself.

Bump `VERSION` at the top of `docs/sw.js` when what gets cached, or how it is
served, changes. `tools/check-version.sh` enforces it: install it as a pre-push
hook and a push that changes a cached file without moving `VERSION` is blocked.

    ln -sf ../../tools/check-version.sh .git/hooks/pre-push

Hooks are local and a clone does not carry them, so run that line after a fresh
clone. Nothing else spells the cache name out, and a stale worker serves the old
build after a successful push, which looks exactly like a deploy that failed.
Pages has no build log to check, so the only symptom is the app not changing.

## Conventions

One font (Fira Sans), colour tokens only in `:root`, inlined Lucide SVG with no
CDN, 44px minimum tap targets, ES5-flavoured vanilla JS, single file per app,
no build step.

No roster, team name, or player detail ships in source. Everything identifying
lives in `localStorage` on the device.
