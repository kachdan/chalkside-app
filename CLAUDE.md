# ChalkSide

Youth baseball coaching app. Spelled **ChalkSide**, not ChalkSight.
Domains owned: chalkside.com, chalkside.net, chalkside.org.

## Three repos, three jobs

| Repo | What it is |
| --- | --- |
| `kachdan/chalkside-app` | **Public. The working repo.** Served at chalkside.com by GitHub Pages from `/docs`. All app work happens here. |
| `kachdan/chalkside` | **Private, archived, frozen.** Its history cannot be made public, which is why this repo was started from a fresh one. Do not commit there. Its Netlify build is **not a fallback**, see below. |
| `kachdan/chalkside-intent` | **Private.** One intent file per ticket, written before the work starts. See Definition of done. |

This file lives in chalkside-app, at the repo root and not in `/docs`, so it is
never served. A session reads CLAUDE.md from the repo it opens, which is why it
is here and not in the archive.

## The app

| File | What it is |
| --- | --- |
| `pitch-count.html` | Game day pitch count and rest eligibility. The one that ships first. |

This repo holds the pitch count app only. The practice drill tool
(`pitching-tracker.html`, coach taps IN or OUT per pitch) is a **separate
project and is not in this repo**. Do not look for it here and do not create
it here.

The intended destination is one app sharing a single roster and a single
Google Sheet, but that merge has not happened yet. Do not merge them without
being asked.

## Naming rule (hard)

The team name never appears in anything external facing: filenames, repo names,
branch names, exported file names, README, commit messages, page titles, deploy
URLs, `manifest.json`, or the service worker cache name.

It is not in source at all. A coach types it into **Settings > Team name**, it
lives in `localStorage` under `chalkside_team_name`, and the Team tab header
falls back to "Team" when it is blank. Displaying it inside the running app is
the point; shipping it is not.

`ChalkSide` is the product name, not the team, and is fine everywhere.

## Design system

One font only: **Fira Sans** (Google Fonts): roman 400/500/600/700 plus
**italic 200**, which is used for the jersey number inside the badge and
nothing else. Italic is a separate file from the roman, so the link asks for
the `ital` axis; roman 200 is deliberately not requested since nothing uses it.
Hierarchy comes from size and weight, never from a second typeface.

Tokens live in `:root` at the top of each file. Never hardcode a hex value
anywhere else.

```
--primary:#08487D    /* buttons, active nav, jersey chips */
--primary-dark:#063A66
--paper:#FFFFFF      /* page background, chosen for sun readability */
--paper-2:#F4F5F7    /* cards and surfaces */
--ink:#16181A        /* primary text */
--ink-soft:#5F6469   /* secondary text */
--gray:#949494       /* borders and disabled only, too light for text */
--rule:#D9DCE0
--safe:#3F9A4D       /* success */
--caution:#DD9821    /* warning */
--caution-dark:#B77A15
--stop:#DC0C1D       /* error */
--info:#1F66F6       /* reserved, currently unused, fights --primary */
```

Icons: **Lucide** (lucide.dev), ISC licensed, inlined as raw SVG so the app
works with no signal at the field. Never load icons from a CDN.
Current set: `users` (Team), `list` (Log), `clipboard-list` (Roster),
`settings` (Settings). Count uses `baseball` from **Lucide Lab**, a separate
collection from core Lucide and not covered by the ISC line above.

Count is the raised circle in the centre of the tab bar and carries no label.
Its active state is the circle deepening to `--primary-dark`; the other four
keep the pill treatment.

## Conventions

- Single file per app. No build step, no framework, no npm.
- Vanilla ES5-flavoured JS. It runs on whatever phone a parent hands over.
- Every tap target is at least 44px. This gets used one handed, standing up,
  during a game, in the sun.
- All state in `localStorage`, keyed and versioned (`pitchcount_v1`).
- Never lose data on a failed network call. Mark the record unsent and offer a
  retry. A quietly dropped outing is the worst possible bug in this app.
- **Recoverable from observation.** Any state the app holds about the game must
  be re-settable from something a distracted coach can see in one glance at the
  field. Not reconstructed, not undone step by step. Looked at, and corrected in
  a tap. He is interrupted constantly and will look up having lost the thread;
  what he can still see is who is on the mound and who is behind the plate.
- **No roster ships in source.** The app boots empty and is filled from
  Settings > Roster by pasting a team list. No player name, jersey number or
  team name belongs in either file, because this is headed for a public repo.
  `chalkside_seeded_v1` is a dead key from the old seeding build; it is left in
  returning users' storage deliberately rather than cleaned up, since touching
  it would be a write to their data for no benefit.

## League rules

Union County Cal Ripken League, **Majors Division, Spring 2026**. Not Little
League; the numbers differ, so do not "correct" them against a Little League
table.

- 75 pitches a day, `MAX`.
- Rest, `BRACKETS`: 1-30 none, 31-45 one day, 46-60 two, 61+ three.
- 4+ innings caught blocks pitching in the same game.
- 75 and the rest brackets are judged on the **day total**, the sum of every
  outing on a date, not on one appearance. The table is headed
  `MAX - (DAY /GAME)` and rest days do not begin until the following day.
- Off the mound means done pitching for that game, even after one pitch.
- A pitcher who reaches 75 may stay in the game anywhere except catcher.

**Three outs is the only thing that ends a half inning.** From the source:
"Each half inning shall be complete when three outs are recorded. THERE ARE NO
RUN LIMITS PER INNING IN MAJOR", capitalised in the original. So the batting
screen is correct as built and **there is no run cap to add**. Recorded here
because a run limit is a plausible-sounding thing to add later, and it would be
wrong.

Two rules the app deliberately does not model, both fine:

- A ten run rule after four completed innings, three and a half if the home
  team leads.
- The home team is the official pitch count recorder, and both managers and the
  umpire sign the scorebook. The app is Dan's record, not the official one.

Catcher innings belong to one calendar day. `caughtToday()` returns 0 unless
`S.game.date` is today, and `carriedCatchers()` is the only way a tally moves
into a new `S.game`. The rollover runs at load **and** on `visibilitychange`,
because a resumed iOS PWA never re-executes the script.

`pitchEligibility()` is the single decision point for all of it. The picker,
the Count list, the Team tab and the header count all read from it, so a rule
change lands everywhere at once. Do not re-derive eligibility anywhere else.

## Google Sheet sync

Outings POST to a Google Apps Script web app URL. **No endpoint ships in source.**
The page is served publicly, and the script must accept anonymous POSTs for the
app to work, so a baked-in URL is one anyone can read and write to. It is pasted
once into Settings > Sheet setup and lives in `localStorage` under
`chalkside_sync_url`. With none set the app keeps everything local and unsent
and never errors.

Payload carries a `sheet` field so the script can route to the right tab. Game
data goes to a tab named `Game Log`; practice data goes to `Pitching History`
in the same spreadsheet.

**Restore** is the read path: `GET ?action=list&sheet=Game+Log` returns the tab
as JSON. It merges on outing `id`, so restoring twice adds nothing the second
time, and it is purely additive: a local outing the sheet has never seen is
never touched. Players in the sheet who are not on the roster are added, with
the count and names shown before anything commits. **Eligibility is never read
from the sheet**, only recomputed from date and pitches, so a stale `eligible`
column cannot poison rest calculations.

Nothing on the sync path is logged or stored. Payloads carry a child's name and
number, so there are no `console` calls in the file at all and no payload
history in `localStorage`.

Deleting an outing POSTs `{action:"delete", id, sheet:"Game Log"}`. The id is
queued in `chalkside_pending_deletes_v1` **before** the request goes out and
only comes off on a confirmed success, so a delete made with no signal is
retried by Settings > Send unsent. The outing never comes back locally.

Deletes are queued for **every** outing, including ones marked unsent, since an
unsent outing may have landed with only the response lost. An id the sheet
never saw is a no-op: `findRowById` returns -1 and `deleteGame` returns ok.
Clear everything queues one for every outing it clears; that queue has its own
key so the wipe cannot take it with it.

## Offline

`sw.js` is a service worker registered from `pitch-count.html`, guarded so it
is a silent no op on `file://` and on anything that does not support it.

- The app HTML is **stale while revalidate**. The cached copy is served
  immediately, a fresh copy is fetched in the background, and it is used on
  the next open. A deploy lands by itself one app open later.
- Fonts are **cache first** and never refetched. Fira Sans does not change.
- Non-GET requests and anything on `script.google.com` are never intercepted,
  so the outing POST always hits the real network and a failure still reaches
  the app as a failure. The unsent queue depends on that.

The cache name is derived from a single `VERSION` constant at the top of
`sw.js`. **Bump that one number** when what gets cached or how it is served
changes; nothing else spells the cache name out. Ordinary app changes do not
need a bump, they arrive through the revalidate path.

Getting this wrong is expensive to diagnose: a stale worker serves the old
build after a successful push, which looks exactly like a failed deploy. On
GitHub Pages there is no build log to check, so the only symptom is the app
not changing.

Forgetting it is blocked rather than remembered. `tools/check-version.sh` exits
1 rather than warning, because a warning is a thing that gets scrolled past. Git hooks are local and a clone does not carry them, so
after a fresh clone install it:

    ln -sf ../../tools/check-version.sh .git/hooks/pre-push

It guards only what cannot self-heal: `manifest.json`, the four icons, and the
`SHELL` list inside `sw.js`. Those are served cache-first, so a phone that
already installed never refetches them while the cache name is the same.

**It deliberately ignores `pitch-count.html`.** That file is the one thing
stale-while-revalidate already handles, so guarding it would fire on every
ordinary app change, whoever hit it would bump to get unstuck, `VERSION` would
climb on every deploy, the cache would be rebuilt every time and the revalidate
path would stop buying anything. The paragraph above and the guard agree on
purpose; if you ever find them disagreeing again, the paragraph is right.

It compares `HEAD` against `origin/main`, so it only fires on what is actually
being pushed.

## Deploy

GitHub Pages, publishing `main` from the `/docs` folder of **chalkside-app**.

| | |
| --- | --- |
| Repo | https://github.com/kachdan/chalkside-app (public) |
| Live | https://chalkside.com |
| Publish | branch `main`, folder `/docs`, no build step |
| Front door | `/` is a blank page; the app is `/pitch-count.html` |

**Every push to `main` publishes.** There is no staging step and no build log,
so a push is a release to the live site, and the only symptom of a bad one is a
coach saying the app does not work.

Pages is free, so a deploy costs nothing. The Netlify budget that used to gate
this belonged to the archive repo and no longer applies.

**There is no fallback.** The old Netlify site still resolves, and it is not a
safety net: it has the archived Apps Script URL compiled in, so it cannot reach
the sheet at all. Never reason about it as a standby, never suggest pointing a
coach at it, and never let "the Netlify copy still works" enter a deploy
decision. If chalkside.com is down on a game day the answer is paper.

## Pushing (hard rule)

**Never push unless Dan says push or deploy.** Not after finishing a change,
not after a green test, not because the work is obviously done. The reason is
no longer the Netlify bill, it is that a push is a release: it goes straight to
the phone a coach uses during a game. It happens on his word and no other
trigger.

Committing is different and is wanted. Commit whenever a change is complete,
as many times as it takes. Then say what is committed and waiting, and leave
it sitting on the local branch until Dan asks for it.

`[skip ci]` on docs-only commits is a habit from the Netlify days. Harmless on
Pages, which rebuilds regardless, and worth keeping so the log says at a glance
which commits ship nothing.

## Definition of done

A ticket reaches Done when all of these are true.

- The acceptance criteria in its intent file are met.
- It has been verified against something real. Not a stub, not a fixture, not a
  mock the implementer also wrote. The live endpoint, the live site, the real
  sheet, or the phone.
- Someone other than the implementer has seen it work.
- If it touches the rest-day or eligibility math, the result was cross-checked
  against the rulebook or against the sheet's own column, independently.

"I deployed it" and "it works" are different claims. Only the second one counts.

### Why that rule is written down

Three bugs in one day shared a shape: verified against something the implementer
had built rather than something that existed.

- CHALK-102 was fixed in `availability()` and left broken in `renderLog()` and
  in `outingPayload()`. Verification went through one call site.
- The doGet used `getActiveSpreadsheet()`, which returns nothing in a standalone
  script. It was never run against the real script.
- `planRestore` read the field names the app POSTs rather than the headers the
  sheet returns. Against the real sheet it would have imported nothing while
  reporting "5 rows in the sheet, 0 to bring back" and looking healthy.

The last one is the reason for the rule. It would have shipped green.

Intent files live in https://github.com/kachdan/chalkside-intent (private), one
per ticket, written before the work starts.

### A check you have not seen fail is not a check

**Every new check is committed alongside proof that it fails on a known-bad
input.** Write the check, break the file on purpose, watch the check go red,
fix the file, watch it go green. Only then does it count. A check that has only
ever passed is an assertion about the world, not a test of it.

This is the standing rule because five verifications have now gone green while
looking at the wrong thing:

| what was checked | what it was actually looking at |
| --- | --- |
| the app on port 8000 | an `http.server` from an older session, serving the archive |
| the VERSION guard | the script directly, while the docs prescribe a symlink |
| a computed style | the previous frame, and later the previous screen's classes |
| `node --check` on the app | block 0, a 743 byte theme script, not the 89KB app |
| duplicate global names | only `^function name`, so `var x = function(){}` was invisible |

The last one let `var ask = function(){}` in the wake lock block overwrite
CHALK-130's `ask()` dialog at load. Every confirmation in the app silently
became a wake lock request that opened nothing.

`tools/check-names.sh` went through two wrong versions. The second tried to
track brace depth across 89KB, drifted, and **passed a file with the bug
deliberately put back**. It is only trustworthy now because it fails on that
file and passes the fixed one.

Three name collisions have shipped this way: `ordinal`, `batBall`, `ask`. Run
`tools/check-names.sh` and `tools/check-syntax.sh` before any commit that adds
a top level name.

### Two kinds of check, and neither substitutes for the other

**Static tools catch ordering and name faults. The browser catches resolution
and paint faults.**

`node --check` and `tools/check-names.sh` found a top level `el('sheet')` call
before `var el` was assigned, and `var ask = function(){}` overwriting a
function of the same name. Neither is visible on screen until something is
tapped.

The browser found the opposite kind every time: a class whose rule was scoped
under a parent, reused where that parent is absent, painting the UA button face.
`node --check` will never see that, because nothing is wrong with the code.

Run both. A green static suite says nothing about what the page looks like, and
a screenshot says nothing about whether a name is shadowed.

### A class styled only as a descendant gets its own base rule

Three times: `.who .swap` reused in the CHALK-110 state line, `.seg` reused for
the CHALK-109 share date pills. A class whose only rule lives under a parent
selector gets NO author background where that parent is absent, and the browser
paints `rgb(239,239,239)`. Against Light's `#F4F5F7` that is invisible; on a
dark sheet it is a white box.

So: **when a descendant-scoped class is reused anywhere else, give it an
unscoped base rule first.**

**But count the components before you unscope.** That rule assumes one
component per class name. `.seg` was used by TWO: the segmented-control pill and
the rest ribbon's four segments. Unscoping it gave the ribbon the pill's
`min-height:30px` and 12px side padding, so four 30px segments rendered inside a
16px `.bars` and collided with the tick labels. The bug moved rather than went
away, and it shipped.

    if one component uses the class   unscope it
    if more than one                  RENAME, do not unscope

The ribbon segment is `.band` now and `.seg` belongs to the pill alone.

### A third kind of check: rendered geometry

`tools/check-geometry.js` reports children rendering taller than the parent box
meant to contain them. 144 value assertions stayed green through the `.seg`
regression because a suite that asserts on values cannot see layout at all.
That makes three kinds, and all three are needed:

    static          ordering and name faults          check-names, node --check
    browser colour  resolution faults                 check-unstyled.js
    browser layout  geometry faults                   check-geometry.js

`tools/check-unstyled.js` catches it at runtime. It is deliberately not a static
check: I wrote that version first and it flagged `.fab`, `.inn`, `.prow` and
`.wide`, all four of which were correct code. Telling a real hit from those
needs the ancestor chain, which for JS-built markup means running the page.

### Name what you measured

Verified against something real includes knowing **which** real thing. Start
every browser verification run with:

    tools/serve.sh [port]

It refuses to start on a bound port and prints the URL, the directory, the pid
and the commit before anything is measured. This is not ceremony. An
`http.server` left over from an earlier session once kept port 8000 and a whole
verification run measured the archive repo instead of this one; the only reason
it surfaced was a function coming back undefined. A run that cannot say what it
measured did not verify anything.

### In an automated browser, believe the pixels before the computed styles

`getComputedStyle` lies under automation. A read in the same block as the DOM
work returns the previous frame; worse, with the tab backgrounded Chrome
throttles recalc and it returns the previous SCREEN's class state **across
separate tool calls**, while `className` on the same element already reads
correctly. Forcing a reflow is not enough. In CHALK-126 and CHALK-128 this
produced four false alarms against CSS that was correct.

What works is forcing a paint: take a screenshot, then read. For anything
visual, judge it from a zoomed screenshot at true size rather than a number.

Contrast ratio is a text-legibility metric. A 72px circle is not text, and a
colour pair with the same hue is not separated by it either: for adjacent hues
measure CIE76 deltaE, which is what caught the 1 day / 2 days rest bands when
the ratio passed them.

**The pattern behind all four.** The tooling answered a question next to the one
being asked: wrong port, wrong code path, previous frame, previous screen's
class state. Every time the test passed while looking somewhere else. A green
result from a tool that cannot name what it measured is not evidence.

### Always run the resume path

Two bugs have come from the same place: the app crossing midnight, and an iOS
PWA resumed from the app switcher without re-executing the script. CHALK-101
was one, the CHALK-108 sequence mislabel was the other. Neither is visible to
reasoning and neither appears on a cold load.

So it is a standing step, not something to remember: set `S.game.date` to
yesterday, resume, and check what carried. Note that `document.visibilityState`
is `hidden` while a tab is driven by automation, so the `visibilitychange`
handler early-returns; call `rolloverIfNewDay()` directly or the test proves
nothing.

## Handoff (standing rule)

Two files, one each way. Do not confuse them.

| File | Direction |
| --- | --- |
| `chalkside-handoff.md` | **Inbound.** Barry writes work orders here. **Never write to it.** A session that does silently clobbers the brief it was sent. |
| `chalkside-handoff-out.md` | **Outbound. Yours.** |

Both live in Barry's inbox directory, `<barry-agent>/inbox/`. Ask Dan for the
path if it is not already in the session; it is not written down here.

After any turn that changes code, hits a problem, or needs a decision from
Dan, write a handoff to `chalkside-handoff-out.md`.

Overwrite that one file every time, never append, never add dated copies.
Under 40 lines. Plain markdown, no terminal formatting, no box drawing.
Cover what changed and in which files, what was verified, anything that
failed or is uncertain, and the specific question if there is one.

Then say in one line that the handoff is written. Nothing more.

## Working style

Edit the actual file. Do not describe the change and wait.
Say what was changed and why in one or two lines, not a summary of every line.
Push back when something is a bad idea, especially on scope before a game day.
