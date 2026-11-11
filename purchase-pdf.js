(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNPurchasePDF=factory();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 return function orderPDF(order,Constructor){
  if(!Constructor)throw Error('The PDF tool is still loading. Refresh and try again.');
  const doc=new Constructor({unit:'pt',format:'letter'}),W=612,M=42,B=726;let y=44;
  const clean=s=>String(s??'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/\t/g,' ');
  function page(){doc.addPage();y=48;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(140,79,15);doc.text(order.number+' · continued',M,y);y+=24;}
  function space(h){if(y+h>B)page();}
  function text(value,size=11,bold=false,width=W-2*M){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(39,47,57);const lines=doc.splitTextToSize(clean(value),width);for(const line of lines){space(size+7);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(39,47,57);doc.text(line,M,y);y+=size+5;}return lines.length;}
  doc.setFont('helvetica','bold');doc.setFontSize(20);const headerBottom=Math.max(140,44+doc.splitTextToSize(clean(order.business?.name||'Business'),W-2*M).length*25+7+29+16+12);
  doc.setFillColor(247,242,234);doc.rect(0,0,W,headerBottom,'F');doc.setFillColor(156,74,32);doc.rect(0,0,8,headerBottom,'F');text(order.business?.name||'Business',20,true);y+=7;text('SUPPLIER ORDER',24,true);text(order.number+'  |  '+order.status,11);y=Math.max(y+16,headerBottom+24);
  text('TO: '+order.supplier,14,true);if(order.supplierEmail)text(order.supplierEmail);if(order.jobTitle)text('Job: '+order.jobTitle);if(order.neededBy)text('Needed by: '+order.neededBy);text(order.fulfillment+(order.address?': '+order.address:''));y+=15;
  function tableHead(){space(46);doc.setFillColor(243,236,224);doc.rect(M,y-14,W-2*M,28,'F');doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text('MATERIAL',M+8,y+4);doc.text('QTY',430,y+4);doc.text('UNIT',488,y+4);y+=34;}
  tableHead();
  for(const item of order.items){doc.setFontSize(12);doc.setFont('helvetica','normal');const lines=doc.splitTextToSize(clean(item.name),360);const h=Math.max(30,lines.length*17+12);if(y+h>B){page();tableHead();}doc.setFont('helvetica','normal');doc.setFontSize(12);doc.setTextColor(39,47,57);doc.text(lines,M+8,y);doc.text(String(item.qty),430,y);doc.text(item.unit,488,y);y+=h;doc.setDrawColor(230,230,230);doc.line(M,y-9,W-M,y-9);}
  y+=10;doc.setFontSize(11);space((order.notes?doc.splitTextToSize(clean(order.notes),W-2*M).length*16+28:0)+48+(order.business?.phone?16:0)+(order.business?.email?16:0));if(order.notes){text('ORDER NOTES',11,true);text(order.notes);y+=12;}
  text('Please confirm availability, pricing and '+order.fulfillment.toLowerCase()+' arrangements.',11);
  if(order.business?.phone)text('Phone: '+order.business.phone);if(order.business?.email)text('Email: '+order.business.email);
  const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);doc.setDrawColor(202,126,37);doc.line(M,751,W-M,751);doc.setFontSize(9);doc.setTextColor(110,110,110);doc.text('Prepared with Quote.Noble',M,769);doc.text(i+' / '+count,W-M,769,{align:'right'});}return doc;
 };
});
