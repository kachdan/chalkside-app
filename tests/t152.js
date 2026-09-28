/* CHALK-152, reconcile. THE RESTATE IS THE PART THAT BREAKS.
 *
 * Rest comes from the DAY TOTAL, so correcting one outing moves the clear date
 * of every OTHER outing that player threw that day. A correction that updates
 * only the row it touched leaves a stale clear date on the other, which is
 * CHALK-119 coming back in a new place.
 *
 * This is the first ticket since CHALK-148 allowed to change a rule answer, so
 * the answers are checked against the engine, never restated here.
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

console.log('=== 0. the pieces exist ===');
var goSrc=grabOr('gameOutings'), pdSrc=grabOr('pendingDayTotal'),
    saveSrc=grabOr('saveReconcile'), delSrc=grabOr('deleteReconciledGame'),
    rowsSrc=grabOr('renderReconcile');
is(goSrc!=='',true,'gameOutings');
is(pdSrc!=='',true,'pendingDayTotal');
is(saveSrc!=='',true,'saveReconcile');
is(delSrc!=='',true,'deleteReconciledGame');
if(fail){ console.log('\n  No reconcile in this build.\n\nFAILED '+fail+' of '+(pass+fail)); process.exit(1); }

global.localStorage=H.fakeStorage();
var S={roster:[],outings:[],game:null};
eval(H.rulesRuntime(app));
eval(goSrc); eval(pdSrc);

var TODAY='2026-09-28';
todayStr=function(){return TODAY;};

/* the sheet, as the app would leave it */
var sent=[], deleted=[];
function save(){}
function renderAll(){}
function closeSheet(){}
function syncUrl(){return 'https://example.invalid/exec';}
function pushToSheet(rec){ sent.push({id:rec.id,pitches:rec.pitches,restate:restateFor(rec)}); }
function pushDelete(id,restate){ deleted.push({id:id,restate:restate}); }
var reconcile=null;
eval(saveSrc); eval(delSrc);
eval(H.grab(app,'reconcileStep'));
eval(H.grab(app,'reconcileRows'));
function jerseySort(a,b){ return (a.number||'')<(b.number||'')?-1:1; }

function reset(){
  S.roster=[{id:'p1',name:'A B',number:'7'},{id:'p2',name:'C D',number:'8'}];
  S.outings=[]; sent=[]; deleted=[];
}
function add(id,pid,date,pitches,game){
  S.outings.push({id:id,pitcherId:pid,date:date,pitches:pitches,game:game,synced:true});
}
function clearOf(id){
  var o=S.outings.filter(function(x){return x.id===id;})[0];
  return o?eligibleDate(o.date,dayTotal(o.pitcherId,o.date)):null;
}

console.log('\n=== 1. THE CASE: two outings, one player, one day ===');
reset();
add('a','p1',TODAY,41,1);      /* game 1 */
add('b','p1',TODAY,20,2);      /* game 2, same day */
is(dayTotal('p1',TODAY),61,'the day total is 61');
is(restDays(61),3,'which needs three days');
is(clearOf('a'),eligibleDate(TODAY,61),'and BOTH rows carry the day total\'s date');
is(clearOf('b'),clearOf('a'),'the same date on each');

console.log('\n=== 2. correcting game 2 moves game 1\'s clear date too ===');
reconcile={date:TODAY,seq:2,pending:{b:9}};   /* 20 down to 9 */
saveReconcile();
is(dayTotal('p1',TODAY),50,'the day total is now 50');
is(restDays(50),2,'which needs two days, down from three');
is(sent.length,1,'one outing was pushed');
is(sent[0].id,'b','the one that changed');
var ids=sent[0].restate.rows.map(function(r){return r.id;}).sort();
is(ids,['a','b'],'AND THE RESTATE NAMES BOTH ROWS, not just the one edited');
var dates=sent[0].restate.rows.map(function(r){return r.eligible;});
is(dates[0]===dates[1]&&dates[0]===eligibleDate(TODAY,50),true,
   'both carrying the corrected day total\'s clear date');

console.log('\n=== 3. the correction is the engine\'s answer, not the tray\'s ===');
reset();
add('a','p1',TODAY,44,1);
reconcile={date:TODAY,seq:1,pending:{a:46}};
is(restDays(44),1,'44 needs one day');
is(restDays(46),2,'46 needs two');
saveReconcile();
is(S.outings[0].pitches,46,'the count is corrected');
is(sent[0].restate.rows[0].eligible,eligibleDate(TODAY,46),
   'and the clear date is eligibleDate of the corrected number');

console.log('\n=== 4. a corrected outing is marked unsent until it lands ===');
reset(); add('a','p1',TODAY,10,1);
reconcile={date:TODAY,seq:1,pending:{a:12}};
saveReconcile();
is(S.outings[0].synced,false,'so Send unsent will retry it if the push failed');

console.log('\n=== 5. no change is no write ===');
reset(); add('a','p1',TODAY,10,1);
reconcile={date:TODAY,seq:1,pending:{a:10}};
saveReconcile();
is(sent.length,0,'setting it back to what it was writes nothing');

console.log('\n=== 6. only THIS game is touched ===');
reset();
add('a','p1',TODAY,30,1);
add('b','p1',TODAY,30,2);
add('c','p2',TODAY,25,2);
is(gameOutings(TODAY,2).map(function(o){return o.id;}),['b','c'],'game 2 holds b and c');
is(gameOutings(TODAY,1).map(function(o){return o.id;}),['a'],'game 1 holds a');
reset();
add('a','p1',TODAY,30);        /* no sequence: a legacy row */
is(gameOutings(TODAY,2).map(function(o){return o.id;}),['a'],
   'a row with no sequence is attributed to the current game, as elsewhere');

console.log('\n=== 7. DELETING THE GAME restates what is left ===');
reset();
add('a','p1',TODAY,41,1);      /* game 1 stays */
add('b','p1',TODAY,20,2);      /* game 2 goes */
reconcile={date:TODAY,seq:2,pending:{}};
deleteReconciledGame();
is(S.outings.map(function(o){return o.id;}),['a'],'only game 2 was removed');
is(dayTotal('p1',TODAY),41,'the day total is back to 41');
is(deleted.length,1,'one delete was sent');
is(deleted[0].id,'b','for the removed row');
is(deleted[0].restate.rows.map(function(r){return r.id;}),['a'],
   'AND IT RESTATES THE SURVIVING ROW, which is the CHALK-119 bug if it does not');
is(deleted[0].restate.rows[0].eligible,eligibleDate(TODAY,41),
   'with the clear date the remaining 41 earns');

console.log('\n=== 8. deleting the last outing of a day leaves nothing to restate ===');
reset(); add('a','p1',TODAY,41,1);
reconcile={date:TODAY,seq:1,pending:{}};
deleteReconciledGame();
is(S.outings.length,0,'the outing is gone');
is(deleted[0].restate,null,'and the restate is null rather than an empty promise');

console.log('\n=== 9. the stepper: floor at 0, and NO ceiling ===');
reset(); add('a','p1',TODAY,2,1);
reconcile={date:TODAY,seq:1,pending:{}};
reconcileStep('a',-1); is(reconcile.pending.a,1,'down one');
reconcileStep('a',-1); is(reconcile.pending.a,0,'down to zero');
reconcileStep('a',-1); is(reconcile.pending.a,0,'AND IT FLOORS THERE');
reset(); add('a','p1',TODAY,84,1);
reconcile={date:TODAY,seq:1,pending:{}};
for(var k=0;k<6;k++) reconcileStep('a',1);
is(reconcile.pending.a,90,
   'NO CEILING: a pitcher may finish the batter he is on, so a real count can exceed the limit');
saveReconcile();
is(S.outings[0].pitches,90,'and it saves');
is(restDays(90),3,'with the engine still answering');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
