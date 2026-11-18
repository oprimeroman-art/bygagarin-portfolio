/* One scheduler for optional motion. No animation frames run outside visible work. */
(function () {
  'use strict';
  if (!window.CSS || !CSS.supports('display', 'grid') || !window.Promise || !window.matchMedia || !window.requestAnimationFrame) return;
  document.documentElement.classList.add('enhanced');
  var preference = matchMedia('(prefers-reduced-motion: reduce)');
  var jobs = [], frame = 0, manual = false;
  try { manual = localStorage.getItem("gagarin-reduced-motion") === "1"; } catch (error) {}
  function reduced() { return preference.matches || manual; }
  function allowed(job) { return job.visible && !document.hidden && job.awake; }
  function schedule() {
    if (!frame && jobs.some(allowed)) frame = requestAnimationFrame(tick);
  }
  function tick(time) {
    frame = 0;
    jobs.forEach(function (job) {
      if (!allowed(job) || time - job.last < 1000 / job.fps) return;
      var dt = Math.min(50, time - job.last || 16);
      job.last = time;
      var again = job.draw(time, dt, reduced());
      job.awake = !reduced() && again !== false;
    });
    schedule();
  }
  var observer = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      jobs.filter(function (job) { return job.element === entry.target; }).forEach(function (job) {
        job.visible = entry.isIntersecting;
        if (job.visible) job.awake = true;
      });
    });
    schedule();
  }, { rootMargin: '30px' }) : null;
  function watch(element, draw, fps) {
    var job = { element:element, draw:draw, fps:fps || 30, last:0, visible:!observer, awake:true };
    jobs.push(job);
    if (observer) observer.observe(element);
    schedule();
    return {
      wake:function () { job.awake = true; schedule(); },
      sleep:function () { job.awake = false; },
      destroy:function () { jobs = jobs.filter(function (candidate) { return candidate !== job; }); if (observer) observer.unobserve(element); }
    };
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    jobs.forEach(function (job) { job.awake = true; job.last = 0; });
    document.documentElement.classList.toggle('motion-reduced', reduced());
    document.documentElement.classList.toggle('page-hidden', document.hidden);
    schedule();
    document.dispatchEvent(new CustomEvent('gagarin:motion'));
  }
  document.addEventListener('visibilitychange', sync);
  if (preference.addEventListener) preference.addEventListener('change', sync);
  else preference.addListener(sync);
  window.GagarinMotion = { watch:watch, reduced:reduced };
  document.addEventListener('DOMContentLoaded', function () {
    var buttons = document.querySelectorAll('[data-motion-toggle]');
    function labels() { Array.prototype.forEach.call(buttons,function (button) { button.textContent = reduced() ? 'MOTION REDUCED' : 'REDUCE MOTION'; button.setAttribute('aria-pressed',String(reduced())); button.disabled = preference.matches; }); }
    Array.prototype.forEach.call(buttons,function (button) { button.addEventListener('click',function () { manual = !manual; try {localStorage.setItem('gagarin-reduced-motion',manual ? '1' : '0');} catch (error) {} sync(); labels(); }); });
    document.addEventListener('gagarin:motion',labels); labels();
  });
  document.documentElement.classList.toggle('motion-reduced', reduced());
    document.documentElement.classList.toggle('page-hidden', document.hidden);
}());
