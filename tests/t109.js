var H=require('./harness.js');
global.localStorage=H.fakeStorage();
var src=H.appSource();
eval(H.rulesRegion(src));                 /* was a generated /tmp/rules.js */
function grab(n){ return H.grab(src,n); }
eval(['availabilityOn','opponentOn','futureGames','shareText'].map(grab).join('\n'));
var TODAY='2026-09-16'; todayStr=function(){return TODAY;};
function teamName(){return 'Test Team';}
var S;
var pass=0,fail=0;
function is(g,w,l){var ok=JSON.stringify(g)===JSON.stringify(w);
  console.log((ok?'  PASS  ':'  FAIL  ')+l+(ok?'':'\n          got  '+JSON.stringify(g)+'\n          want '+JSON.stringify(w)));ok?pass++:fail++;}
function reset(){
  S={roster:[{id:'p1',name:'Alpha One',number:'11'},{id:'p2',name:'Bravo Two',number:'22'},{id:'p3',name:'Charlie Three',number:'33'}],
     outings:[],game:{date:TODAY,seq:1,pitcherId:null,count:0,marks:[],inning:1,innings:[],catchAdj:{}},opp:0};
  setSchedule([]);
}

console.log('\n=== 1. the opponent, out of the feed ===');
setSchedule([{date:'2026-09-17',title:'vs Northside Runners',kind:'game'},
             {date:'2026-09-20',title:'@ Southgate Warriors',kind:'game'},
             {date:'2026-09-22',title:'Bandits',kind:'game'}]);
is(opponentOn('2026-09-17'),'vs Northside Runners','vs is kept');
is(opponentOn('2026-09-20'),'at Southgate Warriors','@ becomes at, because playing AT someone reads differently');
is(opponentOn('2026-09-22'),'Bandits','a bare title passes through');
is(opponentOn('2026-09-19'),'','no game that day, no opponent');

console.log('\n=== 2. the target defaults to the next scheduled GAME ===');
is(futureGames(),['2026-09-17','2026-09-20','2026-09-22'],'future games, soonest first');
setSchedule([{date:'2026-09-17',title:'TBD',kind:'unknown'},{date:'2026-09-20',title:'vs Northside',kind:'game'}]);
is(futureGames(),['2026-09-20'],'an ambiguous day is not offered as a target');

console.log('\n=== 3. eligibility is recomputed for the TARGET date ===');
reset();
S.outings=[{id:'a',pitcherId:'p1',date:'2026-09-14',game:1,pitches:77}];
is(availabilityOn('p1','2026-09-17').ok,false,'77 on Sep 14 is not clear for Sep 17');
is(availabilityOn('p1','2026-09-18').ok,true,'but is clear for Sep 18');
is(availabilityOn('p1','2026-09-17').why,'77 on Mon Sep 14, needs 3 days, not clear until Fri Sep 18','and says why');

console.log('\n=== 4. a FUTURE game does not inherit tonight’s catcher block ===');
reset();
S.game.innings=[{p:null,c:'p2'},{p:null,c:'p2'},{p:null,c:'p2'},{p:null,c:'p2'}];
S.game.inning=4;
is(caughtThisGame('p2'),4,'four innings caught in tonight’s game');
is(availabilityOn('p2',TODAY).ok,false,'so he cannot pitch in THIS game');
is(availabilityOn('p2','2026-09-17').ok,true,'but Thursday is a different game, so he can');
is(availabilityOn('p2','2026-09-17').why,'no outings logged','and the reason is about pitching, not catching');

console.log('\n=== 5. a poisoned eligible column cannot reach the message ===');
reset();
S.outings=[{id:'x',pitcherId:'p3',date:'2026-09-14',game:1,pitches:20,eligible:'2099-01-01'}];
is(availabilityOn('p3','2026-09-17').ok,true,'recomputed from date and pitches, the column ignored');

console.log('\n=== 6. the message itself ===');
reset();
setSchedule([{date:'2026-09-17',title:'vs Northside Runners',kind:'game'}]);
S.outings=[{id:'a',pitcherId:'p1',date:'2026-09-14',game:1,pitches:77},
           {id:'b',pitcherId:'p2',date:'2026-09-14',game:1,pitches:40}];
var txt=shareText('2026-09-17');
console.log('\n----- exact output -----\n'+txt+'\n------------------------');
is(txt.split('\n')[0],'Test Team — Thu Sep 17 vs Northside Runners','header names the opponent');
is(txt.indexOf('CAN PITCH')>-1&&txt.indexOf('CANNOT')>-1,true,'both blocks present');
is(txt.indexOf('11 Alpha One — 77 on Mon Sep 14, needs 3 days, not clear until Fri Sep 18')>-1,true,'who cannot, and why');
is(txt.indexOf('33 Charlie Three — no outings logged')>-1,true,'who can, and why');

console.log('\n=== 7. no schedule: falls back to a date and the wording adapts ===');
setSchedule([]);
var t2=shareText('2026-09-17');
is(t2.split('\n')[0],'Test Team — Thu Sep 17','no opponent named when the schedule does not know one');
is(futureGames(),[],'and nothing is offered as a game');

console.log('\n=== 8. innings caught appear only where they affect eligibility ===');
reset();
S.game.innings=[{p:null,c:'p2'},{p:null,c:'p2'}];
S.game.inning=2;
is(shareText(TODAY).indexOf('2 innings caught')>-1,true,'shown when the target is tonight');
is(shareText('2026-09-17').indexOf('innings caught')>-1,false,'absent when the target is a future game');

console.log('\n'+(fail?'FAILED '+fail+' of '+(pass+fail):'ALL '+pass+' PASSED'));
process.exit(fail?1:0);
