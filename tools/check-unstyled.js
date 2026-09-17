/* Run this in the browser console, or through automation, on every screen.
 * It reports any element that is painting the BROWSER's default control colour
 * rather than one of ours.
 *
 * WHY THIS EXISTS. Three times the same bug: .who .swap reused in the CHALK-110
 * state line, then .seg reused for the CHALK-109 share date pills. A class
 * whose only rule lives under a parent selector, reused where that parent does
 * not exist, gets no author background and the UA paints buttonface. In Light
 * that is rgb(239,239,239) against #F4F5F7 and no eye will catch it. In Dark it
 * is a white box on a black sheet.
 *
 * WHY IT IS NOT STATIC. I wrote the static version first. It flagged .fab, .inn,
 * .prow and .wide, and all four were correct code: two are always paired with a
 * class that does provide a background, two never leave their scoping parent.
 * Telling the difference needs the ancestor chain, which for JS-built markup
 * means running the page. A check that cries wolf is one people learn to skip.
 *
 * This is the other kind of check. Static tools catch ordering and name faults;
 * the browser catches resolution and paint faults. Neither substitutes for the
 * other.
 */
(function(){
  var UA = ['rgb(239, 239, 239)','rgba(239, 239, 239, 1)','buttonface','ButtonFace'];
  var screens = ['count','team','log','batting','settings'];
  var hits = [];
  screens.forEach(function(name){
    if (typeof go === 'function') go(name);
    document.body.offsetHeight;                     /* force the recalc */
    var host = document.getElementById('s-' + name);
    if (!host) return;
    var nodes = host.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], cs = getComputedStyle(n);
      if (UA.indexOf(cs.backgroundColor) < 0) continue;
      if (!n.className || typeof n.className !== 'string') continue;
      hits.push(name + '  <' + n.tagName.toLowerCase() + ' class="' + n.className + '">  ' + cs.backgroundColor);
    }
  });
  /* the sheet is not inside a screen, so it is walked separately */
  var sheet = document.getElementById('sheetInner');
  if (sheet) {
    var sn = sheet.querySelectorAll('*');
    for (var j = 0; j < sn.length; j++) {
      var e = sn[j], c = getComputedStyle(e);
      if (UA.indexOf(c.backgroundColor) > -1 && typeof e.className === 'string' && e.className) {
        hits.push('sheet  <' + e.tagName.toLowerCase() + ' class="' + e.className + '">  ' + c.backgroundColor);
      }
    }
  }
  return hits.length ? ('UNSTYLED, PAINTING THE BROWSER DEFAULT:\n  ' + hits.join('\n  '))
                     : 'no element is painting the browser default control colour';
})();
