export function parseContacts(csv) {
 if(typeof csv!=='string'||Buffer.byteLength(csv,'utf8')>1000000)throw new Error('Usá un CSV UTF-8 de hasta 1 MB.');
 const input=csv.replace(/^\uFEFF/,'');const first=input.split(/\r?\n/)[0]||'';const delimiter=first.includes(';')?';':',';
 const table=[];let row=[],field='',quoted=false;
 for(let i=0;i<input.length;i++) {
  const c=input[i];
  if(c==='"'){if(quoted&&input[i+1]==='"'){field+='"';i++}else if(!quoted&&field.trim()){throw new Error('CSV inválido: revisá las comillas.')}else quoted=!quoted;}
  else if(!quoted&&c===delimiter){row.push(field);field='';}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))table.push(row);row=[];field='';}
  else field+=c;
  if(table.length>10001)throw new Error('Importá hasta 10.000 contactos por archivo.');
 }
 if(quoted)throw new Error('CSV inválido: falta cerrar una comilla.');
 row.push(field);if(row.some(v=>v.trim()))table.push(row);
 if(!table.length)throw new Error('El archivo está vacío.');
 const normal=v=>v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const headers=table[0].map(normal);let emailColumn=headers.findIndex(v=>['email','correo','correo electronico','email address','e-mail'].includes(v));
 const hasHeader=emailColumn>=0;let nameColumn=hasHeader?headers.findIndex(v=>['nombre','name','nombre completo','full name'].includes(v)):-1;
 if(!hasHeader)emailColumn=0;
 const raw=hasHeader?table.slice(1):table;
 if(raw.length>10000)throw new Error('Importá hasta 10.000 contactos por archivo.');
 const seen=new Set(),contacts=[],invalid=[];let duplicates=0;
 for(let i=0;i<raw.length;i++){
  const email=(raw[i][emailColumn]||'').trim().toLowerCase();const name=(nameColumn>=0?raw[i][nameColumn]||'':'').trim().replace(/\s+/g,' ');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length>120){invalid.push({line:i+(hasHeader?2:1),email:email.slice(0,254)});continue}
  if(seen.has(email)){duplicates++;continue}seen.add(email);contacts.push({email,name});
 }
 return {contacts,total:raw.length,duplicates,invalid};
}
