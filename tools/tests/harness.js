/* Shared plumbing for the node suites.
 *
 * WHY THIS FILE EXISTS. The suites used to live in /tmp and read a generated
 * /tmp/rules.js. On 21 Sep the OS cleaned /tmp and six of the nine suites
 * vanished, silently: a run that finds no tests reports no failures. Anything
 * that verifies this app belongs in the repo, the same rule the icon generator
 * got in CHALK-144.
 *
 * Nothing here is generated. The rules region is sliced out of the app at run
 * time, so it cannot drift from what ships.
 */
var fs = require('fs');
var path = require('path');

var APP = path.join(__dirname, '..', '..', 'docs', 'pitch-count.html');

function appSource(){
  return fs.readFileSync(process.env.APP || APP, 'utf8');
}

/* The pure region: everything between todayStr and freshGame. It is pure by
   construction, which is why it can be eval'd with no DOM.

   Both ends are asserted. A rename that moves either boundary must fail loudly
   here rather than silently shrink what gets tested. */
function rulesRegion(src){
  var from = src.indexOf('function todayStr(');
  var to = src.indexOf('function freshGame(');
  if(from < 0) throw new Error('harness: function todayStr( not found, the rules region moved');
  if(to < 0) throw new Error('harness: function freshGame( not found, the rules region moved');
  if(to <= from) throw new Error('harness: freshGame comes before todayStr, the region is inside out');
  return src.slice(from, to);
}

/* Brace matched extraction of one named function. */
function grab(src, name){
  var i = src.indexOf('function ' + name + '(');
  if(i < 0) throw new Error('harness: missing function ' + name);
  var d = 0;
  for(var k = src.indexOf('{', i); k < src.length; k++){
    if(src[k] === '{') d++;
    else if(src[k] === '}'){ d--; if(!d) return src.slice(i, k + 1); }
  }
  throw new Error('harness: unbalanced braces in ' + name);
}

/* A localStorage that behaves like the real one for the keys this app uses. */
function fakeStorage(){
  var store = {};
  return {
    getItem: function(k){ return k in store ? store[k] : null; },
    setItem: function(k, v){ store[k] = String(v); },
    removeItem: function(k){ delete store[k]; }
  };
}

module.exports = { APP: APP, appSource: appSource, rulesRegion: rulesRegion,
                   grab: grab, fakeStorage: fakeStorage };
