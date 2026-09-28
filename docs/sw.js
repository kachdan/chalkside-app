/* CHALK-158. BUILD IS STAMPED BY A TOOL. DO NOT EDIT IT BY HAND.
   
       tools/stamp-sw.sh        writes it
       tools/check-version.sh   refuses a release where it is wrong

   It is the first 12 hex of the sha256 of docs/pitch-count.html, so it changes
   on its own whenever the app changes and cannot be forgotten.

   WHY IT STOPPED BEING A NUMBER YOU BUMP. The old rule said a number only
   needed bumping when the caching strategy changed, because ordinary app
   changes were supposed to arrive through the background revalidate. Six
   releases shipped that way, 148, 151, 152, 153, 156 and 157, and not one of
   them reached a phone. The revalidate ran after the response had already been
   sent, and a worker that gets killed the moment the page loads never finishes
   it. Chrome did finish it, on the second open, which is exactly why this
   survived every test that was not run on the phone.

   A version that has to be remembered gets forgotten. This one is computed. */
var BUILD = '64a6b1aef0bc';
var CACHE = 'chalkside-' + BUILD;

/* ChalkSide service worker.

   The app opens at a field with no signal.

   Two strategies, on purpose:

   - The app HTML is NETWORK FIRST with a short timeout, falling back to the
     cache. Online, a coach always gets the build that is actually deployed,
     on the first open, with nothing running in the background that a phone
     can cut off. With no bars the fetch times out fast and the cached copy
     opens, which is the case the whole app exists for.
   - Fonts are cache first and never refetched. Fira Sans does not change,
     and the file URLs carry their own version.

   The timeout is what keeps network first honest at a field. A plain network
   first would make the app hang on a dead connection before falling back, and
   the app opening instantly with no signal is the requirement that outranks
   freshness. */

/* The app itself. Only the real file is cached. '/' is deliberately NOT in
   here: what the root returns is the server's business (netlify.toml rewrites
   it to the app, a local python server returns a directory listing), so the
   fetch handler resolves navigations to APP instead of trusting it. */
var APP = './pitch-count.html';

/* The app plus everything it needs to render and install as an app. The cache
   name carries the app's own hash, so a new build gets a new cache and these
   are all refetched with it. */
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

/* CHALK-158, the update handover, decided rather than inherited.

   skipWaiting means a new worker never sits in 'waiting'. clients.claim means
   it takes over pages that are already open. Together they are the "next open"
   half of the ticket: the worker changes hands immediately and quietly, and
   because the app is network first the next open renders the new build.

   THERE IS DELIBERATELY NO RELOAD. Claiming a client does not reload it, and
   nothing in the app listens for controllerchange, so a coach holding the phone
   mid count keeps the page he is counting on. An "Update ready" banner was the
   other option in the ticket and is not built: it can only ever fire while he
   is looking at the app, which is the one moment a reload must not happen, and
   network first already makes the next open correct without asking him. */
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

/* CHALK-158. How long the app waits for the network before opening from the
   cache. Short on purpose: a coach standing at a field with one bar must not
   watch a spinner, and a phone that is really offline usually fails faster
   than this anyway. The cache still gets the fresh copy when the slow fetch
   finally lands, so the open after a slow one is current. */
var NET_TIMEOUT = 2500;

/* A real network read of the app. 'reload' skips the browser HTTP cache so
   this cannot be answered by the very thing we are trying to get past. The
   cache is written on every success, which is what makes the offline copy the
   last build actually seen rather than the build that was current at install. */
function fetchApp(){
  return fetch(APP, {cache:'reload'}).then(function(res){
    if(!res || !res.ok) throw new Error('app ' + (res && res.status));
    caches.open(CACHE).then(function(cache){
      return cache.put(APP, res.clone());
    }).catch(function(){});
    return res;
  });
}

/* Network first, cache as the fallback, with the timeout above.
   The network promise is deliberately still alive after the race is lost: if
   it lands late it has already written the cache, so nothing is wasted. Its
   rejection is swallowed separately so a lost race cannot surface as an
   unhandled rejection in the worker. */
function appResponse(req){
  var net = fetchApp();
  net.catch(function(){});
  var timeout = new Promise(function(resolve, reject){
    setTimeout(function(){ reject(new Error('slow')); }, NET_TIMEOUT);
  });
  return Promise.race([net, timeout]).catch(function(){
    return caches.match(APP).then(function(hit){
      /* no cache and no network in time: the only thing left is to keep
         waiting on the network, because there is nothing else to show */
      return hit || net.catch(function(){ return fetch(req); });
    });
  });
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

     CHALK-158. The app is now network first with a timeout, not stale while
     revalidate. The old way put the refresh in waitUntil, AFTER the response
     had gone out, and a phone that kills the worker at that moment never
     finishes it. Six releases reached nobody that way. Nothing the freshness
     of the app depends on may run after the response again.

     Note this drops '/' from the fallback. The root serves index.html, which is
     a real page, and a registered worker used to replace it with the app while
     a first visit got the placeholder. That inconsistency was the same bug. */
  if(req.mode === 'navigate'){
    if(!isAppUrl(req.url)) return;          /* the network's business, not ours */
    e.respondWith(appResponse(req));
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req);
    })
  );
});
