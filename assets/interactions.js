/* Small reactions belong to the existing text, cards and reading flow. */
(function () {
  'use strict';
  var motion = window.GagarinMotion;
  if (!motion) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var all = function (selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); };

  // The heading's punctuation has weight, but never shifts the line around it.
  var dot = document.querySelector('.cover-title .dot');
  if (dot && !motion.reduced()) {
    var x=0,y=0,vx=0,vy=0,tx=0,ty=0;
    var spring=motion.watch(dot,function (time,dt,reduced) {
      if (reduced) { dot.style.transform=''; return false; }
      var step=dt/16;
      vx=(vx+(tx-x)*.13*step)*.72; vy=(vy+(ty-y)*.13*step)*.72;
      x+=vx*step; y+=vy*step;
      dot.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) scale('+(1+Math.abs(vx)*.018).toFixed(3)+')';
      return Math.abs(vx)+Math.abs(vy)+Math.abs(tx-x)+Math.abs(ty-y)>.04;
    },60);
    var line=dot.closest('.title-line');
    line.addEventListener('pointermove',function (e) {
      if (!fine) return;
      var r=dot.getBoundingClientRect();
      tx=Math.max(-8,Math.min(8,(e.clientX-r.left-r.width/2)*.08));
      ty=Math.max(-6,Math.min(6,(e.clientY-r.top-r.height/2)*.12));spring.wake();
    },{passive:true});
    line.addEventListener('pointerleave',function () {tx=0;ty=0;spring.wake();});
    dot.addEventListener('pointerdown',function () {vx=5;vy=-7;spring.wake();},{passive:true});
    spring.sleep();
  }

  // The highlight follows the hand; links keep their normal target and hit area.
  all('.portfolio-card,.directory-link,.inner-body .card,.notes-links>a').forEach(function (card) {
    card.setAttribute('data-motion-card','');
    if (!fine) return;
    var pending=0,px=50,py=50;
    card.addEventListener('pointermove',function (e) {
      if (motion.reduced()) return;
      var r=card.getBoundingClientRect();px=(e.clientX-r.left)/r.width*100;py=(e.clientY-r.top)/r.height*100;
      if (!pending) pending=requestAnimationFrame(function () {pending=0;card.style.setProperty('--spot-x',px+'%');card.style.setProperty('--spot-y',py+'%');});
    },{passive:true});
    card.addEventListener('pointerleave',function () {card.style.removeProperty('--spot-x');card.style.removeProperty('--spot-y');});
  });
  all('.pill-action,.liquid-mode,.index-filter').forEach(function (element) {
    element.addEventListener('pointerdown',function (event) {
      if (motion.reduced()) return;
      var r=element.getBoundingClientRect(),ripple=document.createElement('span');
      ripple.className='motion-ripple';ripple.setAttribute('aria-hidden','true');
      ripple.style.left=(event.clientX-r.left)+'px';ripple.style.top=(event.clientY-r.top)+'px';
      element.appendChild(ripple);ripple.addEventListener('animationend',function () {ripple.remove();},{once:true});
      setTimeout(function () {ripple.remove();},700);
    },{passive:true});
  });

  // Timeline connections follow the paragraph currently being read.
  var timeline=document.querySelector('.bio-timeline');
  if (timeline && window.IntersectionObserver) {
    var panels=all('.bio-timeline .panel[id]'),links=all('[data-timeline-link]');
    var reading=new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        panels.forEach(function (panel) {panel.classList.toggle('reading',panel===entry.target);});
        links.forEach(function (link) {
          var active=link.getAttribute('data-timeline-link')===entry.target.id;
          if (active) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
        });
      });
    },{rootMargin:'-15% 0px -55% 0px'});
    panels.forEach(function (panel) {reading.observe(panel);});
  }

  // Page progress is event driven, with no idle loop.
  var mast=document.querySelector('.mast');
  if (mast) {
    var progress=document.createElement('span');progress.className='mast-progress';progress.setAttribute('aria-hidden','true');mast.appendChild(progress);
    var scheduled=false;
    function update() {scheduled=false;var max=document.documentElement.scrollHeight-innerHeight;progress.style.transform='scaleX('+(max>0?Math.max(0,Math.min(1,scrollY/max)):0)+')';}
    addEventListener('scroll',function () {if (!scheduled) {scheduled=true;requestAnimationFrame(update);}},{passive:true});
    addEventListener('resize',update,{passive:true});update();
  }
}());
