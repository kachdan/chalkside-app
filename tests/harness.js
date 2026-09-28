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

var APP = path.join(__dirname, '..', 'docs', 'pitch-count.html');

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

/* A top level `var NAME={...};` block, for the ones that are data rather than
   functions. grab() only finds functions, and CHALK-157 put the icon set in a
   var, so a suite that eval'd statusIcon alone started throwing on `icon`. */
function varBlock(src, name){
  var start = src.indexOf('var ' + name + '=');
  if(start < 0) throw new Error('harness: missing var ' + name);
  var d = 0;
  for(var k = src.indexOf('{', start); k < src.length; k++){
    if(src[k] === '{') d++;
    else if(src[k] === '}'){ d--; if(!d) return src.slice(start, k + 2); }
  }
  throw new Error('harness: unbalanced braces in var ' + name);
}

/* Everything an icon call needs: the pinned set, the customs and the emitter. */
function iconRuntime(src){
  return varBlock(src, 'LUCIDE') + '\n' + varBlock(src, 'CUSTOM_ICONS') + '\n' +
         grab(src, 'icon');
}

/* CHALK-148. The whole rules engine, ready to call, with the constants it
   needs. The constants live OUTSIDE the region the slice takes, so a suite that
   eval'd the region alone got a ReferenceError on MAX, which is how these were
   awkward enough to keep in /tmp in the first place.

   Nothing is redefined here. MAX, BRACKETS and DAY_SCOPED_MOUND are read out of
   the app, so a suite cannot quietly test different numbers from the ones that
   ship. That was the whole CHALK-102 failure: a second copy of a rule. */
/* A whole `var NAME=...;` LINE. Matching up to the first semicolon looks
   right and is wrong: SEP is '[,;:.-]' and the semicolon inside the character
   class cut the declaration in half, which then failed to parse. Take the
   line. */
function constLine(src, name){
  var m = new RegExp('^var ' + name + '=.*$', 'm').exec(src);
  if(!m) throw new Error('harness: missing var ' + name + ', it moved or was renamed');
  return m[0];
}

function rulesRuntime(src){
  var out=[];
  ['MAX','DAY_SCOPED_MOUND','BRACKETS'].forEach(function(n){
    out.push(constLine(src, n));
  });
  out.push(rulesRegion(src));
  return out.join('\n');
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
                   grab: grab, varBlock: varBlock, iconRuntime: iconRuntime,
                   rulesRuntime: rulesRuntime, constLine: constLine,
                   fakeStorage: fakeStorage };
