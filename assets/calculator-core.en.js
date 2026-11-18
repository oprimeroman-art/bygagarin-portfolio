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
    if(!keys.length)return {error:'Enter the source data.'};
    for(var i=0;i<keys.length;i++){
      if(typeof v[keys[i]]!=='number'||!Number.isFinite(v[keys[i]])||v[keys[i]]<0)return {error:'Enter correct numbers not less than zero.'};
    }
    var margin,contribution,unit,amount,rev,cost,total,net,needed,base,other,months,share;
    switch(id){
      case 'funnel':
        return result([
          metric('CTR',v.impressions>0?v.clicks/v.impressions*100:null,'percent'),
          metric('CPM',v.impressions>0?v.spend/v.impressions*1000:null),
          metric('CPC',div(v.spend,v.clicks)),
          metric('Click-to-request conversion',v.clicks>0?v.leads/v.clicks*100:null,'percent'),
          metric('CPL',div(v.spend,v.leads)),
          metric('Request-to-sale conversion',v.leads>0?v.sales/v.leads*100:null,'percent'),
          metric('CAC (by advertising spend)',div(v.spend,v.sales)),
          metric('ROAS',div(v.revenue,v.spend),'multiple')
        ],'All indicators refer to one period. CAC here includes only the specified advertising spend.');
      case 'roi':
        net=v.revenue-v.costs;
        return result([metric('Profit / loss',net),metric('ROI',v.costs>0?net/v.costs*100:null,'signedPercent')],
          'ROI = (revenue − all costs) / all costs × 100%. If costs are zero, ROI is undefined.');
      case 'romi':
        if(v.margin>100)return {error:'Margin cannot be greater than 100%.'};
        contribution=v.revenue*v.margin/100;
        net=contribution-v.spend;
        return result([metric('Gross income from sales before marketing costs',contribution),metric('After marketing costs',net),metric('ROMI',v.spend>0?net/v.spend*100:null,'signedPercent')],
          'Margin is entered without marketing costs. ROMI = (revenue × margin share − marketing costs) / marketing costs × 100%.');
      case 'profit':
        cost=v.variable+v.fixed+v.marketing;
        net=v.revenue-cost;
        return result([metric('Total costs',cost),metric('Profit before taxes',net),metric('Return on sales',v.revenue>0?net/v.revenue*100:null,'signedPercent')],
          'I calculate income minus the listed costs, without taxes, interest, and other unspecified costs.');
      case 'margin':
        net=v.price-v.unitCost;
        return result([metric('Profit per unit before fixed costs',net),metric('Margin',v.price>0?net/v.price*100:null,'signedPercent'),metric('Markup',v.unitCost>0?net/v.unitCost*100:null,'signedPercent')],
          'Margin is calculated from the selling price, markup from the cost price. These are different percentages.');
      case 'breakeven':
        unit=v.price-v.variable;
        if(unit<=0&&v.fixed>0)return result([metric('Contribution margin per unit',unit),metric('Units to break even',null,'integer'),metric('Revenue at break-even point',null)],'If the price is not above variable costs, a positive break-even point is unreachable.');
        needed=v.fixed===0?0:Math.ceil(v.fixed/unit);
        return result([metric('Contribution margin per unit',unit),metric('Units to break even',needed,'integer'),metric('Revenue at this volume',needed*v.price)],
          'Volume rounded up to a whole unit. Taxes and costs not included in fixed and variable costs are not accounted for.');
      case 'target':
        if(v.margin>100)return {error:'Contribution margin share cannot exceed 100%.'};
        needed=v.margin>0?(v.fixed+v.profit)/(v.margin/100):(v.fixed+v.profit===0?0:null);
        return result([metric('Required revenue',needed),metric('Contribution margin at this revenue',needed===null?null:needed*v.margin/100)],
          v.margin===0?'If the contribution margin share is zero, the goal is unreachable when costs or target profit are positive.':'Revenue = (fixed costs + target profit) / contribution margin share.');
      case 'discount':
        if(v.discount>100)return {error:'Discount cannot exceed 100%.'};
        unit=v.price*(1-v.discount/100);
        contribution=unit-v.cost;
        base=(v.price-v.cost)*v.units;
        needed=base<=0?0:(contribution>0?Math.ceil(base/contribution):null);
        return result([metric('Price after discount',unit),metric('Profit per unit after discount',contribution),metric('Units to keep the previous gross profit',needed,'integer'),metric('Change in sales volume',needed!==null&&v.units>0?(needed-v.units)/v.units*100:null,'signedPercent')],
          'Comparison of the same product mix at the current cost price. Volume is rounded up; fixed costs are not included.');
      case 'ltv':
        if(v.margin>100)return {error:'Margin cannot exceed 100%.'};
        rev=v.average*v.frequency*v.years;
        return result([metric('Revenue from a customer over the period',rev),metric('LTV by gross profit',rev*v.margin/100)],
          'Simple model without discounting, refunds, or changes in purchase frequency. Margin is before acquisition costs.');
      case 'ltvcac':
        share=div(v.ltv,v.cac);
        return result([metric('LTV / CAC',share,'multiple'),metric('LTV − CAC difference',v.ltv-v.cac)],
          'Use LTV by gross profit and CAC with the same cost composition and over a comparable period.');
      case 'arpu':
        if(v.payers>v.users)return {error:'Paying users cannot exceed all active users for the same period.'};
        return result([metric('ARPU',div(v.revenue,v.users)),metric('ARPPU',div(v.revenue,v.payers)),metric('Share of paying users',v.users>0?v.payers/v.users*100:null,'percent')],
          'All values must refer to the same period.');
      case 'churn':
        if(v.lost>v.start)return {error:'Churned customers cannot exceed the number of customers at the start of the period.'};
        return result([metric('Churn / outflow',v.start>0?v.lost/v.start*100:null,'percent'),metric('Customers retained',v.start-v.lost,'integer'),metric('Customers at the end of the period',v.start-v.lost+v.newCustomers,'integer')],
          'I calculate churn from the base at the start of the period. New customers are not included in the denominator.');
      case 'payback':
        if(v.margin>100)return {error:'Margin cannot exceed 100%.'};
        contribution=v.monthlyRevenue*v.margin/100;
        return result([metric('Gross profit per customer per month',contribution),metric('CAC payback',v.cac===0?0:(contribution>0?v.cac/contribution:null),'months')],
          'Simple payback period: without discounting, seasonality, or other unspecified costs.');
      case 'media':
        if(v.ctr>100||v.conversion>100)return {error:'Conversions and CTR cannot exceed 100%.'};
        cost=v.impressions/1000*v.cpm;
        return result([metric('Budget by CPM',cost),metric('Expected clicks',v.impressions*v.ctr/100,'integer'),metric('Expected leads',v.impressions*v.ctr/100*v.conversion/100,'integer')],
          'Forecast scenario with unchanged CTR and conversion. This is a calculation, not a promise of results.');
      case 'leadplan':
        if(v.leadConversion>100||v.saleConversion>100)return {error:'Conversions cannot exceed 100%.'};
        needed=v.sales===0?0:(v.leadConversion>0&&v.saleConversion>0?Math.ceil(v.sales/(v.leadConversion/100)/(v.saleConversion/100)):null);
        amount=needed===null?null:needed*v.cpc;
        return result([metric('Clicks needed',needed,'integer'),metric('Advertising budget',amount),metric('Expected leads',needed===null?null:needed*v.leadConversion/100,'integer')],
          'Based on the given conversions and CPC. I round clicks up; actual results may differ.');
      case 'automation':
        amount=v.hours*v.hourCost;
        return result([metric('Savings per month',amount),metric('Implementation payback',v.setup===0?0:(amount>0?v.setup/amount:null),'months'),metric('Savings over 12 months after the implementation cost',amount*12-v.setup)],
          'I calculate the monetary value of the saved time. This does not always equal an actual reduction in cash expenses.');
      default:return {error:'Unknown calculator.'};
    }
  }
  return {evaluate:evaluate,divide:div};
});
