/* CHALK-157. Compares every icon the app ships against the PINNED Lucide
 * release, character for character.
 *
 * WHY. The clock and the barred circle in this file were modified Lucide, r=9
 * instead of 10 and hands at "M12 7v5l3.5 2" instead of "M12 6v6l4 2". Nobody
 * sees that by eye, everybody copies it, and Figma and the app drifted apart in
 * both directions for weeks. An eye cannot hold a path; a diff can.
 *
 * It checks three things, and the third is the one that matters most:
 *   1. every Lucide-named icon matches tools/lucide-1.48.0/<name>.svg exactly
 *   2. every icon the app renders is NAMED, so it can be checked at all
 *   3. no icon carries a name that is not in the pinned set or the custom list
 *
 *     node tools/check-icons.js
 */
var fs=require('fs'), path=require('path');
var ROOT=path.join(__dirname,'..');
var APP=process.env.APP||path.join(ROOT,'docs','pitch-count.html');
var PINNED=path.join(__dirname,'lucide-1.48.0');
var CUSTOM=['baseball','home-plate','half-top','half-bottom'];

var app=fs.readFileSync(APP,'utf8');
var bad=0, checked=0;

function norm(s){
  return s.replace(/<!--[\s\S]*?-->/g,'')
          .replace(/\s*\/>/g,'/>')
          .replace(/>\s+</g,'><')
          .replace(/\s+/g,' ')
          .trim();
}
function pinnedBody(name){
  var f=path.join(PINNED,name+'.svg');
  if(!fs.existsSync(f)) return null;
  var m=/<svg[^>]*>([\s\S]*?)<\/svg>/.exec(fs.readFileSync(f,'utf8'));
  return m?norm(m[1]):null;
}

/* 1 + 3: the registry */
var reg=/var LUCIDE=\{([\s\S]*?)\n\};/.exec(app);
if(!reg){ console.log('FAIL: no LUCIDE registry in the app'); process.exit(1); }
var entries=reg[1].match(/'[a-z-]+':'(?:[^'\\]|\\.)*'/g)||[];
entries.forEach(function(e){
  var name=/^'([a-z-]+)'/.exec(e)[1];
  var body=norm(e.slice(e.indexOf(":'")+2,-1).replace(/\\'/g,"'"));
  var want=pinnedBody(name);
  checked++;
  if(want===null){ bad++; console.log('  FAIL  '+name+' is not in the pinned release'); return; }
  if(body!==want){
    bad++;
    console.log('  FAIL  '+name+' does not match the pinned file');
    console.log('        app    '+body);
    console.log('        1.48.0 '+want);
    return;
  }
  console.log('  ok    '+name);
});

/* 2: everything rendered is named, and the name is one we know */
var known={}; entries.forEach(function(e){ known[/^'([a-z-]+)'/.exec(e)[1]=true?/^'([a-z-]+)'/.exec(e)[1]:0]=true; });
CUSTOM.forEach(function(c){ known[c]=true; });

var svgs=app.match(/<svg[^>]*>/g)||[];
var unnamed=0;
svgs.forEach(function(tag){
  if(/data-icon=/.test(tag)) return;
  /* the registry's own emitter carries the attribute at run time */
  if(/'\+name\+'|data-icon="'\+/.test(tag)) return;
  unnamed++;
  console.log('  FAIL  an <svg> with no data-icon: '+tag.slice(0,80));
});
bad+=unnamed;

var names=(app.match(/data-icon="([a-z-]+)"/g)||[]).map(function(m){
  return m.replace('data-icon="','').replace('"','');
});
names.forEach(function(n){
  if(!known[n]){ bad++; console.log('  FAIL  unknown icon name "'+n+'"'); }
});

console.log('  ----');
console.log('  '+checked+' pinned icons compared, '+CUSTOM.length+' custom allowed, '+
            names.length+' named in markup');
if(bad){ console.log('  '+bad+' PROBLEM'+(bad===1?'':'S')); process.exit(1); }
console.log('  every icon matches Lucide 1.48.0');
