/* Transparent ray-marched material, with a static CSS shape as the first render. */
(function () {
  'use strict';
  var motion=window.GagarinMotion;
  if (!motion) return;
  var canvases=Array.prototype.slice.call(document.querySelectorAll('canvas[data-liquid]'));
  if (!canvases.length) return;
  var shaderURL='/bygagarin-portfolio/assets/materia.frag?v=20261117-final';
  var source=null,mode=0,paused=false,states=[];
  var vertex='attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';
  function fragmentSource() {
    if (!source) source=fetch(shaderURL).then(function (response) {if (!response.ok) throw Error('Shader unavailable');return response.text();});
    return source;
  }
  function compile(gl,type,code) {
    var shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {var message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Shader compilation failed: '+message);}
    return shader;
  }
  function resize(state) {
    var rect=state.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var ratio=Math.min(devicePixelRatio||1,state.coarse?1.25:1.5)*state.quality;
    var budget=state.coarse?600000:950000;
    ratio=Math.min(ratio,Math.sqrt(budget/(rect.width*rect.height)));
    var width=Math.max(1,Math.min(1536,Math.round(rect.width*ratio)));
    var height=Math.max(1,Math.min(1536,Math.round(rect.height*ratio)));
    if (state.canvas.width!==width || state.canvas.height!==height) {
      state.canvas.width=width;state.canvas.height=height;
      if (state.gl) state.gl.viewport(0,0,width,height);
    }
    state.width=rect.width;state.height=rect.height;
  }
  function initialize(state) {
    if (state.initializing || state.failed || state.lost) return;
    state.initializing=true;
    var gl=(new URLSearchParams(location.search).get('graphics')==='off') ? null : state.gl || state.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    if (!gl) {state.failed=true;state.initializing=false;state.surface.dataset.renderer='static';staticHelp();sync();return;}
    state.gl=gl;
    fragmentSource().then(function (fragment) {
      if (state.lost) {state.initializing=false;return;}
      var precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
      if (!precision || !precision.precision) fragment=fragment.replace('precision highp float','precision mediump float');
      var vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Shader linking failed');
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
      var buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      var position=gl.getAttribLocation(program,'a_pos');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      state.program=program;state.uniform={};
      ['u_resolution','u_time','u_mouse','u_mode','u_pulse','u_energy'].forEach(function (key) {state.uniform[key]=gl.getUniformLocation(program,key);});
      state.initialized=true;state.initializing=false;state.surface.dataset.renderer='webgl';resize(state);state.job.wake();
    }).catch(function (error) {
      state.surface.dataset.renderer='static';state.surface.dataset.renderError=error.message;staticHelp();
      state.failed=true;state.initializing=false;state.surface.classList.remove('liquid-ready');
      if (state.gl) {var extension=state.gl.getExtension('WEBGL_lose_context');if (extension) extension.loseContext();}
    });
  }
  function staticHelp() {var help=document.getElementById('materia-help');if (help) help.textContent='This browser shows a static form. You can choose a different state or open the full version.';}
  function wake() {states.forEach(function (state) {state.job.wake();});}
  function sync() {
    document.querySelectorAll('[data-liquid-mode]').forEach(function (button) {var active=Number(button.dataset.liquidMode)===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('[data-liquid-pause]').forEach(function (button) {var stopped=paused||motion.reduced();button.setAttribute('aria-pressed',String(stopped));button.textContent=stopped?'CONTINUE':'PAUSE';button.setAttribute('aria-label',stopped?'Continue Matter\'s motion':'Pause the motion of MATTER');button.hidden=states.length>0 && states.every(function (state) {return state.failed;});button.disabled=motion.reduced();if (motion.reduced()) button.textContent='NO MOTION';});
    states.forEach(function (state) {state.surface.setAttribute('data-material-mode',String(mode));});
  }
  function selectMode(value) {mode=value;states.forEach(function (state) {state.pulse=state.time;state.energy=1.1;});sync();wake();}
  canvases.forEach(function (canvas) {
    var surface=canvas.closest('[data-liquid-surface]');
    var weak=(navigator.hardwareConcurrency && navigator.hardwareConcurrency<=4)||(navigator.deviceMemory && navigator.deviceMemory<=4);
    var state={canvas:canvas,surface:surface,gl:null,initialized:false,initializing:false,failed:false,lost:false,coarse:matchMedia('(pointer:coarse)').matches,quality:weak ? .8 : 1,time:0,pulse:-99,energy:0,x:0,y:0,tx:0,ty:0,width:1,height:1,last:0,samples:0,average:33};
    state.job=motion.watch(surface,function (now,dt,reduced) {
      if (state.lost || state.failed) return false;
      if (!state.initialized) {initialize(state);return false;}
      var delta=state.last ? now-state.last : 33;state.last=now;
      if (!paused && !reduced) state.time+=Math.min(delta,55)/1000;
      if (state.last && delta<140 && delta>8 && !paused && !reduced) {
        state.average=state.average*.95+delta*.05;state.samples++;
        if (state.samples>=50) {
          if (state.average>52 && state.quality>.6) {state.quality=Math.max(.6,state.quality*.86);resize(state);}
          else if (state.average<36 && state.quality<1) {state.quality=Math.min(1,state.quality+.06);resize(state);}
          state.samples=0;
        }
      }
      state.x+=(state.tx-state.x)*.1;state.y+=(state.ty-state.y)*.1;state.energy*=.94;
      var gl=state.gl,u=state.uniform;
      gl.useProgram(state.program);gl.uniform2f(u.u_resolution,canvas.width,canvas.height);gl.uniform1f(u.u_time,state.time);
      gl.uniform2f(u.u_mouse,reduced?0:state.x*.9,reduced?0:state.y*.9);gl.uniform1f(u.u_mode,mode);gl.uniform1f(u.u_pulse,state.pulse);gl.uniform1f(u.u_energy,state.energy);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
      surface.classList.add('liquid-ready');
      return !paused && !reduced;
    },30);
    function pointer(event) {var r=surface.getBoundingClientRect();state.tx=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));state.ty=Math.max(-1,Math.min(1,1-(event.clientY-r.top)/r.height*2));if (!paused) state.job.wake();}
    surface.addEventListener('pointermove',pointer,{passive:true});
    surface.addEventListener('pointerleave',function () {state.tx=0;state.ty=0;if (!paused) state.job.wake();});
    function impulse() {state.pulse=state.time;state.energy=1.3;state.job.wake();}
    surface.addEventListener('click',impulse);
    surface.addEventListener('keydown',function (event) {
      if (event.key==='Enter' || event.key===' ') {event.preventDefault();impulse();}
      if (/^[123]$/.test(event.key)) {event.preventDefault();selectMode(Number(event.key)-1);}
    });
    canvas.addEventListener('webglcontextlost',function (event) {event.preventDefault();state.lost=true;state.initialized=false;surface.classList.remove('liquid-ready');state.job.sleep();});
    canvas.addEventListener('webglcontextrestored',function () {state.lost=false;state.failed=false;state.initializing=false;initialize(state);});
    if (window.ResizeObserver) new ResizeObserver(function () {resize(state);state.job.wake();}).observe(surface);
    else addEventListener('resize',function () {resize(state);state.job.wake();},{passive:true});
    states.push(state);
  });
  document.querySelectorAll('[data-liquid-mode]').forEach(function (button) {button.addEventListener('click',function () {selectMode(Number(button.dataset.liquidMode));});});
  document.querySelectorAll('[data-liquid-pause]').forEach(function (button) {button.addEventListener('click',function () {paused=!paused;states.forEach(function (state) {state.last=0;});sync();wake();});});
  document.addEventListener('gagarin:motion',function () {states.forEach(function (state) {state.last=0;});sync();wake();});
  sync();
}());
