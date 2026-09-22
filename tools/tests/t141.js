/* CHALK-141. The inning goes up when the BOTTOM half ends, and which tab switch
 * that is depends on home or away. Wire both the same way and one of them is
 * wrong every single inning.
 *
 * Away bats the top, home bats the bottom.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}

var store={};
global.localStorage={
  getItem:function(k){return k in store?store[k]:null;},
  setItem:function(k,v){store[k]=String(v);},
  removeItem:function(k){delete store[k];}
};
var SCHED_KEY='chalkside_schedule_v1';
eval(H.grab(app,'schedule'));
eval(H.grab(app,'setSchedule'));
eval(H.grab(app,'homeAwayOn'));
eval(H.grab(app,'halfGlyph'));

var DATE='2026-09-22';

console.log('=== 1. the separator decides, and nothing else ===');
setSchedule([{date:DATE,title:'vs Northside Rangers',kind:'game'}]);
is(homeAwayOn(DATE),'home','"vs" is home, and home bats the bottom');
setSchedule([{date:DATE,title:'@ Southgate Giants',kind:'game'}]);
is(homeAwayOn(DATE),'away','"@" is away, and away bats the top');
setSchedule([{date:DATE,title:'at Southgate Giants',kind:'game'}]);
is(homeAwayOn(DATE),'away','"at" is away too');
setSchedule([{date:DATE,title:'vs. Northside',kind:'game'}]);
is(homeAwayOn(DATE),'home','a trailing dot does not change it');

console.log('\n=== 2. UNKNOWN IS ABSENT, never a default ===');
setSchedule([]);
is(homeAwayOn(DATE),'','no schedule at all');
setSchedule([{date:DATE,title:'Practice',kind:'practice'}]);
is(homeAwayOn(DATE),'','a practice is not a game');
setSchedule([{date:DATE,title:'Jamboree',kind:'game'}]);
is(homeAwayOn(DATE),'','a game with neither separator');
setSchedule([{date:'2026-09-25',title:'vs Northside',kind:'game'}]);
is(homeAwayOn(DATE),'','a game on a DIFFERENT day');
is(halfGlyph(''),'','and an unknown half draws nothing at all');

console.log('\n=== 3. the glyph points the right way ===');
is(halfGlyph('top').indexOf('M12 5l7 12H5z')>-1,true,'top is UP');
is(halfGlyph('bottom').indexOf('M12 19l7-12H5z')>-1,true,'bottom is DOWN');

console.log('\n=== 4. the advance is wired to the half, not to the tab ===');
var goSrc=H.grab(app,'go');
is(/homeAwayOn/.test(goSrc),true,'go() asks whether we are home or away');
is(/bottomOpen/.test(goSrc),true,
   'and latches the bottom, so a first switch to Batting cannot advance');
var home=goSrc.slice(goSrc.indexOf("ha==='home'"),goSrc.indexOf("ha==='away'"));
is(/name==='count'/.test(home)&&/advanceInning/.test(home),true,
   'HOME advances leaving Batting for Count');
var away=goSrc.slice(goSrc.indexOf("ha==='away'"));
is(/name==='batting'/.test(away)&&/advanceInning/.test(away),true,
   'AWAY advances leaving Count for Batting');
var unknown=goSrc.slice(goSrc.lastIndexOf('} else {'));
is(/advanceInning/.test(unknown),false,
   'and with home or away unknown it advances nothing');

console.log('\n=== 5. the batting pill is fixed by home and away, not by the tab ===');
var battingHalfSrc=(function(){ try{ return H.grab(app,'battingHalf'); }catch(e){ return ''; } })();
is(battingHalfSrc!=='',true,'battingHalf exists');
if(!battingHalfSrc){
  console.log('\n  This build has no batting pill. Nothing below can be exercised.');
  console.log('\nFAILED '+fail+' of '+(pass+fail));
  process.exit(1);
}
eval(battingHalfSrc);
var S={game:{date:DATE}};
function todayStr(){ return DATE; }
setSchedule([{date:DATE,title:'@ Southgate Giants',kind:'game'}]);
is(battingHalf(),'top','away bats the TOP, so the batting pill points up');
setSchedule([{date:DATE,title:'vs Northside Rangers',kind:'game'}]);
is(battingHalf(),'bottom','home bats the BOTTOM, so it points down');
setSchedule([]);
is(battingHalf(),'','and unknown draws nothing, the same rule as everywhere');

console.log('\n=== 6. the pill is one component, on both screens ===');
is(/\.innpill\{/.test(app),true,'it has its own base rule, not a descendant one');
is(/\.innpill::after/.test(app),true,'and the 44px hit area belongs to the component');
is((app.match(/class="innpill/g)||[]).length,2,'used on exactly two screens');
is(/id="batInningTitle"/.test(app),false,
   'the words "Nth inning" are gone, since the pill already carries the number');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
