/* Bump this one number when what gets cached, or how it is served, changes.
   Nothing else in this file spells the cache name out, and nothing outside it
   should either.

   It matters more than it looks. A stale worker serves the old build after a
   successful push, which is indistinguishable from a deploy that failed. On
   Pages there is no build log to check, so the only symptom is a coach saying
   the app did not change. */
var VERSION = 6;
var CACHE = 'chalkside-v' + VERSION;

/* ChalkSide service worker.

   The app opens at a field with no signal.

   Two strategies, on purpose:

   - The app HTML is stale while revalidate. A coach gets the cached copy
     instantly, even with no bars, and a fresh copy is pulled in the
     background and used on the next open. A deploy therefore lands by
     itself, one app open later, with nothing to remember.
   - Fonts are cache first and never refetched. Fira Sans does not change,
     and the file URLs carry their own version.

   VERSION at the top only needs bumping if the caching strategy itself
   changes, meaning what gets cached or how it is served. Ordinary app
   changes do not need it, they arrive through the revalidate path. */

/* The app itself. Only the real file is cached. '/' is deliberately NOT in
   here: what the root returns is the server's business (netlify.toml rewrites
   it to the app, a local python server returns a directory listing), so the
   fetch handler resolves navigations to APP instead of trusting it. */
var APP = './pitch-count.html';

/* The app plus everything it needs to render and install as an app. Adding
   or removing anything here is a caching change, so bump VERSION with it. */
var SHELL = [
  APP,
  './manifest.json',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  /* CHALK-144. Android reads these for the adaptive icon. */
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,400;0,500;0,600;0,700;1,200&display=swap';

/* CHALK-139. Is this URL the app itself? Compared on the resolved PATHNAME, so
   a query string or a hash still counts as the app, and nothing else does.
   Resolved against the worker's own scope rather than hardcoded, so it keeps
   working if the app is ever served from a subdirectory. */
function isAppUrl(url){
  try{
    return new URL(url).pathname === new URL(APP, self.registration.scope).pathname;
  }catch(e){
    return false;
  }
}

/* The Apps Script sync must always hit the real network. */
function isSync(url){
  return url.indexOf('script.google.com') > -1 ||
         url.indexOf('script.googleusercontent.com') > -1;
}

/* Google serves a different stylesheet per browser and the font file URLs
   live inside it, so the CSS has to be read before the fonts can be cached. */
function cacheFonts(cache){
  return fetch(FONT_CSS, {mode:'cors'}).then(function(res){
    if(!res.ok) throw new Error('font css ' + res.status);
    var copy = res.clone();
    return cache.put(FONT_CSS, res).then(function(){ return copy.text(); });
  }).then(function(css){
    var urls = [], m, re = /url\(([^)]+)\)/g;
    while((m = re.exec(css))){
      var u = m[1].replace(/['"]/g, '');
      if(u.indexOf('http') === 0) urls.push(u);
    }
    return Promise.all(urls.map(function(u){
      /* one dead font file must not take the whole install down */
      return fetch(u, {mode:'cors'}).then(function(r){
        if(r.ok) return cache.put(u, r);
      }).catch(function(){});
    }));
  });
}

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      /* the app must cache or there is no point installing at all */
      return cache.addAll(SHELL).then(function(){
        /* fonts are a nice to have, Fira Sans falling back to a system face
           is survivable, a failed install is not */
        return cacheFonts(cache).catch(function(){});
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Background refresh of the app. 'reload' skips the browser HTTP cache so
   this is a real network read, not a replay of what the phone already had.
   Failure is the normal offline case and is ignored on purpose. */
function revalidateApp(){
  return fetch(APP, {cache:'reload'}).then(function(res){
    if(!res || !res.ok) return;
    return caches.open(CACHE).then(function(cache){
      return cache.put(APP, res);
    });
  }).catch(function(){});
}

self.addEventListener('fetch', function(e){
  var req = e.request;

  /* Anything that is not a plain GET goes straight to the network, untouched.
     That is what keeps the outing POST and its unsent queue working: a failed
     POST must reach the app as a failure so the record stays marked unsent. */
  if(req.method !== 'GET') return;
  if(isSync(req.url)) return;

  /* CHALK-139. ONLY a navigation to the app's own URL is answered from the
     cache. This used to answer EVERY navigation with the app shell, so
     robots.txt returned the app, a mistyped path returned the app with a 200,
     and a second HTML file on the same origin was unreachable. It served a
     stale build to two measurements during CHALK-133 and cost an afternoon.

     Anything else falls through to the network and fails honestly. A 404 that
     says 404 is worth more than a 200 that lies.

     Stale while revalidate for the app itself is unchanged: serve what we have
     immediately, then refresh the cached copy in the background so the next
     open is current. waitUntil is called synchronously here to keep the event
     alive for that refresh.

     Note this drops '/' from the fallback. The root serves index.html, which is
     a real page, and a registered worker used to replace it with the app while
     a first visit got the placeholder. That inconsistency was the same bug. */
  if(req.mode === 'navigate'){
    if(!isAppUrl(req.url)) return;          /* the network's business, not ours */
    e.waitUntil(revalidateApp());
    e.respondWith(
      caches.match(APP).then(function(app){
        return app || fetch(req);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req);
    })
  );
});
