/* byGagarin: exact formula checks, zero-denominator and loss cases. Run: node scripts/test_calculators.js */
'use strict';
const assert=require('node:assert/strict');
const core=require('../assets/calculator-core.js');
let count=0;
function check(id,input,values){
 const result=core.evaluate(id,input);
 assert.equal(result.error,undefined,`${id} unexpectedly invalid: ${result.error}`);
 values.forEach(([label,expected])=>{
   const m=result.metrics.find(x=>x.label===label);
   assert.ok(m,`${id}: missing ${label}`);
   if(expected===null)assert.equal(m.value,null,`${id}/${label}`);
   else assert.ok(Math.abs(m.value-expected)<1e-8*Math.max(1,Math.abs(expected)),`${id}/${label}: ${m.value} !== ${expected}`);
   count++;
 });
}
function fails(id,input,part){
 const r=core.evaluate(id,input);assert.ok(r.error&&r.error.includes(part),`${id}: unexpected ${JSON.stringify(r)}`);count++;
}
check('funnel',{spend:30000,impressions:100000,clicks:3000,leads:60,sales:6,revenue:120000},[['CTR',3],['CPM',300],['CPC',10],['Конверсия клика в заявку',2],['CPL',500],['Конверсия заявки в продажу',10],['CAC (по рекламным расходам)',5000],['ROAS',4]]);
check('roi',{revenue:150000,costs:100000},[['Прибыль / убыток',50000],['ROI',50]]);
check('roi',{revenue:50000,costs:100000},[['Прибыль / убыток',-50000],['ROI',-50]]);
check('roi',{revenue:0,costs:0},[['ROI',null]]);
check('romi',{revenue:250000,margin:45,spend:40000},[['Валовый доход от продаж до затрат на маркетинг',112500],['После затрат на маркетинг',72500],['ROMI',181.25]]);
check('romi',{revenue:50000,margin:20,spend:15000},[['После затрат на маркетинг',-5000],['ROMI',-33.3333333333333]]);
check('profit',{revenue:180000,variable:65000,fixed:40000,marketing:20000},[['Всего затрат',125000],['Прибыль до налогов',55000],['Рентабельность продаж',55000/180000*100]]);
check('margin',{price:1500,unitCost:900},[['Прибыль с единицы до постоянных расходов',600],['Маржинальность',40],['Наценка',600/900*100]]);
check('margin',{price:0,unitCost:0},[['Маржинальность',null],['Наценка',null]]);
check('breakeven',{fixed:75000,price:1900,variable:1100},[['Маржинальный доход с единицы',800],['Единиц до безубыточности',94],['Выручка при этом объёме',178600]]);
check('breakeven',{fixed:500,price:100,variable:100},[['Единиц до безубыточности',null]]);
check('breakeven',{fixed:0,price:100,variable:120},[['Единиц до безубыточности',0]]);
check('target',{fixed:90000,margin:40,profit:50000},[['Необходимая выручка',350000],['Маржинальный доход при этой выручке',140000]]);
check('target',{fixed:100,margin:0,profit:0},[['Необходимая выручка',null]]);
check('target',{fixed:0,margin:0,profit:0},[['Необходимая выручка',0]]);
check('discount',{price:2000,cost:1100,discount:15,units:100},[['Цена после скидки',1700],['Прибыль с единицы после скидки',600],['Единиц для сохранения прежней валовой прибыли',150],['Изменение объёма продаж',50]]);
check('discount',{price:1000,cost:900,discount:20,units:100},[['Единиц для сохранения прежней валовой прибыли',null]]);
check('ltv',{average:5000,frequency:4,years:3,margin:45},[['Выручка от клиента за срок',60000],['LTV по валовой прибыли',27000]]);
check('ltvcac',{ltv:27000,cac:4500},[['LTV / CAC',6],['Разница LTV − CAC',22500]]);
check('ltvcac',{ltv:27000,cac:0},[['LTV / CAC',null]]);
check('arpu',{revenue:350000,users:10000,payers:700},[['ARPU',35],['ARPPU',500],['Доля платящих пользователей',7]]);
check('churn',{start:400,lost:36,newCustomers:60},[['Churn / отток',9],['Сохранилось клиентов',364],['Клиентов на конец периода',424]]);
check('payback',{cac:6000,monthlyRevenue:2500,margin:50},[['Валовая прибыль с клиента в месяц',1250],['Окупаемость CAC',4.8]]);
check('payback',{cac:0,monthlyRevenue:0,margin:0},[['Окупаемость CAC',0]]);
check('media',{impressions:200000,cpm:350,ctr:1.5,conversion:4},[['Бюджет по CPM',70000],['Ожидаемые клики',3000],['Ожидаемые заявки',120]]);
check('leadplan',{sales:25,leadConversion:5,saleConversion:20,cpc:25},[['Нужны клики',2500],['Рекламный бюджет',62500],['Ожидаемые заявки',125]]);
check('leadplan',{sales:25,leadConversion:0,saleConversion:20,cpc:25},[['Нужны клики',null],['Рекламный бюджет',null]]);
check('automation',{setup:50000,hours:24,hourCost:650},[['Экономия в месяц',15600],['Окупаемость внедрения',50000/15600],['Экономия за 12 месяцев после стоимости внедрения',137200]]);
check('automation',{setup:50000,hours:0,hourCost:650},[['Окупаемость внедрения',null]]);
check('leadplan',{sales:0,leadConversion:0,saleConversion:0,cpc:25},[['Нужны клики',0],['Рекламный бюджет',0]]);
check('automation',{setup:0,hours:0,hourCost:100},[['Окупаемость внедрения',0]]);
fails('romi',{revenue:100,margin:101,spend:20},'100%');
fails('arpu',{revenue:100,users:10,payers:11},'больше');
fails('churn',{start:10,lost:11,newCustomers:2},'больше');
fails('discount',{price:100,cost:20,discount:101,units:2},'100%');
fails('leadplan',{sales:1,leadConversion:101,saleConversion:10,cpc:10},'100%');
fails('media',{impressions:1000,cpm:10,ctr:110,conversion:3},'100%');
fails('roi',{revenue:-1,costs:100},'не меньше нуля');
fails('roi',{revenue:Infinity,costs:100},'корректные числа');
fails('roi',{revenue:NaN,costs:100},'корректные числа');
assert.equal(core.divide(1,0),null);count++;
console.log(`PASS: ${count} calculator assertions; 16 independent formulas, normal/loss/zero/input boundaries.`);
