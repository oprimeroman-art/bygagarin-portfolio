/* byGagarin — pure business formulas, also imported by Node tests. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GagarinCalculatorCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function div(a,b){return b>0?a/b:null;}
  function metric(label,value,kind){return {label:label,value:typeof value==='number'&&Number.isFinite(value)?value:null,kind:kind||'money'};}
  function result(metrics,note){return {metrics:metrics,note:note||''};}
  function evaluate(id,v){
    var keys=Object.keys(v||{});
    if(!keys.length)return {error:'Введите исходные данные.'};
    for(var i=0;i<keys.length;i++){
      if(typeof v[keys[i]]!=='number'||!Number.isFinite(v[keys[i]])||v[keys[i]]<0)return {error:'Введите корректные числа не меньше нуля.'};
    }
    var margin,contribution,unit,amount,rev,cost,total,net,needed,base,other,months,share;
    switch(id){
      case 'funnel':
        return result([
          metric('CTR',v.impressions>0?v.clicks/v.impressions*100:null,'percent'),
          metric('CPM',v.impressions>0?v.spend/v.impressions*1000:null),
          metric('CPC',div(v.spend,v.clicks)),
          metric('Конверсия клика в заявку',v.clicks>0?v.leads/v.clicks*100:null,'percent'),
          metric('CPL',div(v.spend,v.leads)),
          metric('Конверсия заявки в продажу',v.leads>0?v.sales/v.leads*100:null,'percent'),
          metric('CAC (по рекламным расходам)',div(v.spend,v.sales)),
          metric('ROAS',div(v.revenue,v.spend),'multiple')
        ],'Все показатели относятся к одному периоду. CAC здесь учитывает только указанные рекламные расходы.');
      case 'roi':
        net=v.revenue-v.costs;
        return result([metric('Прибыль / убыток',net),metric('ROI',v.costs>0?net/v.costs*100:null,'signedPercent')],
          'ROI = (выручка − все затраты) / все затраты × 100%. Если затраты равны нулю, ROI не определён.');
      case 'romi':
        if(v.margin>100)return {error:'Маржинальность не может быть больше 100%.'};
        contribution=v.revenue*v.margin/100;
        net=contribution-v.spend;
        return result([metric('Валовый доход от продаж до затрат на маркетинг',contribution),metric('После затрат на маркетинг',net),metric('ROMI',v.spend>0?net/v.spend*100:null,'signedPercent')],
          'Маржинальность вводится без маркетинговых затрат. ROMI = (выручка × доля маржи − расходы на маркетинг) / расходы на маркетинг × 100%.');
      case 'profit':
        cost=v.variable+v.fixed+v.marketing;
        net=v.revenue-cost;
        return result([metric('Всего затрат',cost),metric('Прибыль до налогов',net),metric('Рентабельность продаж',v.revenue>0?net/v.revenue*100:null,'signedPercent')],
          'Считаю доходы минус перечисленные расходы, без налогов, процентов и прочих неуказанных затрат.');
      case 'margin':
        net=v.price-v.unitCost;
        return result([metric('Прибыль с единицы до постоянных расходов',net),metric('Маржинальность',v.price>0?net/v.price*100:null,'signedPercent'),metric('Наценка',v.unitCost>0?net/v.unitCost*100:null,'signedPercent')],
          'Маржа считается от цены продажи, наценка — от себестоимости. Это разные проценты.');
      case 'breakeven':
        unit=v.price-v.variable;
        if(unit<=0&&v.fixed>0)return result([metric('Маржинальный доход с единицы',unit),metric('Единиц до безубыточности',null,'integer'),metric('Выручка в точке безубыточности',null)],'При цене не выше переменных затрат положительная точка безубыточности недостижима.');
        needed=v.fixed===0?0:Math.ceil(v.fixed/unit);
        return result([metric('Маржинальный доход с единицы',unit),metric('Единиц до безубыточности',needed,'integer'),metric('Выручка при этом объёме',needed*v.price)],
          'Объём округлён вверх до целой единицы. Налоги и расходы, не включённые в фиксированные и переменные затраты, не учтены.');
      case 'target':
        if(v.margin>100)return {error:'Доля маржинального дохода не может превышать 100%.'};
        needed=v.margin>0?(v.fixed+v.profit)/(v.margin/100):(v.fixed+v.profit===0?0:null);
        return result([metric('Необходимая выручка',needed),metric('Маржинальный доход при этой выручке',needed===null?null:needed*v.margin/100)],
          v.margin===0?'При нулевой доле маржинального дохода цель недостижима, если расходы или целевая прибыль положительны.':'Выручка = (постоянные расходы + целевая прибыль) / доля маржинального дохода.');
      case 'discount':
        if(v.discount>100)return {error:'Скидка не может превышать 100%.'};
        unit=v.price*(1-v.discount/100);
        contribution=unit-v.cost;
        base=(v.price-v.cost)*v.units;
        needed=base<=0?0:(contribution>0?Math.ceil(base/contribution):null);
        return result([metric('Цена после скидки',unit),metric('Прибыль с единицы после скидки',contribution),metric('Единиц для сохранения прежней валовой прибыли',needed,'integer'),metric('Изменение объёма продаж',needed!==null&&v.units>0?(needed-v.units)/v.units*100:null,'signedPercent')],
          'Сравнение одинакового ассортимента при прежней себестоимости. Расчёт объёма округлён вверх; постоянные затраты не учитываются.');
      case 'ltv':
        if(v.margin>100)return {error:'Маржинальность не может превышать 100%.'};
        rev=v.average*v.frequency*v.years;
        return result([metric('Выручка от клиента за срок',rev),metric('LTV по валовой прибыли',rev*v.margin/100)],
          'Простая модель без дисконтирования, возвратов и изменения частоты покупок. Маржа — до затрат на привлечение.');
      case 'ltvcac':
        share=div(v.ltv,v.cac);
        return result([metric('LTV / CAC',share,'multiple'),metric('Разница LTV − CAC',v.ltv-v.cac)],
          'Используй LTV по валовой прибыли, а CAC — с одинаковым составом затрат и за сопоставимый период.');
      case 'arpu':
        if(v.payers>v.users)return {error:'Платящих пользователей не может быть больше всех активных пользователей за тот же период.'};
        return result([metric('ARPU',div(v.revenue,v.users)),metric('ARPPU',div(v.revenue,v.payers)),metric('Доля платящих пользователей',v.users>0?v.payers/v.users*100:null,'percent')],
          'Все значения должны относиться к одному периоду.');
      case 'churn':
        if(v.lost>v.start)return {error:'Ушедших клиентов не может быть больше числа клиентов на начало периода.'};
        return result([metric('Churn / отток',v.start>0?v.lost/v.start*100:null,'percent'),metric('Сохранилось клиентов',v.start-v.lost,'integer'),metric('Клиентов на конец периода',v.start-v.lost+v.newCustomers,'integer')],
          'Отток считаю от базы на начало периода. Новые клиенты в знаменатель не входят.');
      case 'payback':
        if(v.margin>100)return {error:'Маржинальность не может превышать 100%.'};
        contribution=v.monthlyRevenue*v.margin/100;
        return result([metric('Валовая прибыль с клиента в месяц',contribution),metric('Окупаемость CAC',v.cac===0?0:(contribution>0?v.cac/contribution:null),'months')],
          'Простой срок окупаемости: без дисконтирования, сезонности и прочих неуказанных затрат.');
      case 'media':
        if(v.ctr>100||v.conversion>100)return {error:'Конверсии и CTR не могут превышать 100%.'};
        cost=v.impressions/1000*v.cpm;
        return result([metric('Бюджет по CPM',cost),metric('Ожидаемые клики',v.impressions*v.ctr/100,'integer'),metric('Ожидаемые заявки',v.impressions*v.ctr/100*v.conversion/100,'integer')],
          'Прогнозный сценарий при неизменных CTR и конверсии. Это расчёт, не обещание результата.');
      case 'leadplan':
        if(v.leadConversion>100||v.saleConversion>100)return {error:'Конверсии не могут превышать 100%.'};
        needed=v.sales===0?0:(v.leadConversion>0&&v.saleConversion>0?Math.ceil(v.sales/(v.leadConversion/100)/(v.saleConversion/100)):null);
        amount=needed===null?null:needed*v.cpc;
        return result([metric('Нужны клики',needed,'integer'),metric('Рекламный бюджет',amount),metric('Ожидаемые заявки',needed===null?null:needed*v.leadConversion/100,'integer')],
          'При заданных конверсиях и CPC. Клики округляю вверх; реальные показатели могут отличаться.');
      case 'automation':
        amount=v.hours*v.hourCost;
        return result([metric('Экономия в месяц',amount),metric('Окупаемость внедрения',v.setup===0?0:(amount>0?v.setup/amount:null),'months'),metric('Экономия за 12 месяцев после стоимости внедрения',amount*12-v.setup)],
          'Считаю денежную оценку сэкономленного времени. Это не всегда равно реальному снижению денежных расходов.');
      default:return {error:'Неизвестный калькулятор.'};
    }
  }
  return {evaluate:evaluate,divide:div};
});
