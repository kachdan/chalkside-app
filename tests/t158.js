/* CHALK-158. The worker has to reach a phone.
 *
 * Six releases went out behind a worker that never changed and a refresh that
 * ran after the response. Nothing here tests the browser; run.sh cannot drive
 * one. What it tests is that the STRATEGY in the file is still the one that was
 * measured on a real worker: network first for the app, no freshness work
 * deferred past the response, and a cache name that changes with the app.
 */
var fs=require('fs'), path=require('path');
var crypto=require('crypto');
var ROOT=path.join(__dirname,'..');
var sw=fs.readFileSync(path.join(ROOT,'docs/sw.js'),'utf8');
var appPath=path.join(ROOT,'docs/pitch-count.html');

var pass=0,fail=0;
function is(g,w,l){
  var ok=JSON.stringify(g)===JSON.stringify(w);
  if(ok){pass++;console.log('  PASS  '+l);}
  else{fail++;console.log('  FAIL  '+l+'\n          got  '+JSON.stringify(g)+'\n          want '+JSON.stringify(w));}
}

console.log('=== 1. the stamp is the app, not a number someone remembers ===');
var stamp=(sw.match(/^var BUILD = '([^']*)';/m)||[])[1];
var want=crypto.createHash('sha256').update(fs.readFileSync(appPath)).digest('hex').slice(0,12);
is(!!stamp,true,'sw.js carries a BUILD stamp');
is(stamp,want,'and it is the hash of the app being shipped');
is(/^var CACHE = 'chalkside-' \+ BUILD;/m.test(sw),true,'the cache name is derived from it');
is(/var VERSION\s*=\s*\d+/.test(sw),false,'the hand-bumped VERSION is gone, so it cannot be forgotten again');

console.log('\n=== 2. the app is network first, not stale while revalidate ===');
var navBranch=sw.slice(sw.indexOf("req.mode === 'navigate'"));
navBranch=navBranch.slice(0,navBranch.indexOf('e.respondWith')+400);
is(/e\.respondWith\(appResponse\(req\)\)/.test(navBranch),true,'a navigation is answered by appResponse');
is(/e\.waitUntil\(/.test(navBranch),false,'and nothing is deferred past the response');
/* the whole bug in one assertion: freshness must not depend on waitUntil */
is(/waitUntil\(revalidateApp\(\)\)/.test(sw),false,'the old background revalidate is gone');
is(/function appResponse/.test(sw),true,'appResponse exists');
is(/Promise\.race\(\[net, timeout\]\)/.test(sw),true,'it races the network against a timeout');

console.log('\n=== 3. offline still opens the app ===');
var ar=sw.slice(sw.indexOf('function appResponse'));
ar=ar.slice(0,ar.indexOf('\n}'));
is(/caches\.match\(APP\)/.test(ar),true,'the race falling through reaches the cache');
is(/NET_TIMEOUT/.test(sw),true,'the timeout is a named constant');
var t=(sw.match(/var NET_TIMEOUT = (\d+)/)||[])[1];
is(+t>0 && +t<=3000,true,'and it is short enough to not strand a coach at a field  ['+t+'ms]');

console.log('\n=== 4. the new worker is taken, and never reloads mid count ===');
is(/self\.skipWaiting\(\)/.test(sw),true,'a new worker does not sit waiting');
is(/self\.clients\.claim\(\)/.test(sw),true,'and takes over open pages');
var app=fs.readFileSync(appPath,'utf8');
is(/controllerchange/.test(app),false,'the app never reloads itself on a worker change');
is(/location\.reload/.test(app),false,'and never reloads itself at all');

console.log('\n=== 5. the sync path is still never cached ===');
is(/function isSync/.test(sw),true,'isSync survives');
is(/if\(isSync\(req\.url\)\) return;/.test(sw),true,'and the Apps Script call goes straight to the network');
is(/if\(req\.method !== 'GET'\) return;/.test(sw),true,'as does every non GET, so an unsent outing stays unsent');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
