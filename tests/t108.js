/* CHALK-108, rebuilt under CHALK-148. THE GAME SCOPE RULES.
 *
 * Union County Cal Ripken, MAJORS, Spring 2026. Not Little League; the numbers
 * differ, so never "correct" these against a Little League table.
 *
 *   75 pitches a day, judged on the DAY TOTAL, every outing on a date summed
 *   rest 1-30 none, 31-45 one day, 46-60 two, 61+ three
 *   rest days do not begin until the FOLLOWING day
 *   off the mound means done for that game, even after one pitch
 *   4+ innings caught blocks pitching in the same game
 *
 * This suite and t110 are the ones that were lost. Everything shipped between
 * 22 and 28 Sep claimed "no rule answer moved" without them.
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

var TODAY='2026-09-28';
todayStr=function(){return TODAY;};
function d(n){ return addDays(TODAY,-n); }
/* game is the sequence number within the day. An outing with none is
   deliberately attributed to the CURRENT game by outingSeq, which is the safe
   direction for a legacy row, so a fixture for "an earlier game" must say so. */
function outing(pid,date,pitches,id,game){
  var o={id:id||('o'+S.outings.length),pitcherId:pid,date:date,pitches:pitches};
  if(game!==undefined) o.game=game;
  S.outings.push(o);
}
function reset(){ S.roster=[{id:'p1',name:'A B',number:'7'},{id:'p2',name:'C D',number:'8'}];
                  S.outings=[]; S.game=null; }

console.log('=== 1. the rest brackets, at every boundary ===');
[[1,0],[30,0],[31,1],[45,1],[46,2],[60,2],[61,3],[75,3]].forEach(function(p){
  is(restDays(p[0]),p[1],p[0]+' pitches needs '+p[1]+' day'+(p[1]===1?'':'s'));
});

console.log('\n=== 2. rest does not begin until the FOLLOWING day ===');
is(eligibleDate('2026-09-01',20),'2026-09-02','20 pitches, 0 rest days, clear the next day');
is(eligibleDate('2026-09-01',31),'2026-09-03','31 pitches, 1 rest day, clear the day after that');
is(eligibleDate('2026-09-01',61),'2026-09-05','61 pitches, 3 rest days');

console.log('\n=== 3. THE DAY TOTAL, not one appearance. This is CHALK-102. ===');
reset();
outing('p1',d(0),40); outing('p1',d(0),30);
is(dayTotal('p1',d(0)),70,'40 then 30 on one date is 70, not two separate 40s');
is(restDays(dayTotal('p1',d(0))),3,'and 70 needs THREE days, not the one that 40 alone needs');
is(lastPitchingDay('p1').pitches,70,'the last pitching day carries the summed total');

console.log('\n=== 4. 75 is judged on the day, and a 75 day blocks catching ===');
reset(); outing('p1',TODAY,75);
is(pitchesToday('p1'),75,'75 today');
is(hitMaxToday('p1'),true,'he has reached the cap');
reset(); outing('p1',TODAY,40); outing('p1',TODAY,35);
is(pitchesToday('p1'),75,'40 plus 35 is also 75');
is(hitMaxToday('p1'),true,'and the cap is reached by the DAY, not by one outing');
reset(); outing('p1',TODAY,74);
is(hitMaxToday('p1'),false,'74 has not');

console.log('\n=== 5. off the mound is done for that game, after one pitch ===');
reset();
S.game={date:TODAY,seq:1,pitcherId:'p2',count:0,marks:[],inning:1,innings:[{p:'p2',c:null}],catchAdj:{}};
outing('p1',TODAY,1,'x1');
is(!!pitchedThisGame('p1'),true,'one pitch counts as having pitched in this game');
is(pitchEligibility('p1').ok,false,'so he cannot return to the mound');
is(pitchEligibility('p1').tag,'Pitched','and the row says Pitched');

console.log('\n=== 6. the house rule: pitched today blocks a second GAME too ===');
is(DAY_SCOPED_MOUND,true,'the app is stricter than the rulebook, deliberately');
reset();
S.game={date:TODAY,seq:2,pitcherId:null,count:0,marks:[],inning:1,innings:[],catchAdj:{}};
outing('p1',TODAY,20,'y1',1);   /* game 1, while we are now in game 2 */
is(!!pitchedToday('p1'),true,'he pitched earlier today');
is(!!pitchedThisGame('p1'),false,'in a DIFFERENT game, so the game rule does not fire');
is(pitchEligibility('p1').ok,false,'but the day rule does');
is(pitchEligibility('p1').tag,'Pitched today','and says so');

console.log('\n=== 7. 4+ innings caught blocks pitching IN THAT GAME ===');
reset();
S.game={date:TODAY,seq:1,pitcherId:'p2',count:0,marks:[],inning:5,
        innings:[{p:'p2',c:'p1'},{p:'p2',c:'p1'},{p:'p2',c:'p1'},{p:'p2',c:'p1'}],catchAdj:{}};
is(caughtThisGame('p1'),4,'four innings behind the plate');
is(pitchEligibility('p1').ok,false,'four blocks him');
reset();
S.game={date:TODAY,seq:1,pitcherId:'p2',count:0,marks:[],inning:4,
        innings:[{p:'p2',c:'p1'},{p:'p2',c:'p1'},{p:'p2',c:'p1'}],catchAdj:{}};
is(caughtThisGame('p1'),3,'three innings');
is(pitchEligibility('p1').ok,true,'three does NOT block him');

console.log('\n=== 8. the catcher tally belongs to ONE DAY ===');
reset();
S.game={date:d(1),seq:1,pitcherId:'p2',count:0,marks:[],inning:5,
        innings:[{p:'p2',c:'p1'},{p:'p2',c:'p1'},{p:'p2',c:'p1'},{p:'p2',c:'p1'}],catchAdj:{}};
is(gameIsToday(),false,'the game object is yesterday\'s');
is(caughtThisGame('p1'),0,'so the tally reads 0 rather than carrying over');
is(pitchEligibility('p1').ok,true,'and yesterday\'s catching does not block him today');

console.log('\n=== 9. availability against a date, and the whole verdict ===');
reset(); outing('p1',d(1),50);
is(restDays(50),2,'50 needs two days');
is(eligibleDate(d(1),50),addDays(TODAY,2),'50 yesterday, 2 days rest, clear the day after tomorrow');
is(availability('p1').ok,false,'so not today');
reset(); outing('p1',d(3),50);
is(availability('p1').ok,true,'three days ago, 50 pitches, he is clear');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
