/* CHALK-146. A shrinking roster write is confirmed; a growing one is not.
 *
 * The failure this guards: the write REPLACES the Roster tab, the read MERGES,
 * so whichever device synced last won and a device holding fewer players wiped
 * the sheet. Reproduces the 18 Sep shape: a device that never had seven of the
 * players. Names invented; the real ones do not belong in a repo.
 */
var H=require('./harness.js');
var app=H.appSource();

var store={};
global.localStorage={
  getItem:function(k){return k in store?store[k]:null;},
  setItem:function(k,v){store[k]=String(v);},
  removeItem:function(k){delete store[k];}
};
var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}

/* The guards themselves, asserted before anything is exercised. Against the
   shipped file these fail cleanly and say which guard is absent, instead of
   crashing on a missing symbol. */
console.log('=== 0. the three guards exist in pushRoster ===');
var push=(function(){ try{ return H.grab(app,'pushRoster'); }catch(e){ return ''; } })();
is(/S\.roster\.length/.test(push)&&/return/.test(push),true,
   'an empty local roster returns before writing');
is(/fetchSheetRows\('Roster'\)/.test(push),true,
   'the sheet is READ before it is replaced');
is(/ask\(/.test(push),true,
   'a shrink goes through a tray rather than straight out');
is((function(){ try{ return typeof H.grab(app,'rosterShrink')==='string'; }
    catch(e){ return false; } })(),true,'rosterShrink exists');
if(fail){
  console.log('\n  The guards are not in this build, so nothing below can be exercised.');
  console.log('\nFAILED '+fail+' of '+(pass+fail));
  process.exit(1);
}

eval(H.grab(app,'normName'));
eval(H.grab(app,'joinName'));
eval(H.grab(app,'sheetField'));
var ROSTER_REMOVED_KEY='chalkside_removed_here_v1';
eval(H.grab(app,'removedHere'));
eval(H.grab(app,'noteRemovedHere'));
eval(H.grab(app,'clearRemovedHere'));
var S={roster:[],outings:[]};
try{ eval(H.grab(app,'rosterShrink')); }catch(e){ console.log('  (rosterShrink absent, the rest cannot run)'); console.log('\nFAILED '+(fail+1)+' of '+(pass+fail+1)); process.exit(1); }
eval(H.grab(app,'nameList'));

var SHEET=['Abe Marlow','Cyrus Denby','Dorian Elvey','Fenn Garrick','Hale Iverly',
           'Jory Kandle','Linus Mabry','Nero Oakes','Pike Quilley','Rune Sable',
           'Thorne Udall'].map(function(n){
  var p=n.split(' ');
  return {Team:'Testers',First:p[0],Last:p[1],Jersey:'01'};
});

function setLocal(names){
  S.roster=names.map(function(n,i){return {id:'p'+i,name:n,number:'7'};});
}
function reset(){ store={}; }

console.log('=== 1. the whole roster: nothing missing, so nothing to ask ===');
reset(); setLocal(SHEET.map(function(r){return r.First+' '+r.Last;}));
is(rosterShrink(SHEET).accidental,[],'no accidental losses');
is(rosterShrink(SHEET).deliberate,[],'no deliberate ones either');

console.log('\n=== 2. a player ADDED here: growing, still nothing to ask ===');
reset(); setLocal(SHEET.map(function(r){return r.First+' '+r.Last;}).concat(['Vance Wren']));
is(rosterShrink(SHEET).accidental,[],'growing never asks');

console.log('\n=== 3. THE 18 SEP CASE: a device that never had seven of them ===');
reset(); setLocal(['Abe Marlow','Cyrus Denby','Dorian Elvey','Fenn Garrick']);
var d3=rosterShrink(SHEET);
is(d3.accidental.length,7,'all seven are accidental');
is(d3.deliberate,[],'none of them deliberate');
is(d3.accidental.indexOf('Hale Iverly')>-1,true,'and they are NAMED, not counted');

console.log('\n=== 4. removed here on purpose: no second confirmation ===');
reset(); setLocal(SHEET.map(function(r){return r.First+' '+r.Last;}));
noteRemovedHere('Thorne Udall');
S.roster=S.roster.filter(function(p){return p.name!=='Thorne Udall';});
var d4=rosterShrink(SHEET);
is(d4.accidental,[],'nothing accidental, so no tray');
is(d4.deliberate,['Thorne Udall'],'it is on the deliberate list');

console.log('\n=== 5. one of each: only the accidental one raises the tray ===');
reset(); setLocal(['Abe Marlow','Cyrus Denby','Dorian Elvey','Fenn Garrick','Hale Iverly',
                   'Jory Kandle','Linus Mabry','Nero Oakes','Pike Quilley']);
noteRemovedHere('Thorne Udall');
var d5=rosterShrink(SHEET);
is(d5.deliberate,['Thorne Udall'],'the one he removed is excused');
is(d5.accidental,['Rune Sable'],'the one he did not is named');

console.log('\n=== 6. eleven players, the WRONG eleven: count says fine, names do not ===');
reset(); setLocal(['Abe Marlow','Cyrus Denby','Dorian Elvey','Fenn Garrick','Hale Iverly',
                   'Jory Kandle','Linus Mabry','Nero Oakes','Pike Quilley','Rune Sable',
                   'Vance Wren']);
is(S.roster.length,SHEET.length,'the counts match exactly');
is(rosterShrink(SHEET).accidental,['Thorne Udall'],'and a name is still missing');

console.log('\n=== 7. the ledger clears only when the sheet agrees ===');
reset(); noteRemovedHere('Thorne Udall'); noteRemovedHere('Rune Sable');
is(removedHere().length,2,'two pending');
clearRemovedHere();
is(removedHere(),[],'cleared');

console.log('\n=== 8. case and spacing do not create a false loss ===');
reset(); setLocal(['  abe   MARLOW ','Cyrus Denby','Dorian Elvey','Fenn Garrick','Hale Iverly',
                   'Jory Kandle','Linus Mabry','Nero Oakes','Pike Quilley','Rune Sable','Thorne Udall']);
is(rosterShrink(SHEET).accidental,[],'"  abe   MARLOW " is the same player');

console.log('\n=== 9. the tray NAMES them ===');
is(nameList(['Abe Marlow']),'Abe Marlow','one');
is(nameList(['Abe Marlow','Cyrus Denby']),'Abe Marlow and Cyrus Denby','two');
is(nameList(['Abe Marlow','Cyrus Denby','Dorian Elvey']),
   'Abe Marlow, Cyrus Denby and Dorian Elvey','three, all named');
is(nameList(['A B','C D','E F','G H','I J','K L','M N']),
   'A B, C D and 5 more','seven becomes two names and a count');

console.log('\n=== 10. an empty sheet is not a shrink ===');
reset(); setLocal(['Abe Marlow']);
is(rosterShrink([]).accidental,[],'nothing in the sheet, nothing to lose');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
