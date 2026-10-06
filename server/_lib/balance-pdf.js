import PDFDocument from 'pdfkit';
import {balance,categories} from './production.js';
const money = cents => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(cents/100);
export function createBalancePdf(rows,round,now=new Date()) {
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:'A4',margins:{top:44,bottom:48,left:44,right:44},bufferPages:true,info:{Title:`Balance - ${round.name}`}});
  const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
  const w=doc.page.width-88;let y=44;
  const text=(value,x,at,options={})=>doc.font(options.bold?'Helvetica-Bold':'Helvetica').fontSize(options.size||9).fillColor(options.color||'#171b24').text(String(value??''),x,at,{lineBreak:false,...options});
  const fit=(value,width,size=9)=>{doc.font('Helvetica').fontSize(size);let s=String(value??'');while(s.length&&doc.widthOfString(s)>width)s=s.slice(0,-1);return s.length<String(value??'').length?s.slice(0,-1)+'…':s;};
  const line=()=>doc.moveTo(44,y).lineTo(44+w,y).lineWidth(.7).strokeColor('#dce1e6').stroke();
  const page=()=>{doc.addPage();y=44;text('BALANCE DE FIESTA',44,y,{bold:true,color:'#1c6664'});text(fit(round.name,300),220,y,{width:331,align:'right'});y+=26;line();y+=18;};
  const ensure=h=>{if(y+h>doc.page.height-85)page();};
  const heading=label=>{ensure(45);text(label,44,y,{size:11,bold:true});y+=24;};
  const totals=balance(rows), projected=totals.net+totals.pendingIncome-totals.pendingExpense;
  text('DONT STOP / BALANCE DE FIESTA',44,y,{size:10,bold:true,color:'#1c6664'});y+=26;
  text(fit(round.name||'Fiesta',w,23),44,y,{size:23,bold:true});y+=35;
  text(fit(`${round.date||'Sin referencia de fecha'} · ${round.closedAt?'CERRADO':'EN CURSO'} · Moneda: ARS`,w),44,y);y+=19;
  text(`Generado: ${now.toLocaleString('es-AR',{timeZone:'America/Argentina/Tucuman'})}`,44,y,{color:'#657080'});y+=24;line();y+=22;
  const resultColor=totals.net<0?'#a22e36':totals.net>0?'#1c6664':'#171b24';
  text(totals.net<0?'RESULTADO ACTUAL: NEGATIVO':totals.net>0?'RESULTADO ACTUAL: POSITIVO':'RESULTADO ACTUAL: EN CERO',44,y,{bold:true,size:12,color:resultColor});y+=25;
  text(money(totals.net),44,y,{bold:true,size:25,color:resultColor});y+=37;
  text('Ingresos cobrados menos egresos pagados. Los pendientes se muestran aparte.',44,y,{size:8,color:'#657080'});y+=25;
  const cards=[['INGRESOS COBRADOS',totals.income],['EGRESOS PAGADOS',totals.expense],['INGRESOS PENDIENTES',totals.pendingIncome],['EGRESOS PENDIENTES',totals.pendingExpense]];
  cards.forEach(([label,value],i)=>{const x=44+(i%2)*(w/2);const at=y+Math.floor(i/2)*62;doc.rect(x,at,w/2-8,53).fill('#edf5f3');text(label,x+10,at+9,{size:8,bold:true});text(money(value),x+10,at+27,{size:16,bold:true});});y+=135;
  text(`Resultado si se cobran/pagan todos los pendientes: ${money(projected)}`,44,y,{bold:true,size:10});y+=21;
  text(`Entradas vendidas y cobradas: ${totals.tickets}`,44,y,{size:9});y+=28;
  heading('TOTALES POR CATEGORÍA');
  for(const [type,list] of Object.entries(categories)) {
   const tableHead=()=>{text(type==='income'?'INGRESOS':'EGRESOS',44,y,{bold:true,color:'#1c6664'});text('COBRADO / PAGADO',260,y,{bold:true,size:8});text('PENDIENTE',440,y,{bold:true,size:8});y+=22;};
   ensure(45);tableHead();
   for(const category of list) {
    if(y+23>doc.page.height-85){page();tableHead();}const values=rows.filter(r=>r.type===type&&r.category===category);
    text(category,44,y);text(money(values.filter(r=>r.status==='paid').reduce((n,r)=>n+r.cents,0)),260,y);text(money(values.filter(r=>r.status==='pending').reduce((n,r)=>n+r.cents,0)),440,y);y+=22;line();
   }y+=18;
  }
  heading('PAGOS Y COBROS POR SOCIO');
  const partners=new Map();
  for(const row of rows){const key=String(row.partnerId);if(!partners.has(key))partners.set(key,{name:row.partnerName||'Socio',income:0,expense:0});if(row.status==='paid')partners.get(key)[row.type]+=row.cents;}
  for(const partner of partners.values()){ensure(43);text(fit(partner.name,w),44,y,{bold:true});y+=17;text(`Cobró: ${money(partner.income)} · Pagó: ${money(partner.expense)}`,44,y);y+=23;line();}
  if(!partners.size){text('Sin movimientos registrados.',44,y);y+=24;}
  y+=18;heading('DETALLE DE MOVIMIENTOS');
  for(const row of rows) {
   ensure(76);text(`${row.date} · ${row.type==='income'?'INGRESO':'EGRESO'} · ${row.status==='paid'?'COBRADO / PAGADO':'PENDIENTE'}`,44,y,{size:8,color:'#657080'});y+=17;
   text(fit(row.category,320),44,y,{bold:true});text(money(row.cents),375,y,{width:176,align:'right',bold:true});y+=17;
   text(fit(`Socio: ${row.partnerName||'Sin socio'} · Cargó: ${row.actor?.email||'Sin registro'}`,w,8),44,y,{size:8});y+=16;
   text(fit(`${row.description||'Sin descripción'}${row.quantity?` · ${row.quantity} entradas`:''}`,w,8),44,y,{size:8,color:'#657080'});y+=19;line();y+=8;
  }
  if(!rows.length){text('Sin movimientos registrados.',44,y);y+=22;}
  ensure(40);text('USO INTERNO · Los aportes y reintegros entre socios no se contabilizan como nuevas ventas o gastos.',44,y,{size:7,color:'#657080'});
  const count=doc.bufferedPageRange().count;
  for(let i=0;i<count;i++){doc.switchToPage(i);text('DONT STOP / MONEDA ARS',44,doc.page.height-58,{size:7,color:'#657080'});text(`${i+1} / ${count}`,480,doc.page.height-58,{size:7,width:71,align:'right'});}
  doc.end();
 });
}
