/* CHALK-151. End game moves to the Log, inside one game card with two states.
 *
 * Why one card and not two buttons: you can never share a game that has not
 * ended and you do not need End game once it has, so one of two permanent
 * buttons would always be inert.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}
function grabOr(n){ try{ return H.grab(app,n); }catch(e){ return ''; } }

console.log('=== 0. the card exists ===');
var cardSrc=grabOr('renderGameCard'), liveSrc=grabOr('gameIsLive'),
    sumSrc=grabOr('todaysGameSummary'), askSrc=grabOr('askEndGame');
is(cardSrc!=='',true,'renderGameCard');
is(liveSrc!=='',true,'gameIsLive');
is(sumSrc!=='',true,'todaysGameSummary');
if(fail){ console.log('\n  No game card in this build.\n\nFAILED '+fail+' of '+(pass+fail)); process.exit(1); }

console.log('\n=== 1. the card belongs to a GAME, and only exists with one ===');
is(/if\(!live&&!g\.pitchers\)/.test(cardSrc),true,
   'no game today means no card at all, not a card holding a button');
is(/No game scheduled today/.test(cardSrc),false,'the empty state is gone');
is(/End game/.test(cardSrc),true,'live still ends the game from inside the card');
is(/Share availability/.test(cardSrc),false,
   'Share has LEFT the card: it is about the roster today, not about this game');
is(/gcact/.test(cardSrc)&&/live\s*\?/.test(cardSrc),true,
   'and an ended game carries no button, because it has nothing left to do');

console.log('\n=== 2. Share is on the heading, Tertiary, icon TRAILING ===');
var headline=app.slice(app.indexOf('<div class="headline">'),
                       app.indexOf('</header>',app.indexOf('<div class="headline">')));
is(/id="shareBtn"/.test(headline),true,'Share sits on the Log heading, every day');
is(/class="btn tertiary"/.test(headline),true,'as a Tertiary: labelled, quiet, already in the system');
var btn=headline.slice(headline.indexOf('id="shareBtn"'));
is(btn.indexOf('Share')<btn.indexOf('<svg'),true,
   'the icon TRAILS the label, because sharing leaves the app for Messages');

console.log('\n=== 2b. and the heading carries no subtitle ===');
is(/id="logSub"/.test(app),false,'no subtitle under Log: the card says what is happening');

console.log('\n=== 3. the action is INSIDE the card ===');
is(cardSrc.indexOf('gcact')>-1,true,'there is an action slot in the card markup');
is(/class="gamecard"/.test(app),true,'and the card is one tinted element');
var cardCss=app.slice(app.indexOf('.gamecard{'),app.indexOf('.gamecard .gctop'));
is(/brand-tint/.test(cardCss),true,'tinted, so it reads as the game and not as the first row');

console.log('\n=== 3. End game LEAVES Settings, it is not duplicated ===');
var settings=app.slice(app.indexOf('data-pane="game"'),app.indexOf('data-pane="app"'));
is(/id="endGameBtn"/.test(settings),false,'no End game button left in Settings');
is((app.match(/id="endGameBtn"/g)||[]).length,1,'exactly one End game in the whole file');
is((app.match(/id="shareBtn"/g)||[]).length,1,'and exactly one Share');

console.log('\n=== 4. ending is still confirmed ===');
is(/ask\(/.test(askSrc),true,'the confirmation survived the move');
is(/End this game/.test(askSrc),true,'and still names what it is about to do');

console.log('\n=== 5. live means there is something to end ===');
is(/pitcherId/.test(liveSrc)&&/count/.test(liveSrc),true,
   'a pitcher on the mound or pitches on the counter');
is(/gameIsToday/.test(liveSrc),true,'and it has to be today');

console.log('\n=== 6. the summary counts pitchers, not outings ===');
is(/pitchers\[o\.pitcherId\]/.test(sumSrc),true,'distinct pitcher ids');
is(/o\.date!==t/.test(sumSrc),true,'and only today');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
