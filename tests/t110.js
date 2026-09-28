/* CHALK-110, rebuilt under CHALK-148. THE INNING AS A REAL OBJECT.
 *
 * The catcher tally is DERIVED from the innings, not typed. Its only job is to
 * answer whether a boy can still pitch, so this is a rules suite, not a display
 * one, and it is the other half of what was lost from /tmp.
 *
 *   an inning is {p: pitcher, c: catcher}
 *   caught innings are counted from those, plus a manual correction
 *   4+ caught in a GAME blocks pitching in that game
 *   the tally belongs to ONE DAY and reads 0 on any other
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}

global.localStorage=H.fakeStorage();
var S={roster:[],outings:[],game:null};
eval(H.rulesRuntime(app));
eval(H.grab(app,'freshGame'));
eval(H.grab(app,'assignInning'));
eval(H.grab(app,'advanceInning'));
function save(){}

var TODAY='2026-09-28';
todayStr=function(){return TODAY;};
function game(){ S.game=freshGame(1); S.game.date=TODAY; S.game.pitcherId='p1'; return S.game; }
function reset(){
  S.roster=[{id:'p1',name:'A B',number:'7'},{id:'p2',name:'C D',number:'8'},
            {id:'p3',name:'E F',number:'9'}];
  S.outings=[]; game();
}

console.log('=== 1. an inning is an object, and the list is the record ===');
reset();
assignInning(1,'p1','p2');
is(inningAt(1),{p:'p1',c:'p2'},'inning 1 holds its pitcher and its catcher');
is(currentInning(),1,'and we are in it');
advanceInning();
is(currentInning(),2,'advancing moves on');
is(inningAt(1),{p:'p1',c:'p2'},'without disturbing what inning 1 recorded');

console.log('\n=== 2. advancing CARRIES the pair forward ===');
is(inningAt(2).p,'p1','the pitcher carries into the new inning');
is(inningAt(2).c,'p2','and so does the catcher, until someone changes it');

console.log('\n=== 3. the tally is DERIVED, never typed ===');
reset();
assignInning(1,'p1','p2'); advanceInning();
assignInning(2,'p1','p2'); advanceInning();
assignInning(3,'p1','p3');
is(derivedCaught('p2'),2,'p2 caught two innings');
is(derivedCaught('p3'),1,'p3 caught one');
is(caughtThisGame('p2'),2,'and the tally agrees');

console.log('\n=== 4. the manual correction ADJUSTS, it does not replace ===');
S.game.catchAdj={p2:1};
is(caughtThisGame('p2'),3,'two derived plus one corrected is three');
S.game.catchAdj={p2:-2};
is(caughtThisGame('p2'),0,'and it can go down');
S.game.catchAdj={p2:-5};
is(caughtThisGame('p2'),0,'but never below zero');
S.game.catchAdj={};

console.log('\n=== 5. THE RULE: 4+ caught blocks pitching in that game ===');
reset();
/* advance only BETWEEN innings: advancing carries the pair forward, so a
   trailing advance would open a fourth inning with p2 still behind the plate
   and the count would read 4. */
assignInning(1,'p1','p2'); advanceInning();
assignInning(2,'p1','p2'); advanceInning();
assignInning(3,'p1','p2');
is(caughtThisGame('p2'),3,'three innings caught');
is(pitchEligibility('p2').ok,true,'three does not block him');
advanceInning(); assignInning(4,'p1','p2');
is(caughtThisGame('p2'),4,'a fourth');
is(pitchEligibility('p2').ok,false,'and now he cannot pitch in this game');
is(/Caught/.test(pitchEligibility('p2').tag),true,'the row says why');

console.log('\n=== 6. and it is the GAME, not the day ===');
S.game.date=addDays(TODAY,-1);
is(gameIsToday(),false,'that game was yesterday');
is(caughtThisGame('p2'),0,'so the tally reads 0');
is(pitchEligibility('p2').ok,true,'and he is free to pitch today');

console.log('\n=== 7. a pitcher who reaches 75 may stay in, but not behind the plate ===');
reset();
S.outings.push({id:'o1',pitcherId:'p3',date:TODAY,pitches:75});
is(hitMaxToday('p3'),true,'he is at the cap');
is(catcherCost('p3')!==undefined,true,'and the catcher stepper has something to say about it');

console.log('\n=== 8. the legacy shape still reads ===');
reset();
S.game={date:TODAY,seq:1,pitcherId:'p1',count:0,marks:[],inning:3,catchers:{p2:2}};
is(caughtThisGame('p2'),2,'a game saved before CHALK-110 still answers');

console.log('\n=== 9. inningLabel is NOT the rest-day ordinal ===');
is(inningLabel(1),'1st','1st');
is(inningLabel(3),'3rd','3rd');
is(inningLabel(4),'4th','a second ordinal() once capped this at 3rd');
is(inningLabel(11),'11th','11th');
is(inningLabel(21),'21st','21st');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
