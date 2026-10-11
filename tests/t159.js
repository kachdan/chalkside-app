/* CHALK-159. The opponent count above the pitch zone.
 *
 * THE ONE THING THIS SUITE EXISTS FOR: a tap on the scoreboard must never
 * change the pitch count. Everything else in the ticket is a convenience. That
 * number is what the rest days are computed from, and a mistap near the zone
 * inventing a pitch would be a rules error nobody could see.
 *
 * The scoreboard deliberately has no rules of its own: it calls the same
 * addBall / addStrike / addOut / newBatter the Batting tiles call. So this
 * suite drives those, and asserts separately that the board's handler cannot
 * reach the count.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(g,w,l){
  var ok=JSON.stringify(g)===JSON.stringify(w);
  if(ok){pass++;console.log('  PASS  '+l);}
  else{fail++;console.log('  FAIL  '+l+'\n          got  '+JSON.stringify(g)+'\n          want '+JSON.stringify(w));}
}

global.localStorage=H.fakeStorage();
var S={roster:[],outings:[],game:null};

/* the real rules, out of the app */
eval(H.rulesRuntime(app));
eval([ 'bat','rememberBat','undoBat','addBall','addStrike','addOut','newBatter' ]
     .map(function(n){return H.grab(app,n);}).join('\n'));

/* Everything the rules touch that is screen, not rule. save() is a no-op here
   and the renders are counted, not drawn. offerHalfEnd is recorded so the
   third out can be checked without a DOM. */
var saved=0, rendered=0, offered=0;
function save(){ saved++; }
function renderBatting(){ rendered++; }
function renderCount(){ rendered++; }
function renderScoreboard(){ rendered++; }
function closeSheet(){}
function offerHalfEnd(){ offered++; }
function currentInning(){ return S.game&&S.game.inning||1; }
function freshGame(seq){
  return {date:'2026-10-11',seq:seq||1,pitcherId:'p1',count:0,marks:[],
          inning:1,innings:[],catchAdj:{},bottomOpen:false,bat:{b:0,s:0,o:0}};
}
function reset(){
  S.game=freshGame(1); lastBat=null; lastTap=null; callOrigin='batting';
  saved=0; rendered=0; offered=0;
}
var lastTap=null, callOrigin='batting';

console.log('=== 1. NO SCOREBOARD CALL TOUCHES THE PITCH COUNT ===');
reset();
S.game.count=37; S.game.marks=[1,2,3];
var before=S.game.count, marksBefore=S.game.marks.length;
addBall(); addBall(); addBall(); addBall();      /* through a walk */
addStrike(); addStrike(); addStrike();           /* through a strikeout */
addOut(false); addOut(false);                    /* up to the third out */
newBatter();
is(S.game.count,before,'eleven calls, and the pitch count has not moved');
is(S.game.marks.length,marksBefore,'and no mark was pushed or popped');

console.log('\n=== 2. the walk ===');
reset();
addBall(); addBall(); addBall();
is([bat().b,bat().s],[3,0],'three balls stand at 3');
addBall();
is([bat().b,bat().s],[0,0],'the fourth is a walk and clears the count');
is(bat().o,0,'a walk is not an out');

console.log('\n=== 3. the strikeout ===');
reset();
addStrike(); addStrike();
is([bat().s,bat().o],[2,0],'two strikes stand at 2');
addStrike();
is([bat().b,bat().s],[0,0],'the third clears the count');
is(bat().o,1,'and adds an out');

console.log('\n=== 4. the third out ===');
reset();
addOut(false); addOut(false);
is(bat().o,2,'two outs stand');
addOut(false);
is(bat().o,0,'the third resets the outs');
is([bat().b,bat().s],[0,0],'and clears the count with them');
is(!!S.game.halfDone,true,'the half is marked over');
is(offered,1,'and the move is OFFERED, never taken automatically');

console.log('\n=== 5. NEW is for a hit: balls and strikes only ===');
reset();
addBall(); addBall(); addStrike(); addOut(false);
newBatter();
is([bat().b,bat().s],[0,0],'balls and strikes clear');
is(bat().o,1,'the out stands, because nobody was put out by a hit');
is(S.game.inning,1,'and the inning is untouched');

console.log('\n=== 6. Undo reverses a call, not a digit ===');
reset();
addBall(); addBall(); addBall();
addBall();                                   /* the walk */
is([bat().b,bat().s],[0,0],'after the walk the count is clear');
undoBat();
is([bat().b,bat().s],[3,0],'undo restores the count the walk wiped, not 0 minus 1');

console.log('\n=== 7. Undo after a strikeout gives the out back too ===');
reset();
addStrike(); addStrike(); addStrike();
is([bat().s,bat().o],[0,1],'struck out');
undoBat();
is([bat().s,bat().o],[2,0],'undo restores two strikes AND removes the out');

console.log('\n=== 8. a third out undone reopens the half ===');
reset();
addOut(false); addOut(false); addOut(false);
is(!!S.game.halfDone,true,'the half closed');
undoBat();
is(!!S.game.halfDone,false,'and undo reopens it, so the pill does not flip early');
is(bat().o,2,'with two outs back on the board');

console.log('\n=== 9. the rules live in ONE place ===');
/* If the scoreboard ever grows its own arithmetic this fails, which is the
   point: two copies of "the fourth ball is a walk" is how they drift. */
var board=H.grab(app,'boardAction');
is(/addBall\(\)/.test(board)&&/addStrike\(\)/.test(board)&&/addOut\(false\)/.test(board)&&/newBatter\(\)/.test(board),
   true,'boardAction calls the shared rule functions');
is(/bump\s*\(/.test(board),false,'and never calls bump');
is(/S\.game\.count/.test(board),false,'and never touches S.game.count');
is(/marks/.test(board),false,'and never touches the marks');
is(/c\.b\s*=|c\.s\s*=|c\.o\s*=/.test(board),false,'and sets no count of its own');

console.log('\n=== 10. the keyboard path cannot count a pitch ===');
/* The cells are labels, for the haptic, and this screen counts a pitch on
   Enter and Space. Without stopPropagation, tabbing to Strike and pressing
   Enter adds a PITCH. Static, because it is an event wiring fact. */
var i=app.indexOf("el('scoreboard').addEventListener('keydown'");
is(i>-1,true,'the scoreboard has its own keydown handler');
var kd=app.slice(i,i+520);
is(/stopPropagation\(\)/.test(kd),true,'which stops the event reaching the global pitch key handler');
is(/preventDefault\(\)/.test(kd),true,'and prevents the default label activation');

console.log('\n=== 11. the gap between the row and the zone is real ===');
/* REVISED. The row moved BELOW the zone so the screen reads in the order things
   happen, so the protection gap moved with it and is now the row's TOP padding.
   These assertions were not deleted with the move: the gap is the one number
   that keeps a thumb coming off the zone from landing on a call, and a build
   with no gap has to fail here. Measured for real in the browser too. */
var tz=app.slice(app.indexOf('.tapzone{'));
tz=tz.slice(0,tz.indexOf('}'));
is(/margin:var\(--space-12\) 0 0/.test(tz),true,'the zone keeps its 12px from the ribbon and gives nothing below');
var wrap=app.slice(app.indexOf('.sbwrap{'));
wrap=wrap.slice(0,wrap.indexOf('}'));
is(/padding:var\(--space-16\) var\(--space-16\) 22px/.test(wrap),true,
   'and the row carries the 16px gap above it, with Dan\'s 22 to the verdict below');
var topPad=(wrap.match(/padding:\s*([^\s;]+)/)||[])[1];
is(topPad,'var(--space-16)','and the gap above the row is specifically not 0  ['+topPad+']');

console.log('\n=== 11b. the ORDER, which is the whole revision ===');
/* The zone must come before the row in the MARKUP, not just visually. Tab order
   follows the DOM, so reading order and tab order are the same fact. A CSS-only
   reorder would have left a coach tabbing backwards up the screen. */
var zoneAt=app.indexOf('class="tapzone"');
var rowAt=app.indexOf('class="sbwrap"');
var verdictAt=app.indexOf('class="verdict"');
is(zoneAt>-1&&rowAt>-1&&verdictAt>-1,true,'all three are present');
is(zoneAt<rowAt,true,'the pitch zone comes before the scoreboard row');
is(rowAt<verdictAt,true,'and the row comes before the verdict');
is(/flex-direction:\s*column-reverse/.test(app),false,'and nothing reorders them in CSS behind the markup');
/* #countLive is a flex column, so `order:` on the row WOULD move it visually and
   leave the DOM, and therefore the tab order, pointing the other way. That is
   the exact divergence this revision exists to avoid, so it is asserted rather
   than assumed. Written to not trip over `border:`. */
is(/(^|[;{\s])order\s*:/.test(wrap),false,'and the row does not reposition itself with order:');

console.log('\n=== 12. built from tokens, so Dark is free ===');
var sb=app.slice(app.indexOf('/* ---------- CHALK-159'),app.indexOf('.taphint{'));
is(/#[0-9a-fA-F]{3,6}/.test(sb),false,'no hex anywhere in the scoreboard CSS');
is(/var\(--surface-raised\)/.test(sb),true,'the row takes the raised surface token');
is(/var\(--status-caution-strong\)/.test(sb)&&/var\(--status-stop\)/.test(sb),true,
   'and the digit ramp uses the same tokens as the tiles');

console.log('\n=== 13. NEW has an accessible name ===');
is(/aria-label="New batter"/.test(app),true,'NEW says what it is, since the word alone is not one');
is(/data-sb="new"/.test(app),true,'and is a scoreboard target');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
