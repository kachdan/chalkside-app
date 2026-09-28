/* CHALK-149. Clear everything must leave the device unable to reach the sheet.
 *
 * The failure: the wipe cleared local data and left the sync and schedule URLs
 * in place, so an emptied phone was still wired to the shared record and the
 * next thing typed into it synced straight there.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}

var wipe=(function(){ try{ return H.grab(app,'wipeNow'); }catch(e){ return ''; } })();

console.log('=== 1. the wipe forgets every key that points at the team ===');
is(/SYNC_KEY/.test(wipe),true,'the sheet URL');
is(/ICS_KEY/.test(wipe),true,'the schedule feed URL');
is(/SCHED_KEY/.test(wipe),true,'the cached schedule, which is team data');
is(/TEAM_KEY/.test(wipe),true,'the team name');
is(/DELQ_KEY/.test(wipe),true,'the queued deletes');
is(/ROSTER_SAVED_KEY/.test(wipe),true,'the saved-roster fingerprint');
is(/ROSTER_REMOVED_KEY/.test(wipe),true,'the removed-here ledger');

console.log('\n=== 2. and it keeps what belongs to the phone ===');
is(/THEME_KEY/.test(wipe),false,'the theme is a preference of this phone, not team data');
is(/localStorage\.clear\(\)/.test(wipe),false,'named keys, never a blanket clear');

console.log('\n=== 3. THE SHEET IS NOT TOUCHED ===');
is(/pushDelete/.test(wipe),false,
   'no delete is sent: the record belongs to the league, not to this device');

if(fail){
  console.log('\n  wipeNow in this build does not disconnect. Nothing below can run.');
  console.log('\nFAILED '+fail+' of '+(pass+fail));
  process.exit(1);
}

console.log('\n=== 4. run it, against a real store ===');
var store={
  'pitchcount_v1':'{"roster":[{"id":"p1","name":"A B"}],"outings":[]}',
  'chalkside_sync_url':'https://script.google.com/macros/s/AAA/exec',
  'chalkside_ics_url':'https://example.invalid/s.ics',
  'chalkside_schedule_v1':'[{"date":"2026-09-22","title":"vs X","kind":"game"}]',
  'chalkside_team_name':'Testers',
  'chalkside_pending_deletes_v1':'["o1","o2"]',
  'chalkside_roster_saved_v1':'fingerprint',
  'chalkside_removed_here_v1':'["gone player"]',
  'chalkside_theme_v1':'dark',
  'chalkside_seeded_v1':'1'
};
global.localStorage={
  getItem:function(k){return k in store?store[k]:null;},
  setItem:function(k,v){store[k]=String(v);},
  removeItem:function(k){delete store[k];}
};
var DELQ_KEY='chalkside_pending_deletes_v1', SYNC_KEY='chalkside_sync_url',
    ICS_KEY='chalkside_ics_url', SCHED_KEY='chalkside_schedule_v1',
    TEAM_KEY='chalkside_team_name', ROSTER_SAVED_KEY='chalkside_roster_saved_v1',
    ROSTER_REMOVED_KEY='chalkside_removed_here_v1';
var S={roster:[{id:'p1',name:'A B'}],outings:[{id:'o1'}]};
var saved=false, rendered=false;
function save(){saved=true;}
function renderAll(){rendered=true;}
function pushDelete(){ throw new Error('wipeNow must not send a delete to the sheet'); }
eval(wipe);
wipeNow();

is(store['chalkside_sync_url'],undefined,'the sheet URL is gone');
is(store['chalkside_ics_url'],undefined,'the feed URL is gone');
is(store['chalkside_schedule_v1'],undefined,'the cached schedule is gone');
is(store['chalkside_team_name'],undefined,'the team name is gone');
is(store['chalkside_pending_deletes_v1'],undefined,'the delete queue is gone, not sent');
is(store['chalkside_roster_saved_v1'],undefined,'the fingerprint is gone');
is(store['chalkside_removed_here_v1'],undefined,'the ledger is gone');
is(store['chalkside_theme_v1'],'dark','the theme survives');
is(store['chalkside_seeded_v1'],'1','the dead seeding key is left alone, per CLAUDE.md');
is(S.roster.length,0,'the roster is empty');
is(S.outings.length,0,'the outings are gone');
is(saved&&rendered,true,'it saved and re-rendered');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
