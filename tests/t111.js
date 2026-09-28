/* CHALK-111, rebuilt under CHALK-148. BATTING, and the half-inning flip.
 *
 * The screen is recoverable from observation: you tap what you can see rather
 * than reconstructing what you missed. These are the rules behind that.
 *
 *   ball caps 4, strike 3, out 3
 *   four balls clears the count; three strikes clears it AND adds an out
 *   three outs ends the half
 *   a foul adds a strike BELOW two and does nothing at two
 *   New batter clears ball and strike, never the out
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
eval(H.grab(app,'bat'));
eval(H.grab(app,'rememberBat'));
eval(H.grab(app,'addBall'));
eval(H.grab(app,'addStrike'));
eval(H.grab(app,'addOut'));
eval(H.grab(app,'addFoul'));
eval(H.grab(app,'newBatter'));
eval(H.grab(app,'undoBat'));
function save(){}
function renderBatting(){}
function offerHalfEnd(){}
function closeSheet(){}

var TODAY='2026-09-28';
todayStr=function(){return TODAY;};
function reset(){
  S.roster=[{id:'p1',name:'A B',number:'7'}];
  S.outings=[]; S.game=freshGame(1); S.game.date=TODAY; S.game.pitcherId='p1';
  lastBat=null;
  return bat();
}
function c(){ var x=bat(); return {b:x.b,s:x.s,o:x.o}; }

console.log('=== 1. balls: four clears the count, the out is untouched ===');
var x=reset();
addBall(); is(c(),{b:1,s:0,o:0},'one ball');
addBall(); addBall(); is(c(),{b:3,s:0,o:0},'three');
addBall(); is(c(),{b:0,s:0,o:0},'the fourth walks him and the count clears');
reset(); bat().o=2; addBall(); addBall(); addBall(); addBall();
is(c(),{b:0,s:0,o:2},'and a walk NEVER touches the outs');

console.log('\n=== 2. strikes: the third clears the count AND adds an out ===');
reset();
addStrike(); is(c(),{b:0,s:1,o:0},'one strike');
addStrike(); is(c(),{b:0,s:2,o:0},'two');
addStrike(); is(c(),{b:0,s:0,o:1},'the third strikes him out: count clear, one out');
reset(); bat().b=3;
addStrike(); addStrike(); addStrike();
is(c(),{b:0,s:0,o:1},'and the balls go with it');

console.log('\n=== 3. three outs ends the half ===');
reset();
addOut(false); is(c().o,1,'one out');
addOut(false); is(c().o,2,'two');
addOut(false);
is(c(),{b:0,s:0,o:0},'the third clears everything');
is(S.game.halfDone,true,'and the half is marked done');

console.log('\n=== 4. A FOUL IS NOT A THIRD STRIKE. This one is load bearing. ===');
reset();
addFoul(); is(c(),{b:0,s:1,o:0},'a foul below two strikes adds one');
addFoul(); is(c(),{b:0,s:2,o:0},'and again');
addFoul(); is(c(),{b:0,s:2,o:0},'at TWO strikes it changes nothing');
addFoul(); addFoul(); addFoul();
is(c(),{b:0,s:2,o:0},'you can foul off all day and never make an out');
is(!S.game.halfDone,true,'so a foul can never end a half');

console.log('\n=== 5. New batter clears the count, never the outs ===');
reset();
addBall(); addStrike(); addOut(false);
is(c(),{b:1,s:1,o:1},'a ball, a strike and an out');
newBatter();
is(c(),{b:0,s:0,o:1},'a new batter clears ball and strike and leaves the out');

console.log('\n=== 6. Undo names its target and puts the state back ===');
reset();
addBall(); addBall();
is(lastBat&&lastBat.what,'ball','the last action is named');
undoBat();
is(c(),{b:1,s:0,o:0},'and undoing it restores the count before it');
addStrike();
is(lastBat.what,'strike','a strike names itself');
undoBat(); is(c(),{b:1,s:0,o:0},'and undoes');
reset(); addFoul();
is(lastBat.what,'foul','a foul names itself, so Undo can say "Undo foul"');

console.log('\n=== 7. undoing the third out reopens the half ===');
reset();
addOut(false); addOut(false); addOut(false);
is(S.game.halfDone,true,'the half ended');
undoBat();
is(!S.game.halfDone,true,'and undoing the out reopens it');
is(c().o,2,'with two outs back on the board');

console.log('\n=== 8. the caps hold ===');
reset();
for(var i=0;i<12;i++) addBall();
is(c().b<=4,true,'balls never exceed four');
reset();
for(i=0;i<12;i++) addStrike();
is(c().s<=3,true,'strikes never exceed three');
is(c().o<=3,true,'outs never exceed three');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
