/* ics_t and t117, rebuilt under CHALK-148. THE SCHEDULE.
 *
 * The browser cannot read the feed, so the Apps Script fetches it and writes a
 * Schedule tab; the app reads that tab back. So what is tested here is what the
 * app does with the ROWS, and the rule that decides what counts as a game.
 *
 * CHALK-117's principle: a date the app is not sure about is left out rather
 * than guessed, because a placeholder that turns out to be a practice puts a
 * wrong date at the top of a message the staff act on.
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
eval(H.constLine(app,'SCHED_KEY'));
eval(H.rulesRuntime(app));
eval(H.grab(app,'sheetField'));
eval(H.grab(app,'parseScheduleRows'));

var TODAY='2026-09-28';
todayStr=function(){return TODAY;};
function row(date,title){ return {Date:date,Title:title}; }

console.log('=== 1. what counts as a GAME ===');
is(eventKind('vs MH Rangers'),'game','"vs" is a game');
is(eventKind('@ Itaa 12u Vols'),'game','"@" is a game');
is(eventKind('at Eastvale'),'game','"at" is a game');
is(eventKind('Game vs Someone'),'game','the word game is enough');

console.log('\n=== 2. what is NOT ===');
is(eventKind('Practice'),'practice','practice');
is(eventKind('Scrimmage'),'practice','a scrimmage is a practice, not a game');
is(eventKind('Bullpen'),'practice','bullpen');
is(eventKind('Cage work'),'practice','cage');

console.log('\n=== 3. WHAT IT WILL NOT GUESS ===');
is(eventKind('TBD'),'unknown','TBD');
is(eventKind('TBA'),'unknown','TBA');
is(eventKind('Placeholder'),'unknown','a placeholder');
is(eventKind('Field 2?'),'unknown','a question mark');
is(eventKind(''),'unknown','nothing at all');
is(eventKind(null),'unknown','null');

console.log('\n=== 4. rows in, sorted, never coerced ===');
var rows=[row('2026-10-02','vs A'),row('2026-09-29','@ B'),row('2026-09-30','Practice')];
var parsed=parseScheduleRows(rows);
is(parsed.map(function(e){return e.date;}),['2026-09-29','2026-09-30','2026-10-02'],'sorted by date');
is(parsed.map(function(e){return e.kind;}),['game','practice','game'],'each carries its kind');
is(parseScheduleRows([row('29/09/2026','vs A')]).length,0,
   'a date that is not yyyy-mm-dd is DROPPED, never coerced');
is(parseScheduleRows([row('','vs A')]).length,0,'and so is an empty one');
is(parseScheduleRows(null),[],'null rows give nothing, not a throw');

console.log('\n=== 5. the next game, and when it refuses to say ===');
setSchedule([{date:'2026-09-30',title:'vs A',kind:'game'}]);
is(nextGameDate(),'2026-09-30','the next game');
setSchedule([{date:'2026-09-27',title:'vs A',kind:'game'}]);
is(nextGameDate(),null,'a game in the PAST is not the next one');
setSchedule([{date:'2026-09-29',title:'Practice',kind:'practice'},
             {date:'2026-09-30',title:'vs A',kind:'game'}]);
is(nextGameDate(),'2026-09-30','a practice in between is skipped');
setSchedule([{date:'2026-09-29',title:'TBD',kind:'unknown'},
             {date:'2026-09-30',title:'vs A',kind:'game'}]);
is(nextGameDate(),null,
   'AN UNKNOWN DAY BEFORE THE GAME STOPS IT: it might turn out to be the game');

console.log('\n=== 6. the opponent, and the separator that carries meaning ===');
setSchedule([{date:TODAY,title:'vs MH Rangers',kind:'game'}]);
is(opponentOn(TODAY),'vs MH Rangers','hosting reads as vs');
setSchedule([{date:TODAY,title:'@ Itaa 12u Vols',kind:'game'}]);
is(opponentOn(TODAY),'at Itaa 12u Vols','playing away reads as at');
setSchedule([]);
is(opponentOn(TODAY),'','no schedule, nothing to say');

console.log('\n=== 7. home and away, which CHALK-141 hangs the inning on ===');
setSchedule([{date:TODAY,title:'vs MH Rangers',kind:'game'}]);
is(homeAwayOn(TODAY),'home','vs is home');
setSchedule([{date:TODAY,title:'@ Itaa',kind:'game'}]);
is(homeAwayOn(TODAY),'away','@ is away');
setSchedule([{date:TODAY,title:'Jamboree',kind:'game'}]);
is(homeAwayOn(TODAY),'','a game with neither separator says NOTHING');
setSchedule([{date:TODAY,title:'Practice',kind:'practice'}]);
is(homeAwayOn(TODAY),'','and a practice is not a game');

console.log('\n=== 8. future games for the share message ===');
setSchedule([{date:'2026-09-27',title:'vs Past',kind:'game'},
             {date:'2026-09-30',title:'vs Soon',kind:'game'},
             {date:'2026-10-05',title:'@ Later',kind:'game'}]);
is(futureGames(),['2026-09-30','2026-10-05'],'today onward, soonest first');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
