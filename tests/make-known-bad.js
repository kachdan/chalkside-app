/* CHALK-148. Builds the known-bad copies from the CURRENT app, so a suite is
 * always proven against the build it actually guards.
 *
 * Each break is one real rule answer moved by one step: the kind of edit that
 * looks harmless in a diff and forfeits a game. */
var fs=require('fs'), path=require('path');
var H=require('./harness.js');
var OUT=path.join(__dirname,'known-bad');
var app=H.appSource();

var BREAKS=[
  ['rest-bracket.html',
   'var BRACKETS=[{max:30,days:0},{max:45,days:1},{max:60,days:2},{max:9999,days:3}];',
   'var BRACKETS=[{max:30,days:0},{max:45,days:1},{max:60,days:1},{max:9999,days:3}];',
   '46-60 needs one day instead of two'],
  ['rest-starts-same-day.html',
   'return addDays(dateStr,restDays(pitches)+1);',
   'return addDays(dateStr,restDays(pitches));',
   'rest days begin the same day instead of the following one'],
  ['day-cap.html', 'var MAX=75;', 'var MAX=85;', 'the day cap is 85'],
  ['catcher-limit.html', 'if(cg>3){', 'if(cg>4){', 'five caught innings block instead of four'],
  ['day-total.html',
   'if(o.pitcherId===pid&&o.date===day) total+=(+o.pitches||0);',
   'if(o.pitcherId===pid&&o.date===day) total=(+o.pitches||0);',
   'the day total is the last outing instead of the sum'],
  ['unknown-day-ignored.html',
   'if(hasUnknown) return null;',
   'if(hasUnknown){}',
   'an unknown day before the game no longer stops nextGameDate'],
  /* The first version of this break removed the tbd|tba pattern, and NOTHING
     caught it, because eventKind falls through to 'unknown' anyway: the break
     did not move a single answer. prove.sh reported it as a gap and it was a
     bad known-bad. This one moves the fallback instead, which really does turn
     every unrecognised title into a game. */
  ['unknown-becomes-a-game.html',
   "  if(/ vs\\.? | v\\.? | @ | at |game/.test(t)) return 'game';\n  return 'unknown';",
   "  if(/ vs\\.? | v\\.? | @ | at |game/.test(t)) return 'game';\n  return 'game';",
   'anything the parser does not recognise is treated as a game'],
  ['roster-divider.html',
   "return {ok:false,raw:line,why:'looks like a divider, not a player'};",
   "return {ok:true,number:num,name:name};",
   'a "--- Pitchers ---" divider becomes a player'],
  ['leading-zero.html',
   "if(lead){ num=lead[1]; name=lead[2]; }",
   "if(lead){ num=String(+lead[1]); name=lead[2]; }",
   'jersey 01 is parsed as 1'],
  ['inning-ordinal.html',
   "return n+(suf[(v-20)%10]||suf[v]||suf[0]);",
   "return n>3?'3rd':n+(suf[(v-20)%10]||suf[v]||suf[0]);",
   'every inning past the 3rd reads 3rd, the CHALK-110 ordinal collision']
];

if(!fs.existsSync(OUT)) fs.mkdirSync(OUT);
var made=[];
BREAKS.forEach(function(b){
  var name=b[0], from=b[1], to=b[2], why=b[3];
  if(app.indexOf(from)<0){
    console.log('  SKIP  '+name+': the anchor moved, so this break is stale');
    console.log('        looked for: '+from.slice(0,70));
    process.exitCode=1;
    return;
  }
  fs.writeFileSync(path.join(OUT,name), app.replace(from,to));
  made.push(name+'  ('+why+')');
});
console.log('built '+made.length+' known-bad builds:');
made.forEach(function(m){ console.log('  '+m); });
