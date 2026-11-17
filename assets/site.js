(function(){'use strict';
var menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.navlinks');
if(menu&&nav){menu.addEventListener('click',function(){var open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open?'true':'false');menu.textContent=open?'Закрыть':'Меню'});nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Меню'})});}
var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var targets=[].slice.call(document.querySelectorAll('[data-animate],.section-head,.section .case,.mosaic-item,.featured-project,.process-step,.portfolio-project-image,.bio-photo-banner'));
if(!reduced&&'IntersectionObserver'in window){var observer=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target)}})},{threshold:.08,rootMargin:'0px 0px -35px 0px'});targets.forEach(function(el){el.classList.add('will-reveal');observer.observe(el)})}
var prog=document.createElement('div');prog.className='reading-progress';prog.setAttribute('aria-hidden','true');document.body.appendChild(prog);
var hero=document.querySelector('.site-hero .hero-photograph'),raf=0;
function update(){raf=0;var max=document.documentElement.scrollHeight-window.innerHeight;var y=window.pageYOffset||0;prog.style.width=(max>0?(y/max*100):0).toFixed(2)+'%';if(hero&&!reduced&&y<950)hero.style.setProperty('--scroll-shift',(Math.min(150,y*.14)).toFixed(1)+'px')}
window.addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(update)},{passive:true});window.addEventListener('resize',function(){if(!raf)raf=requestAnimationFrame(update)},{passive:true});update();
var panel=document.getElementById('solution-panel');document.querySelectorAll('.problem-option').forEach(function(btn){btn.addEventListener('click',function(){if(panel&&!reduced){panel.classList.remove('is-changing');void panel.offsetWidth;panel.classList.add('is-changing')}})});
})();