/* CHALK-142. Restore duplicating every player who has an outing.
   Reproduces the reported shape exactly: 11 Roster rows, 4 of those players
   with outings in the Game Log, and one jersey held as "01" text in Roster
   against 1 as a number in the Game Log. Names here are invented; the real
   ones do not belong in a repo. */
var H=require('./harness.js');
var app=H.appSource();
function grab(n){var i=app.indexOf('function '+n+'(');if(i<0)throw new Error('missing '+n);
  var d=0;for(var k=app.indexOf('{',i);k<app.length;k++){if(app[k]==='{')d++;
    else if(app[k]==='}'){d--;if(!d)return app.slice(i,k+1);}}}

var S={roster:[],outings:[]};
var saved=false, teamNameVal='', rosterSavedMark=false;
function save(){saved=true;}
function renderAll(){}
function sortRoster(){S.roster.sort(function(a,b){return a.name<b.name?-1:1;});}
function teamName(){return teamNameVal;}
function setTeamName(t){teamNameVal=t;}
function markRosterSaved(){rosterSavedMark=true;}
eval(grab('normName')); eval(grab('joinName')); eval(grab('sheetField'));
eval(grab('planRosterRestore')); eval(grab('commitRosterRestore'));
eval(grab('planRestore')); eval(grab('commitRestore'));

/* ---- Dan's sheet ---- */
var ROSTER=[
  ['Abe','Marlow','01'],['Cyrus','Denby','3'],['Dorian','Elvey','7'],
  ['Fenn','Garrick','12'],['Hale','Iverly','2'],['Jory','Kandle','4'],
  ['Linus','Mabry','5'],['Nero','Oakes','8'],['Pike','Quilley','9'],
  ['Rune','Sable','10'],['Thorne','Udall','11']
].map(function(r){return {Team:'Testers',First:r[0],Last:r[1],Jersey:r[2]};});

/* Game Log writes Number as a real NUMBER, which is the second bug */
var GAMELOG=[
  {Id:'g1',Date:'2026-09-12',Name:'Abe Marlow',      Number:1,  Pitches:40,Opponent:'North Rangers'},
  {Id:'g2',Date:'2026-09-14',Name:'Cyrus Denby',   Number:3,  Pitches:22,Opponent:'Westbrook'},
  {Id:'g3',Date:'2026-09-14',Name:'Dorian Elvey',  Number:7,  Pitches:31,Opponent:'Westbrook'},
  {Id:'g4',Date:'2026-09-16',Name:'Fenn Garrick',    Number:12, Pitches:55,Opponent:'Southgate'},
  {Id:'g5',Date:'2026-09-16',Name:'Abe Marlow',      Number:1,  Pitches:18,Opponent:'Southgate'}
];

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}
function reset(){S.roster=[];S.outings=[];teamNameVal='';}
function restore(){
  var rp=planRosterRestore(ROSTER);
  var plan=planRestore(GAMELOG,rp);          /* the fixed call shape */
  commitRosterRestore(rp);
  commitRestore(plan);
  return {rp:rp,plan:plan};
}
function names(){return S.roster.map(function(p){return p.name;});}
function dupes(){
  var seen={},d=[];
  S.roster.forEach(function(p){var k=normName(p.name);if(seen[k])d.push(p.name);seen[k]=true;});
  return d;
}

console.log('=== 1. the reported sequence: clear, paste, restore ===');
reset();
var r1=restore();
is(S.roster.length,11,'11 players from an 11 player sheet, not 15');
is(dupes(),[],'no duplicate names');
is(r1.plan.newPlayerCount,0,'the outing plan adds nobody the roster already brings');
is(S.outings.length,5,'all five outing rows landed');

console.log('\n=== 2. the preview must not lie either ===');
reset();
var rp2=planRosterRestore(ROSTER);
var plan2=planRestore(GAMELOG,rp2);
is(rp2.add.length,11,'players to add, from the Roster tab');
is(plan2.newPlayerCount,0,'extra players from outings');
is(rp2.add.length+plan2.newPlayerCount,11,'the number the sheet offers to add');

console.log('\n=== 3. restore again changes nothing ===');
reset(); restore();
var before=S.roster.length, beforeOut=S.outings.length;
restore();
is(S.roster.length,before,'roster count unchanged on a second restore');
is(S.outings.length,beforeOut,'outing count unchanged too');
is(dupes(),[],'still no duplicates');

console.log('\n=== 4. CHALK-121 still holds: a player only in the Game Log ===');
reset();
var ghost=GAMELOG.concat([{Id:'g9',Date:'2026-09-10',Name:'Vance Wren',Number:21,Pitches:12,Opponent:'Eastvale'}]);
var rp4=planRosterRestore(ROSTER);
var plan4=planRestore(ghost,rp4);
is(plan4.newPlayerCount,1,'the Game Log only player is still created');
commitRosterRestore(rp4); commitRestore(plan4);
is(S.roster.length,12,'12 players: 11 from Roster plus the one only in outings');
is(S.outings.filter(function(o){return o.id==='g9';})[0].pitcherId!==undefined,true,'his outing has a pitcherId');

console.log('\n=== 5. a player in both is created ONCE and carries his outings ===');
reset(); restore();
var zeroJersey=S.roster.filter(function(p){return normName(p.name)==='abe marlow';});
is(zeroJersey.length,1,'one Abe Marlow');
is(S.outings.filter(function(o){return o.pitcherId===zeroJersey[0].id;}).length,2,'both of his outings attach to that one id');

console.log('\n=== 6. jersey 01 survives ===');
reset(); restore();
is(S.roster.filter(function(p){return normName(p.name)==='abe marlow';})[0].number,'01','the 01 jersey survives as 01');
is(S.roster.filter(function(p){return normName(p.name)==='cyrus denby';})[0].number,'3','the next boy is 3');

console.log('\n=== 7. the commit is defended on its own ===');
/* a plan made when the roster was empty, committed after he was added by hand */
reset();
var rpX=planRosterRestore(ROSTER);
var planX=planRestore(GAMELOG,null);      /* deliberately blind, the old shape */
is(planX.newPlayerCount,4,'a blind plan does plan to add the four');
commitRosterRestore(rpX);
commitRestore(planX);                     /* commit must still refuse them */
is(S.roster.length,11,'commitRestore refuses players who already exist');
is(dupes(),[],'no duplicates even from a stale plan');

console.log('\n=== 8. name matching is case and space insensitive ===');
reset();
var messy=[{Id:'m1',Date:'2026-09-12',Name:'  abe   MARLOW ',Number:1,Pitches:10,Opponent:'x'}];
var rp8=planRosterRestore(ROSTER);
var plan8=planRestore(messy,rp8);
is(plan8.newPlayerCount,0,'"  abe   MARLOW " is the same player as "Abe Marlow"');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
