/* byGagarin — accessible, local-only calculator interface. */
(function(){
  'use strict';
  var defs=window.GagarinCalculatorDefinitions||[],core=window.GagarinCalculatorCore;
  var root=document.getElementById('calculators-list');
  if(!root||!core){if(root)root.textContent='Не удалось загрузить расчёты. Обновите страницу.';return;}
  var ru=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
  var whole=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
  function element(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function format(value,kind){
    if(value===null||typeof value!=='number'||!Number.isFinite(value))return '—';
    if(Object.is(value,-0))value=0;
    if(kind==='percent'||kind==='signedPercent')return ru.format(value)+' %';
    if(kind==='multiple')return ru.format(value)+'×';
    if(kind==='integer')return whole.format(Math.round(value));
    if(kind==='months')return ru.format(value)+' мес.';
    return ru.format(value)+' ₽';
  }
  function mount(def){
    var host=document.querySelector('[data-calculator="'+def.id+'"]');
    if(!host)return;
    var form=element('form','calc-form');form.noValidate=true;
    var fields=element('div','calc-fields'),nodes={};
    def.fields.forEach(function(f){
      var wrap=element('div','calc-field'),id='calc-'+def.id+'-'+f.key;
      var label=element('label',null,f.label);label.htmlFor=id;
      var inner=element('div','calc-input-wrap');
      var input=element('input');input.id=id;input.name=f.key;input.type='number';input.inputMode='decimal';input.min='0';input.step='any';input.value=f.value;input.autocomplete='off';
      if(f.max!==undefined)input.max=f.max;
      if(f.unit){input.setAttribute('aria-label',f.label+' ('+f.unit.trim()+')');}
      inner.appendChild(input);
      if(f.unit)inner.appendChild(element('span','calc-unit-label',f.unit.trim()));
      wrap.appendChild(label);wrap.appendChild(inner);fields.appendChild(wrap);nodes[f.key]=input;
    });
    var results=element('div','calc-results');results.setAttribute('aria-live','polite');results.setAttribute('aria-atomic','true');
    var note=element('p','calc-result-note');
    var buttons=element('div','calc-actions');
    var copy=element('button','calc-copy','Скопировать расчёт');copy.type='button';
    var reset=element('button','calc-reset','Сбросить');reset.type='reset';
    buttons.appendChild(copy);buttons.appendChild(reset);
    form.appendChild(fields);form.appendChild(results);form.appendChild(note);form.appendChild(buttons);
    host.replaceChildren(form);
    function compute(){
      var values={},message='';
      def.fields.forEach(function(f){
        var raw=nodes[f.key].value.trim();
        if(raw===''){message='Заполни все поля.';return;}
        var n=Number(raw);
        if(!Number.isFinite(n)||n<0){message='Нужны числа не меньше нуля.';return;}
        if(f.max!==undefined&&n>f.max){message=f.label+': максимум '+f.max+'%.';return;}
        values[f.key]=n;
      });
      if(message){results.replaceChildren(element('p','calc-error',message));note.textContent='';return null;}
      var answer=core.evaluate(def.id,values);
      if(answer.error){results.replaceChildren(element('p','calc-error',answer.error));note.textContent='';return null;}
      var grid=element('div','calc-metrics');
      answer.metrics.forEach(function(metric){
        var cell=element('div','calc-metric');
        var caption=element('span','calc-metric-label',metric.label);
        var val=element('strong','calc-metric-value',format(metric.value,metric.kind));
        if(metric.value!==null&&metric.value<0)val.classList.add('negative');
        if(metric.value===null)val.classList.add('undefined');
        cell.appendChild(caption);cell.appendChild(val);grid.appendChild(cell);
      });
      results.replaceChildren(grid);note.textContent=answer.note||'';
      return {values:values,answer:answer};
    }
    form.addEventListener('input',function(){compute();});
    form.addEventListener('submit',function(e){e.preventDefault();});
    reset.addEventListener('click',function(){
      window.requestAnimationFrame(function(){def.fields.forEach(function(f){nodes[f.key].value=f.value;});compute();copy.textContent='Скопировать расчёт';});
    });
    copy.addEventListener('click',function(){
      var current=compute();if(!current)return;
      var text=[def.title,''];
      def.fields.forEach(function(f){text.push(f.label+': '+ru.format(current.values[f.key])+(f.unit?' '+f.unit.trim():''));});
      text.push('');current.answer.metrics.forEach(function(m){text.push(m.label+': '+format(m.value,m.kind));});
      text.push('',def.formula,current.answer.note||'','Расчёт: byGagarin / '+location.href.split('#')[0]);
      var value=text.join('\n');
      function done(){copy.textContent='Скопировано';setTimeout(function(){copy.textContent='Скопировать расчёт';},1900);}
      function fallback(){
        var area=element('textarea');area.value=value;area.style.position='absolute';area.style.left='-10000px';form.appendChild(area);area.select();
        var ok=false;try{ok=document.execCommand('copy');}catch(e){}area.remove();
        if(ok)done();else copy.textContent='Не удалось скопировать';
      }
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value).then(done,fallback);else fallback();
    });
    compute();
  }
  defs.forEach(mount);
})();
