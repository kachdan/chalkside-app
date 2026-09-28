/* CHALK-156. The bottom bar order.
 *
 *     Team   Batting   [pitching]   Log   Settings
 *
 * The three on the left are the game, the two on the right are what you do with
 * the results, and Batting sits beside pitching because that is the pair he
 * switches between every half inning.
 *
 * The thing this guards is not the order itself, it is that NOTHING finds a tab
 * by position. A reorder is safe only while every lookup is by name.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}

var nav=app.slice(app.indexOf('<nav>'), app.indexOf('</nav>'));
var order=(nav.match(/data-go="([a-z]+)"/g)||[]).map(function(m){
  return m.replace('data-go="','').replace('"','');
});

console.log('=== 1. the order ===');
is(order,['team','batting','count','log','settings'],
   'Team, Batting, pitching, Log, Settings');
is(order.indexOf('count'),2,'the pitching button is the middle child, so it stays centred');
is(order.indexOf('batting'),order.indexOf('count')-1,'Batting sits next to pitching');

console.log('\n=== 2. and nothing finds a tab by POSITION ===');
is(/querySelectorAll\('nav button'\)\[\d/.test(app),false,'no indexed nav lookup');
is(/nav[^{]*:nth-child|nav[^{]*:nth-of-type/.test(app),false,'no nth-child in the nav CSS');
is(/dataset\.go/.test(app),true,'the click handler reads data-go');
is(/b\.dataset\.go===name/.test(app),true,'and the highlight matches on data-go too');

console.log('\n=== 3. every tab still has a screen of its own ===');
order.forEach(function(n){
  is(app.indexOf('id="s-'+n+'"')>-1,true,'there is a screen for '+n);
});

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
