/* byGagarin — navigation, search and the site's existing tools. No framework. */
(function () {
  'use strict';
  var motion=window.GagarinMotion;
  if (!motion) return;
  var ROOT='/bygagarin-portfolio/',doc=document,body=doc.body;
  var $=function (s,root) {return (root||doc).querySelector(s);};
  var all=function (s,root) {return Array.prototype.slice.call((root||doc).querySelectorAll(s));};
  var canonicalPath=function (p) {return p.replace(/index\.html$/,'');};
  var current=canonicalPath(location.pathname);
  all('.dock-nav a').forEach(function (a) {
    var path=a.getAttribute('href');
    var active=path===ROOT ? current===ROOT : current.indexOf(path)===0;
    a.classList.toggle('active',active);
    if (active) a.setAttribute('aria-current','page');
  });
  all('.mobile-nav a,.foot-linkcols a').forEach(function (a) {
    if (canonicalPath(a.pathname)===current) a.setAttribute('aria-current','page');
  });

  var curtain=$('.route-curtain'),navigating=false;
  function clearTransition() {navigating=false;if (curtain) curtain.classList.remove('enter');}
  addEventListener('pageshow',clearTransition);
  doc.addEventListener('click',function (event) {
    var a=event.target.closest('a[href]');
    if (!a || a.hasAttribute('download') || a.target==='_blank' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button!==0) return;
    var url;
    try {url=new URL(a.href,location.href);} catch (error) {return;}
    if (url.origin!==location.origin || url.pathname.indexOf(ROOT)!==0 || url.href===location.href) return;
    if (url.pathname===location.pathname && url.hash) return;
    if (motion.reduced() || !curtain) return;
    event.preventDefault();
    if (navigating) return;
    navigating=true;curtain.classList.add('enter');
    setTimeout(function () {location.assign(url.href);},360);
  });

  // Dialogs share a focus boundary; all other page content remains inaccessible while open.
  var menu=$('.menu-trigger'),mobile=$('.mobile-nav'),command=$('#command');
  var modal=null,previousFocus=null;
  function backgroundInert(open,kind) {
    all('body>main,body>footer,body>.dock').forEach(function (e) {e.inert=open;});
    var mast=$('.mast');if (mast) mast.inert=open && kind==='search';
  }
  function focusables(container) {return all('a[href],button:not([disabled]),input,textarea,select,[tabindex="0"]',container).filter(function (e) {return e.getClientRects().length && !e.hidden;});}
  function closeMenu(restore) {
    if (!mobile || !menu) return;
    mobile.classList.remove('open');mobile.setAttribute('aria-hidden','true');mobile.inert=true;
    menu.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');
    body.classList.remove('menu-open');backgroundInert(false);modal=null;
    if (restore) menu.focus();
  }
  if (menu && mobile) {
    mobile.inert=true;
    menu.addEventListener('click',function () {
      if (mobile.classList.contains('open')) {closeMenu(true);return;}
      mobile.inert=false;mobile.classList.add('open');mobile.setAttribute('aria-hidden','false');
      menu.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Закрыть меню');
      body.classList.add('menu-open');modal='menu';backgroundInert(true,'menu');
      var first=$('a',mobile);if (first) first.focus();
    });
    all('a',mobile).forEach(function (a) {a.addEventListener('click',function () {closeMenu(false);});});
    addEventListener('resize',function () {if (innerWidth>680 && mobile.classList.contains('open')) closeMenu(false);},{passive:true});
  }

  if (!motion.reduced() && window.IntersectionObserver) {
    var reveal=new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {if (entry.isIntersecting) {entry.target.classList.add('visible');reveal.unobserve(entry.target);}});
    },{threshold:.03});
    all('[data-reveal]').forEach(function (e) {reveal.observe(e);});
  } else all('[data-reveal]').forEach(function (e) {e.classList.add('visible');});

  var searchInput=$('#command-input'),searchResults=$('#command-results'),matches=[],selected=0;
  var normalize=function (text) {return text.toLocaleLowerCase('ru').replace(/ё/g,'е').trim();};
  var escape=function (text) {return String(text).replace(/[&<>"']/g,function (c) {return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var index=window.GAGARIN_SEARCH || [];
  function renderSearch() {
    if (!searchInput || !searchResults) return;
    var query=normalize(searchInput.value),words=query.split(/\s+/);
    matches=index.map(function (item) {
      var title=normalize(item.title),text=normalize(item.text);
      var rank=!query ? item.priority||1 : title===query ? 100 : title.indexOf(query)>=0 ? 60 : words.every(function (word) {return (title+' '+text).indexOf(word)>=0;}) ? 20 : 0;
      return {item:item,rank:rank};
    }).filter(function (entry) {return entry.rank;}).sort(function (a,b) {return b.rank-a.rank;}).slice(0,query?27:9).map(function (entry) {return entry.item;});
    selected=Math.min(selected,Math.max(0,matches.length-1));
    searchResults.innerHTML=matches.length ? matches.map(function (item,i) {
      return '<a href="'+escape(item.url)+'" class="command-item'+(i===selected?' selected':'')+'" id="search-option-'+i+'" role="option" aria-selected="'+(i===selected)+'" tabindex="-1"><span class="cmd-no">'+String(i+1).padStart(2,'0')+'</span><span class="cmd-label">'+escape(item.title)+'</span><span class="cmd-tag">'+escape(item.section)+'</span><span class="cmd-arrow" aria-hidden="true">↗</span></a>';
    }).join('') : '<p class="command-empty" role="status">Ничего не нашлось. Попробуй другое слово.</p>';
    if (matches.length) searchInput.setAttribute('aria-activedescendant','search-option-'+selected);else searchInput.removeAttribute('aria-activedescendant');
  }
  function openSearch() {
    if (!command) return;
    if (modal==='menu') closeMenu(false);
    previousFocus=doc.activeElement;command.hidden=false;body.classList.add('menu-open');modal='search';backgroundInert(true,'search');
    searchInput.value='';selected=0;renderSearch();searchInput.focus();
  }
  function closeSearch(restore) {
    if (!command) return;
    command.hidden=true;body.classList.remove('menu-open');modal=null;backgroundInert(false);
    if (restore && previousFocus && previousFocus.focus) previousFocus.focus();
  }
  all('[data-command-open]').forEach(function (e) {e.addEventListener('click',openSearch);});
  all('[data-command-close]').forEach(function (e) {e.addEventListener('click',function () {closeSearch(true);});});
  if (searchInput) {
    searchInput.setAttribute('role','combobox');searchInput.setAttribute('aria-controls','command-results');searchInput.setAttribute('aria-expanded','true');searchInput.setAttribute('aria-autocomplete','list');
    searchResults.setAttribute('role','listbox');searchResults.setAttribute('aria-label','Страницы сайта');
    searchInput.addEventListener('input',function () {selected=0;renderSearch();});
    searchResults.addEventListener('click',function (event) {if (event.target.closest('a')) closeSearch(false);});
  }
  doc.addEventListener('keydown',function (event) {
    var target=doc.activeElement,editing=target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
    if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k') || (!editing && event.key==='/')) {
      event.preventDefault();if (modal==='search') closeSearch(true);else openSearch();return;
    }
    if (event.key==='Escape') {if (modal==='search') closeSearch(true);else if (modal==='menu') closeMenu(true);return;}
    if (modal && event.key==='Tab') {
      var elements=modal==='search' ? focusables(command) : [menu].concat(focusables(mobile));
      var first=elements[0],last=elements[elements.length-1];
      if (event.shiftKey && target===first) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && target===last) {event.preventDefault();first.focus();}
    }
    if (modal!=='search') return;
    if ((event.key==='ArrowDown' || event.key==='ArrowUp') && matches.length) {
      event.preventDefault();selected=(selected+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;renderSearch();
      var option=$('#search-option-'+selected);if (option) option.scrollIntoView({block:'nearest'});
    }
    if (event.key==='Enter' && matches.length && target===searchInput) {event.preventDefault();var link=$('#search-option-'+selected);if (link) link.click();}
  });

  // A small constellation, suspended completely when the cover is outside the viewport.
  var scene=$('#cover-scene'),canvas=$('#constellation');
  if (scene && canvas) {
    var ctx=canvas.getContext('2d');
    if (ctx) {
      var w=1,h=1,mx=-999,my=-999,nodes=[],coarse=matchMedia('(pointer:coarse)').matches;
      var seeded=function (i) {var v=Math.sin(i*12.9898+78.233)*43758.5453;return v-Math.floor(v);};
      for (var i=0;i<(coarse?22:36);i++) nodes.push({x:seeded(i+12),y:seeded(i+31),r:1+seeded(i+7)*1.5,phase:seeded(i+61)*7});
      function resizeScene() {var r=scene.getBoundingClientRect(),d=Math.min(1.5,devicePixelRatio||1);w=r.width;h=r.height;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);}
      resizeScene();addEventListener('resize',resizeScene,{passive:true});
      scene.addEventListener('pointermove',function (event) {
        if (motion.reduced() || event.pointerType==='touch') return;
        var r=scene.getBoundingClientRect();mx=event.clientX-r.left;my=event.clientY-r.top;
        var nx=mx/r.width-.5,ny=my/r.height-.5;
        scene.style.setProperty('--px',nx*12+'px');scene.style.setProperty('--py',ny*12+'px');scene.style.setProperty('--ry',nx*5+'deg');scene.style.setProperty('--rx',-ny*4+'deg');
      },{passive:true});
      scene.addEventListener('pointerleave',function () {mx=-999;my=-999;['--px','--py','--ry','--rx'].forEach(function (p) {scene.style.removeProperty(p);});});
      motion.watch(scene,function (time,dt,reduced) {
        ctx.clearRect(0,0,w,h);var t=reduced?0:time*.00014;
        var points=nodes.map(function (n) {return {x:n.x*w+Math.sin(t+n.phase)*10,y:n.y*h+Math.cos(t*1.3+n.phase)*11,r:n.r};});
        points.forEach(function (a,i) {
          for (var j=i+1;j<points.length;j++) {var b=points[j],d=Math.hypot(a.x-b.x,a.y-b.y);if (d<130) {ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(154,215,170,'+(.13*(1-d/130))+')';ctx.stroke();}}
          var near=Math.hypot(a.x-mx,a.y-my)<90;ctx.beginPath();ctx.arc(a.x,a.y,a.r*(near?1.5:1),0,Math.PI*2);ctx.fillStyle=near?'#9ad7aa':'rgba(115,164,136,.4)';ctx.fill();
        });
      },24);
    }
  }

  var directory=$('#directory-list'),preview=$('#directory-preview');
  if (directory && preview && matchMedia('(hover:hover) and (pointer:fine)').matches && !motion.reduced()) {
    var images={solutions:['showcase-all-indie.webp','КАК РЕШАЮ ЗАДАЧИ'],works:['showcase-sng-games.webp','РАБОТЫ'],bio:['roman-portrait.webp','БИОГРАФИЯ'],lab:['showcase-hlop.webp','ИНСТРУМЕНТЫ'],text:['showcase-posle.webp','КНИГИ И ПУБЛИКАЦИИ']};
    all('.directory-link',directory).forEach(function (a) {a.addEventListener('pointerenter',function () {var image=images[a.dataset.preview];$('#directory-preview-img').src=ROOT+'assets/images/'+image[0];$('#directory-preview-label').textContent=image[1];preview.classList.add('visible');});});
    directory.addEventListener('pointermove',function (event) {preview.style.left=Math.max(175,Math.min(innerWidth-175,event.clientX+120))+'px';preview.style.top=Math.max(140,Math.min(innerHeight-140,event.clientY+30))+'px';},{passive:true});
    directory.addEventListener('pointerleave',function () {preview.classList.remove('visible');});
  }

  var catalog={
    sng:{number:'01',title:'SNG GAMES',type:'МЕДИА / КАТАЛОГ',image:'showcase-sng-games.webp',description:'Новости и каталог игр СНГ. Карточки игр, студий и издателей, календарь релизов и редакция.',slug:'sng-games'},
    posle:{number:'02',title:'ПОСЛЕ',type:'ХОРРОР / ИГРА',image:'showcase-posle.webp',description:'Девятиэтажный дом, лифт и разговоры с соседями. Повседневные поездки складываются в тревожную историю.',slug:'posle'},
    hlop:{number:'03',title:'HLOP',type:'WINDOWS / УТИЛИТА',image:'showcase-hlop.webp',description:'Конвертация файлов, пакетная обработка и распознавание текста. Операции собраны в круговом меню.',slug:'hlop'}
  };
  var tabs=all('.project-tab');
  function activateTab(button,focus) {
    var project=catalog[button.dataset.project];if (!project) return;
    tabs.forEach(function (tab) {var active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.setAttribute('tabindex',active?'0':'-1');});
    $('#featured-view').setAttribute('aria-labelledby',button.id);
    $('#featured-image').src=ROOT+'assets/images/'+project.image;$('#featured-image').alt=project.title+' — экран проекта';
    $('#featured-image-link').href=ROOT+'projects/'+project.slug+'/';$('#featured-case-link').href=ROOT+'projects/'+project.slug+'/';
    ['number','title','type','description'].forEach(function (key) {$('#featured-'+key).textContent=project[key];});
    if (focus) button.focus();
  }
  tabs.forEach(function (button,i) {
    button.addEventListener('click',function () {activateTab(button,false);});
    button.addEventListener('keydown',function (event) {var n=null;if (event.key==='ArrowRight') n=(i+1)%tabs.length;if (event.key==='ArrowLeft') n=(i+tabs.length-1)%tabs.length;if (event.key==='Home') n=0;if (event.key==='End') n=tabs.length-1;if (n!==null) {event.preventDefault();activateTab(tabs[n],true);}});
  });

  var filters=all('.index-filter'),cards=all('.portfolio-card'),count=$('#portfolio-count');
  if (count) {count.setAttribute('role','status');count.setAttribute('aria-live','polite');}
  filters.forEach(function (button) {button.addEventListener('click',function () {
    var value=button.dataset.filter,visible=0;
    filters.forEach(function (b) {var active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    cards.forEach(function (card) {var show=value==='all' || (card.dataset.category||'').split(' ').indexOf(value)>=0;card.hidden=!show;if (show) visible++;});
    if (count) count.textContent='НАЙДЕНО: '+visible;
  });});

  var brief=$('#brief-form'),panel=$('#brief-result-panel'),output=$('#brief-output'),copy=$('#copy-brief'),emailLink=$('#send-brief-email');
  function briefText() {var value=function(id) {return $("#"+id).value.trim() || "Не указано";};return ["ЗАДАЧА ДЛЯ BYGAGARIN","","Направление: "+value("brief-type"),"","Что происходит:",value("brief-desc"),"","Какой результат нужен:",value("brief-result")].join(String.fromCharCode(10));}
  if (brief) {
    $('#brief-desc').maxLength=4000;$('#brief-result').maxLength=1000;
    brief.addEventListener('submit',function (event) {event.preventDefault();output.textContent=briefText();if(emailLink)emailLink.href='mailto:gagarinfoto64@yandex.ru?subject='+encodeURIComponent('Заявка с сайта byGagarin')+'&body='+encodeURIComponent(output.textContent);panel.hidden=false;panel.focus();});
    $('#close-brief').addEventListener('click',function () {panel.hidden=true;$('#make-brief').focus();});
    copy.setAttribute('aria-live','polite');
    copy.addEventListener('click',function () {
      function done() {copy.textContent='СКОПИРОВАНО';setTimeout(function () {copy.textContent='СКОПИРОВАТЬ БРИФ ↗';},2200);}
      function fallback() {var area=doc.createElement('textarea');area.value=output.textContent;panel.appendChild(area);area.select();var ok=doc.execCommand('copy');area.remove();if (ok) done();else copy.textContent='ВЫДЕЛИ И СКОПИРУЙ ТЕКСТ ВЫШЕ';}
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(output.textContent).then(done,fallback);else fallback();
    });
  }
  function number(id) {return Math.max(0,Number($('#'+id).value)||0);}
  function money(value) {return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(value)+' ₽';}
  function calculate() {if (!$('#spend')) return;var spend=number('spend'),leads=number('leads'),sales=number('sales'),revenue=number('revenue');$('#cpl').textContent=leads?money(spend/leads):'—';$('#cac').textContent=sales?money(spend/sales):'—';$('#roas').textContent=spend?(revenue/spend).toFixed(1).replace('.',',')+'×':'—';}
  ['spend','leads','sales','revenue'].forEach(function (id) {var input=$('#'+id);if (input) input.addEventListener('input',calculate);});calculate();
}());
