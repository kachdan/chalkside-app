/* CHALK-150, the share message. EXCEPTIONS, NOT A ROSTER.
 *
 * Coaches want who CANNOT pitch, at a glance, in a text preview. Availability
 * is the default, so an available player is never named.
 *
 * The part most likely to break is the grouping: two players whose returns are
 * the same game must collapse to one line, and that has to be decided on the
 * GAME, not on a formatted string.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}
function has(text,frag,what){ is(text.indexOf(frag)>-1,true,what+'  ['+frag+']'); }
function hasNot(text,frag,what){ is(text.indexOf(frag)>-1,false,what+'  ['+frag+']'); }

global.localStorage=H.fakeStorage();
var S={roster:[],outings:[],game:null};
eval(H.rulesRuntime(app));
function teamName(){ return 'Testers'; }
/* caughtThisGame is NOT stubbed. It was, returning 0 for every player, and that
   silently made the blocked-catcher case in section 11 untestable: he came back
   available and the assertion failed against correct code. The real one comes
   out of the app through rulesRuntime, which is the point of rulesRuntime. */

var TODAY='2026-09-25';          /* a Friday */
todayStr=function(){return TODAY;};
function reset(){ S.roster=[]; S.outings=[]; S.game=null; setSchedule([]); }
function player(id,name,num){ S.roster.push({id:id,name:name,number:num}); }
function threw(id,date,pitches){ S.outings.push({id:'o'+S.outings.length,pitcherId:id,date:date,pitches:pitches}); }

console.log('=== 1. NOBODY OUT is one line ===');
reset();
player('a','Jase Tucker','34'); player('b','Steven Kachula','11');
setSchedule([{date:'2026-09-27',title:'vs MH Rangers',kind:'game'}]);
var t=shareText('2026-09-27');
is(t.indexOf('\n')<0,true,'the whole message is a single line');
has(t,'all 2 can pitch','it says how many can');
has(t,'vs MH Rangers','and names the game');
hasNot(t,"Can’t pitch",'with no section at all');

console.log('\n=== 2. AVAILABLE PLAYERS ARE NEVER NAMED ===');
reset();
player('a','Jase Tucker','34'); player('b','Steven Kachula','11');
player('c','Abe Marlow','7'); player('d','Cy Denby','32');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'}]);
threw('a','2026-09-25',52);      /* 2 days rest -> clear the 28th, out on the 26th */
threw('b','2026-09-25',35);      /* 1 day  rest -> clear the 27th, out on the 26th */
t=shareText('2026-09-26');
is(t.indexOf('Jase')>-1&&t.indexOf('Steven')>-1,true,'both unavailable players ARE named');
hasNot(t,'Abe','an available player is not named');
hasNot(t,'Cy','nor another');
has(t,'Everyone else is good','it says so once instead');
hasNot(t,'the other','never "the other N", which reads as a headcount puzzle');

console.log('\n=== 3. "threw 52", never a bare number ===');
reset();
player('a','Jase Tucker','34'); player('b','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'}]);
threw('a','2026-09-25',52);
t=shareText('2026-09-26');
has(t,'threw 52','the verb is there, so 52 cannot read as a jersey');
has(t,'threw 52 Fri','and the day is a NAME, not a date');

console.log('\n=== 4. THE GROUPING. Same return game collapses to one line. ===');
reset();
player('a','Jase Tucker','34'); player('b','Steven Kachula','11'); player('c','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'}]);
/* DIFFERENT pitch counts and DIFFERENT dates, so different eligible dates, but
   the next GAME on or after each is the same fixture */
threw('a','2026-09-25',52);      /* 2 days -> clear 28th */
threw('b','2026-09-24',35);      /* 1 day  -> clear 26th... make it later */
S.outings=[]; threw('a','2026-09-25',52); threw('b','2026-09-25',35);
t=shareText('2026-09-26');
is(restDays(52),2,'52 needs two days');
is(restDays(35),1,'35 needs one');
is(eligibleDate('2026-09-25',52)!==eligibleDate('2026-09-25',35),true,
   'so their clear DATES differ');
has(t,'Both clear for','and yet they collapse to ONE return line, because the GAME is the same');
has(t,'vs Cardinals','naming that game');
is((t.match(/back /g)||[]).length,0,'with no per-name return at all');

console.log('\n=== 5. DIFFERENT return games put it beside each name ===');
reset();
player('a','Jase Tucker','34'); player('b','Steven Kachula','11'); player('c','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'},
             {date:'2026-10-04',title:'vs Mavericks',kind:'game'}]);
threw('a','2026-09-25',35);      /* 1 day  -> clear 27th -> Sep 30 */
threw('b','2026-10-01',61);      /* 3 days -> clear Oct 5 -> none after */
S.outings=[]; threw('a','2026-09-25',35); threw('b','2026-09-30',61);
t=shareText('2026-09-26');
hasNot(t,'Both clear for','no collective line');
is((t.match(/back /g)||[]).length,2,'a return beside each name instead');
has(t,'vs Cardinals','one returns for the Cardinals game');
has(t,'vs Mavericks','the other for the Mavericks one');

console.log('\n=== 6. the return is always a GAME, never a bare date ===');
reset();
player('a','Jase Tucker','34'); player('b','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'}]);
threw('a','2026-09-25',61);      /* clear Sep 29, and no game after the 26th */
t=shareText('2026-09-26');
has(t,'back ','it still says when he is back');
hasNot(t,'vs MH Rangers, back','and falls back to the date when no game exists');

console.log('\n=== 7. a player back TODAY is not out ===');
reset();
player('a','Jase Tucker','34'); player('b','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'}]);
threw('a','2026-09-25',20);      /* 0 rest -> clear the 26th, which IS the game */
is(eligibleDate('2026-09-25',20),'2026-09-26','he clears ON the day of the game');
t=shareText('2026-09-26');
has(t,'all 2 can pitch','so he is available, not an exception');
hasNot(t,'Jase','and is not named');

console.log('\n=== 8. first names, with an initial only when two clash ===');
reset();
player('a','Jase Tucker','34'); player('b','Jase Broome','9'); player('c','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'}]);
threw('a','2026-09-25',52); threw('b','2026-09-25',52);
t=shareText('2026-09-26');
has(t,'Jase T','the clash is disambiguated');
has(t,'Jase B','on both of them');
reset();
player('a','Jase Tucker','34'); player('b','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'}]);
threw('a','2026-09-25',52);
t=shareText('2026-09-26');
has(t,'Jase ','a lone Jase stays a first name');
hasNot(t,'Jase T','with no initial');

console.log('\n=== 9. the game it concerns comes first ===');
reset();
player('a','Jase Tucker','34'); player('b','Abe Marlow','7');
setSchedule([{date:'2026-09-26',title:'vs MH Rangers',kind:'game'},
             {date:'2026-09-30',title:'vs Cardinals',kind:'game'}]);
threw('a','2026-09-25',52);
t=shareText('2026-09-26');
is(t.indexOf('Sat Sep 26 vs MH Rangers'),0,'the header is the first thing in the message');

console.log('\n=== 10. an exception with no pitching day still says why ===');
reset();
player('a','Jase Tucker','34'); player('b','Abe Marlow','7');
setSchedule([{date:TODAY,title:'vs MH Rangers',kind:'game'}]);
/* He never pitched, so there is no outing to report. He is out because he
   caught four innings, and the reason has to survive into the message or the
   line reads as a name with nothing beside it.
   The game is dated TODAY deliberately: caughtThisGame is gated on
   gameIsToday(), so a game built on any other date reports zero caught innings
   and this section passes while testing nothing. It did exactly that once. */
S.game={date:TODAY,seq:1,pitcherId:null,count:0,marks:[],inning:5,
        innings:[{p:null,c:'a'},{p:null,c:'a'},{p:null,c:'a'},{p:null,c:'a'}],catchAdj:{}};
is(caughtThisGame('a'),4,'the app counts four caught innings');
t=shareText(TODAY);
is(availabilityOn('a',TODAY).ok,false,'four caught innings block him');
has(t,'Caught 4 innings','the reason is in the message');
hasNot(t,'threw','with no outing claimed');
hasNot(t,'back ','and no return date invented, because rest is not what blocks him');

console.log('\n=== 11. plain text, nothing to render ===');
t=shareText('2026-09-26');
is(/<[a-z]/i.test(t),false,'no markup');
is(/\t/.test(t),false,'no tabs, which Messages collapses');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
