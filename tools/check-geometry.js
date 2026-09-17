/* Run in the browser, on every screen. Reports children that render TALLER than
 * the parent box that is supposed to contain them.
 *
 * WHY. CHALK-132: unscoping .seg for the share pills leaked the pill's
 * min-height:30px and 12px side padding onto the four ribbon segments, which
 * live inside a 16px tall .bars. They overflowed and collided with the tick
 * labels. 144 assertions stayed green and the ribbon was visibly broken on a
 * phone, because a suite that asserts on VALUES cannot see geometry at all.
 *
 * This is the third kind of check. Static tools catch ordering and name faults.
 * check-unstyled.js catches colour resolution. This catches layout.
 *
 * Elements that are meant to scroll are skipped: overflow auto or scroll is a
 * deliberate statement that the child may be bigger.
 */
(function(){
  var screens = ['count','team','log','batting','settings'];
  var hits = [];
  function scan(root, label){
    var nodes = root.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++){
      var p = nodes[i], cs = getComputedStyle(p);
      if (cs.overflow !== 'visible' && cs.overflow !== '') continue;   /* scrollers opt out */
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') continue;
      if (cs.display === 'inline') continue;
      var ph = p.getBoundingClientRect().height;
      if (ph <= 0) continue;
      for (var j = 0; j < p.children.length; j++){
        var c = p.children[j];
        var ch = c.getBoundingClientRect().height;
        if (ch > ph + 1){
          hits.push(label + '  <' + c.tagName.toLowerCase() +
            (c.className && typeof c.className === 'string' ? ' class="' + c.className + '"' : '') +
            '> is ' + Math.round(ch) + 'px inside <' + p.tagName.toLowerCase() +
            (p.className && typeof p.className === 'string' ? ' class="' + p.className + '"' : '') +
            '> at ' + Math.round(ph) + 'px');
        }
      }
    }
  }
  screens.forEach(function(name){
    if (typeof go === 'function') go(name);
    document.body.offsetHeight;
    var host = document.getElementById('s-' + name);
    if (host) scan(host, name);
  });
  return hits.length ? ('CHILDREN OVERFLOWING THEIR PARENT:\n  ' + hits.join('\n  '))
                     : 'no child overflows its parent on any screen';
})();
