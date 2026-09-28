/* CHALK-153. The status is the answer; the name is only how you find the line.
 *
 * The requirement that is not negotiable: THREE SHAPES, NOT THREE COLOURS.
 * A coach with a colour vision deficiency has to get the same answer, so the
 * icon carries the state and the colour agrees with it.
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
var iconSrc=grabOr('statusIcon'), cellSrc=grabOr('statusCell'),
    histSrc=grabOr('historyLine'), fitSrc=grabOr('fitHistoryLines'),
    daysSrc=grabOr('recentPitchingDays'), dayLabelSrc=grabOr('dayLabel');
is(iconSrc!=='',true,'statusIcon');
is(cellSrc!=='',true,'statusCell');
is(histSrc!==''&&daysSrc!==''&&dayLabelSrc!=='',true,'the history line');
is(fitSrc!=='',true,'the fitter');
if(fail){ console.log('\n  This build has no status row.\n\nFAILED '+fail+' of '+(pass+fail)); process.exit(1); }

eval(iconSrc);
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
eval(cellSrc);

console.log('\n=== 1. THREE SHAPES, one per state ===');
function shapeOf(cls){
  var svg=statusIcon(cls);
  if(svg.indexOf('<circle')<0) return 'check';
  return /12\.8|5\.6 5\.6/.test(svg)?'ban':'clock';
}
is(shapeOf('ok'),'check','clear is a tick');
is(shapeOf('warn'),'clock','back before the next game is a clock');
is(shapeOf('no'),'ban','missing the next game is a barred circle');
var shapes=['ok','warn','no'].map(shapeOf);
is(shapes.length,new Set(shapes).size,'all three are DIFFERENT shapes, not one shape in three colours');

console.log('\n=== 2. the icon LEADS, and there is no chip ===');
var cell=statusCell({cls:'ok',tag:'Available'});
is(cell.indexOf('<svg')<cell.indexOf('Available'),true,
   'informational icon leads its label; a trailing one would read as an action');
is(/class="tag/.test(cell),false,'no chip class');
is(/background/.test(app.slice(app.indexOf('.status{'),app.indexOf('.status svg'))),false,
   'and the .status rule paints no fill');

console.log('\n=== 3. shape and colour cannot disagree ===');
is(/statusIcon\(av\.cls\)/.test(cellSrc)&&/class="status '\+av\.cls/.test(cellSrc),true,
   'both are keyed off the SAME cls the rules engine returned');
is(/pitchEligibility|availability\(/.test(iconSrc+cellSrc),false,
   'and nothing about eligibility is re-derived here');

console.log('\n=== 4. the history line ===');
is(/pitches/.test(histSrc),true,'"pitches" is spelled out, since a bare number reads as a jersey');
is(histSrc.indexOf('dayLabel')<histSrc.indexOf('pitches'),true,
   'DAY first, so two of them read as a series rather than needing parsing');
is(/Has not pitched/.test(histSrc),true,'never an empty line');
is(/psub.*none|none.*psub/.test(app),true,'and the empty state has its own tertiary class');

console.log('\n=== 5. one line, never two ===');
var psubCss=app.slice(app.indexOf('.prow .psub{'),app.indexOf('.prow .psub{')+400);
is(/white-space:nowrap/.test(psubCss),true,'the sub line does not wrap');
is(/scrollWidth/.test(fitSrc)&&/clientWidth/.test(fitSrc),true,
   'and whether two days fit is asked of the RENDERED width, not computed from the string');

console.log('\n=== 6. the on-control colours, which the chip used to hide ===');
is(/--status-safe-on-control/.test(app),true,'safe has an on-control value');
is(/--status-caution-on-control/.test(app),true,'caution has one');
is(/\.status\.ok\{color:var\(--status-safe-on-control\)/.test(app),true,'and the status uses them');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
