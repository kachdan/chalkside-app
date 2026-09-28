/* roster_t, rebuilt under CHALK-148. PARSING A PASTED TEAM SHEET.
 *
 * A coach pastes whatever his league sent him. The parser's job is to read what
 * it can and SAY what it could not, never to invent a player.
 */
var H=require('./harness.js');
var app=H.appSource();

var pass=0,fail=0;
function is(got,want,what){
  var g=JSON.stringify(got),w=JSON.stringify(want);
  if(g===w){pass++;console.log('  PASS  '+what);}
  else{fail++;console.log('  FAIL  '+what+'\n          got  '+g+'\n          want '+w);}
}

eval(H.constLine(app,'SEP'));
eval(H.grab(app,'flipLastFirst'));
eval(H.grab(app,'parseRosterLine'));
eval(H.grab(app,'parseRoster'));
eval(H.grab(app,'splitName'));

function one(line){ return parseRosterLine(line); }
function names(text){ return parseRoster(text).good.map(function(g){return g.number+'|'+g.name;}); }

console.log('=== 1. the number, leading or trailing ===');
is(one('11 Abe Marlow'),{ok:true,number:'11',name:'Abe Marlow'},'"11 Abe Marlow"');
is(one('#11 Abe Marlow'),{ok:true,number:'11',name:'Abe Marlow'},'a hash is decoration');
is(one('Abe Marlow 11'),{ok:true,number:'11',name:'Abe Marlow'},'trailing number');
is(one('Abe Marlow #11'),{ok:true,number:'11',name:'Abe Marlow'},'trailing with a hash');
is(one('11, Abe Marlow'),{ok:true,number:'11',name:'Abe Marlow'},'a comma between');
is(one('11 - Abe Marlow'),{ok:true,number:'11',name:'Abe Marlow'},'a dash between');

console.log('\n=== 2. THE LEADING ZERO SURVIVES ===');
is(one('01 Abe Marlow').number,'01','01 stays 01, it is not a number');
is(one('Abe Marlow 01').number,'01','and trailing too');
is(one('07 Abe Marlow').number,'07','07 as well');

console.log('\n=== 3. no number at all ===');
is(one('Abe Marlow'),{ok:true,number:'',name:'Abe Marlow'},'a bare name is fine');

console.log('\n=== 4. "Last, First" is flipped ===');
is(one('Marlow, Abe').name,'Abe Marlow','"Marlow, Abe" reads as Abe Marlow');
is(one('11 Marlow, Abe').name,'Abe Marlow','with a number too');

console.log('\n=== 5. A DIVIDER IS NOT A PLAYER ===');
is(one('--- Pitchers ---').ok,false,'a divider is refused');
is(one('-- Pitchers').ok,false,'and a half one');
is(one('12345').ok,false,'digits with no name are refused');
is(one('   '),null,'a blank line is ignored rather than refused');
is(one(''),null,'and an empty one');

console.log('\n=== 6. what it could not read, it SAYS ===');
var res=parseRoster('11 Abe Marlow\n--- Pitchers ---\n7 Cy Denby\n999');
is(res.good.length,2,'two players read');
is(res.bad.length,2,'two lines refused');
is(res.bad[0].why!==undefined,true,'and each refusal carries a reason');
is(names('11 Abe Marlow\n--- Pitchers ---\n7 Cy Denby\n999'),
   ['11|Abe Marlow','7|Cy Denby'],'the good ones come through in order');

console.log('\n=== 7. messy whitespace and line endings ===');
is(one('  11   Abe   Marlow  ').name,'Abe Marlow','runs of spaces collapse');
is(parseRoster('11 Abe Marlow\r\n7 Cy Denby').good.length,2,'CRLF splits correctly');
is(parseRoster('\n\n11 Abe Marlow\n\n').good.length,1,'blank lines do not become players');

console.log('\n=== 8. splitName, which is what the sheet gets ===');
is(splitName('Abe Marlow'),{first:'Abe',last:'Marlow'},'first and last');
is(splitName('Abe van der Marlow'),{first:'Abe',last:'van der Marlow'},
   'everything after the first space is the last name');
is(splitName('Abe'),{first:'Abe',last:''},'one word');
is(splitName(''),{first:'',last:''},'nothing');

console.log('\n'+(fail?('FAILED '+fail+' of '+(pass+fail)):('ALL '+pass+' PASSED')));
process.exit(fail?1:0);
