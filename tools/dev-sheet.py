#!/usr/bin/env python3
"""Serves docs/ AND a stand-in for the Apps Script web app, from ONE origin so
there is no CORS in the way.

WHY THIS IS IN THE REPO. It has been rebuilt three times, twice because /tmp
and once because the scratchpad was cleaned, and each time a verification run
stopped part way while I worked out whether the app was broken or the server
was gone. Anything used to verify this app lives with the app, the same rule
the icon generator got in CHALK-144 and the suites got in CHALK-139.

IT IS NOT DAN'S SHEET and must never point at it. It holds invented names and
an in-memory Roster tab, and it mirrors the CHALK-146 empty-roster guard so the
refusal path can be exercised rather than assumed.

    python3 tools/dev-sheet.py              then open 127.0.0.1:8001
    /exec?action=list&sheet=Roster          the roster, as doGet returns it
    /exec?action=list&sheet=Game+Log        the game log
    POST /exec {action:'roster',...}        the write path, with the guard
    /exec?action=__state                    what the fake sheet now holds
    /exec?action=__reset                    put it back
"""
import json, urllib.parse, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(os.path.dirname(HERE), 'docs')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8001

ROSTER_HEAD = ['Jersey', 'First', 'Last', 'Team']
FULL = [
    ['01', 'Abe', 'Marlow', 'Testers'], ['3', 'Cyrus', 'Denby', ''],
    ['7', 'Dorian', 'Elvey', ''], ['12', 'Fenn', 'Garrick', ''],
    ['2', 'Hale', 'Iverly', ''], ['4', 'Jory', 'Kandle', ''],
    ['5', 'Linus', 'Mabry', ''], ['8', 'Nero', 'Oakes', ''],
    ['9', 'Pike', 'Quilley', ''], ['10', 'Rune', 'Sable', ''],
    ['11', 'Thorne', 'Udall', ''],
]
GL_HEAD = ['Date', 'Number', 'Name', 'Pitches', 'Opponent',
           'Clear to pitch', 'Logged at', 'Id']
STATE = {'roster': [r[:] for r in FULL], 'gamelog': [], 'writes': [], 'refusals': []}


def rows(head, data):
    return [dict(zip(head, r)) for r in data]


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DOCS, **kw)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path.rstrip('/') == '/exec':
            q = urllib.parse.parse_qs(u.query)
            act = (q.get('action') or [''])[0]
            if act == '__state':
                return self.json(STATE)
            if act == '__reset':
                STATE['roster'] = [r[:] for r in FULL]
                STATE['gamelog'] = []
                STATE['writes'] = []
                STATE['refusals'] = []
                return self.json({'ok': True})
            if act != 'list':
                return self.text('Pitching logger is running.')
            tab = (q.get('sheet') or ['Game Log'])[0]
            if tab == 'Roster':
                return self.json({'ok': True, 'rows': rows(ROSTER_HEAD, STATE['roster'])})
            if tab == 'Game Log':
                return self.json({'ok': True, 'rows': rows(GL_HEAD, STATE['gamelog'])})
            return self.json({'ok': False, 'error': 'no tab named ' + tab})
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        n = int(self.headers.get('Content-Length') or 0)
        try:
            body = json.loads(self.rfile.read(n) or b'{}')
        except Exception:
            body = {}
        if u.path.rstrip('/') == '/exec' and body.get('action') == 'roster':
            players = body.get('players')
            if not isinstance(players, list):
                return self.json({'ok': False, 'error': 'no players array'})
            # the CHALK-146 script side guard, BEFORE anything is cleared
            if len(players) == 0:
                STATE['refusals'].append(body)
                return self.json({'ok': False, 'error': 'empty roster refused', 'count': 0})
            STATE['writes'].append([(p.get('first', '') + ' ' + p.get('last', '')).strip()
                                    for p in players])
            STATE['roster'] = [[str(p.get('jersey', '')), str(p.get('first', '')),
                                str(p.get('last', '')),
                                str(body.get('team', '')) if i == 0 else '']
                               for i, p in enumerate(players)]
            return self.json({'ok': True, 'count': len(players)})
        return self.json({'ok': True})

    def json(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def text(self, t):
        b = t.encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    print('dev sheet on http://127.0.0.1:%d serving %s' % (PORT, DOCS))
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
