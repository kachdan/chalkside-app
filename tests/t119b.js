var fs=require('fs');
var H=require('./harness.js');
var app=H.appSource();
/* The Apps Script deliverable is NOT in this repo and its location is not this
   repo's business. Point GAS at it to run the half of this suite that checks
   the script; without it the suite says so and exits rather than passing. */
var gasPath=process.env.GAS;
if(!gasPath){
  console.log('SKIPPED: set GAS=/path/to/chalkside-apps-script-clear-date.js to run this suite.');
  console.log('It checks the app and the Apps Script agree, so it cannot run on the app alone.');
  process.exit(0);
}
var gas=fs.readFileSync(gasPath,'utf8');
function grab(src,n){var i=src.indexOf('function '+n+'(');if(i<0)throw new Error('missing '+n);
  var d=0;for(var k=src.indexOf('{',i);k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}

var HEAD=['Date','Number','Name','Pitches','Opponent','Clear to pitch','Logged at','Id'];
var rows=[HEAD.slice()];
function Sheet(){}
Sheet.prototype.getLastColumn=function(){return HEAD.length;};
Sheet.prototype.getRange=function(r,c,nr,nc){nr=nr||1;nc=nc||1;return {
  getValues:function(){var o=[];for(var i=0;i<nr;i++){var q=[];for(var j=0;j<nc;j++)q.push((rows[r-1+i]||[])[c-1+j]);o.push(q);}return o;},
  setValue:function(v){ rows[r-1][c-1]=v; }};};
Sheet.prototype.getDataRange=function(){return this.getRange(1,1,rows.length,HEAD.length);};
global.SHEET_ID='x';
global.SpreadsheetApp={openById:function(){return {getSheetByName:function(){return new Sheet();}};}};
/* The real findRowById takes (sheet, id) and returns a 1-based sheet row, or
   -1 when absent. The SIGNATURE is the point: this double was written with one
   argument, which is exactly the bug that shipped in the deliverable, and it
   made all eight restate assertions fail against correct code. A double with
   the wrong signature is a second copy of the same mistake. */
function findRowById(sh,id){ for(var r=1;r<rows.length;r++) if(rows[r][7]===id) return r+1; return -1; }
eval(grab(gas,'chalksideClearCol'));
eval(grab(gas,'chalksideRestateClear'));

function pad(n){return n<10?'0'+n:''+n;}
function parseD(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function addDays(s,n){var d=parseD(s);d.setDate(d.getDate()+n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
var MAX=75, BRACKETS=[{max:30,days:0},{max:45,days:1},{max:60,days:2},{max:9999,days:3}];
eval(grab(app,'restDays')); eval(grab(app,'eligibleDate'));
eval(grab(app,'sheetField')); eval(grab(app,'planClearFix'));
var S={roster:[{id:'p1',name:'Alpha One',number:'11'}],outings:[]};
eval(grab(app,'restateRows')); eval(grab(app,'restateFor'));

function logOuting(pid,date,pitches){
  var rec={id:'o'+(rows.length),pitcherId:pid,date:date,pitches:pitches};
  S.outings.push(rec);
  var p=S.roster.filter(function(r){return r.id===pid;})[0];
  rows.push([date,p?p.number:'',p?p.name:'Unknown',pitches,'',eligibleDate(date,0),'now',rec.id]);
  var restate=restateRows(pid,date);                       /* what outingPayload sends */
  if(restate) chalksideRestateClear('Game Log',restate.rows);
  return rec;
}
function deleteOuting(id){
  var gone=S.outings.filter(function(o){return o.id===id;})[0];
  S.outings=S.outings.filter(function(o){return o.id!==id;});
  for(var r=1;r<rows.length;r++) if(rows[r][7]===id){ rows.splice(r,1); break; }
  var restate=restateFor(gone);
  if(restate) chalksideRestateClear('Game Log',restate.rows);
  return restate;
}
function clears(){ return rows.slice(1).map(function(r){return r[3]+' -> '+r[5];}); }

var pass=0,fail=0;
function is(g,w,l){var ok=JSON.stringify(g)===JSON.stringify(w);
  console.log((ok?'  PASS  ':'  FAIL  ')+l+(ok?'':'\n          got  '+JSON.stringify(g)+'\n          want '+JSON.stringify(w)));ok?pass++:fail++;}

console.log('\n=== 1. write path, 40 then 30 ===');
logOuting('p1','2026-09-14',40);
is(clears(),['40 -> 2026-09-16'],'40 alone, 1 day');
logOuting('p1','2026-09-14',30);
is(clears(),['40 -> 2026-09-18','30 -> 2026-09-18'],'both rows corrected by id');

console.log('\n=== 2. delete direction ===');
deleteOuting('o2');
is(clears(),['40 -> 2026-09-16'],'survivor reverted to 1 day');
is(deleteOuting('o1'),null,'deleting the last gives restate null');
is(rows.length,1,'and no rows remain');

console.log('\n=== 3. THE EDGE THAT MOTIVATED THIS: player off the roster ===');
rows=[HEAD.slice()]; S.outings=[];
logOuting('p1','2026-09-20',40); logOuting('p1','2026-09-20',30);
is(clears(),['40 -> 2026-09-24','30 -> 2026-09-24'],'70 for the day');
S.roster=[];                                    /* he is removed; outings stay */
var r=deleteOuting('o2');
is(!!r,true,'restate is NOT null any more, because no name is needed');
is(r.rows.length,1,'it names the one surviving row by id');
is(clears(),['40 -> 2026-09-22'],'and the survivor corrected. v11 left this stale.');

console.log('\n=== 4. a renamed player, which also broke name matching ===');
rows=[HEAD.slice()]; S.outings=[]; S.roster=[{id:'p1',name:'Alpha One',number:'11'}];
logOuting('p1','2026-09-25',50); logOuting('p1','2026-09-25',20);
rows[1][2]='Alpha One-Smith';                   /* a typo corrected in the sheet */
S.roster[0].name='Alpha One-Smith';
deleteOuting('o2');
is(clears(),['50 -> 2026-09-28'],'still corrected, the name is irrelevant');

console.log('\n=== 5. an id the sheet never had is a no-op, not an error ===');
var res=chalksideRestateClear('Game Log',[{id:'never',eligible:'2026-01-01'}]);
is([res.ok,res.updated,res.missing],[true,0,1],'ok true, nothing updated, counted as missing');

console.log('\n=== 6. the one time pass, now sending ids ===');
rows=[HEAD.slice(),
  ['2026-09-14','11','Alpha One',40,'','2026-09-16','x','a1'],
  ['2026-09-14','11','Alpha One',30,'','2026-09-16','x','a2'],
  ['2026-09-21','11','Alpha One',20,'','2026-09-22','x','a3']];
function listed(){ return rows.slice(1).map(function(r){var o={};HEAD.forEach(function(h,i){o[h]=r[i];});return o;}); }
var plan=planClearFix(listed());
is(plan.fix.length,1,'one player-day to correct');
is(plan.fix[0].ids,['a1','a2'],'and it carries the row IDS, not just a count');
var flat=[]; plan.fix.forEach(function(f){ f.ids.forEach(function(id){ flat.push({id:id,eligible:f.eligible}); }); });
chalksideRestateClear('Game Log',flat);
is(rows.slice(1).map(function(r){return r[5];}),['2026-09-18','2026-09-18','2026-09-22'],'all three correct after the pass');
is(planClearFix(listed()).fix.length,0,'re-running finds nothing: idempotent');
is(rows.slice(1).map(function(r){return r[7];}),['a1','a2','a3'],'ids untouched throughout');

console.log('\n'+(fail?'FAILED '+fail+' of '+(pass+fail):'ALL '+pass+' PASSED'));
process.exit(fail?1:0);
