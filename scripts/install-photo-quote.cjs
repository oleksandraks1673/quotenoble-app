'use strict';
const fs=require('node:fs');
const path=require('node:path');
function replaceOnce(text,from,to){
  const count=text.split(from).length-1;
  if(count!==1)throw Error('Production integration point changed; refusing to modify this version: '+from.slice(0,90));
  return text.replace(from,to);
}
function app(text){
  if(text.includes('photo-quote.js?v=1'))return text;
  text=replaceOnce(text,'window.qnVoiceMount?.(body);','window.qnVoiceMount?.(body); body.qnPhotoQuote=q.photoQuote||null; window.qnPhotoQuoteMount?.(body);');
  text=replaceOnce(text,'data.discount=discount;data.taxRate=body.qnTaxInfo.rate;data.taxLabel=body.qnTaxInfo.label;',
    'if(body.qnPhotoQuote)data.photoQuote=JSON.parse(JSON.stringify(body.qnPhotoQuote));\n    data.discount=discount;data.taxRate=body.qnTaxInfo.rate;data.taxLabel=body.qnTaxInfo.label;');
  return replaceOnce(text,'</body>','<link rel="stylesheet" href="/photo-quote.css?v=1">\n<script src="/photo-quote.js?v=1"></script>\n</body>');
}
function autosave(text){
  if(text.includes('photoQuote:body.qnPhotoQuote'))return text;
  text=replaceOnce(text,'if(draft.voiceDraft)body.qnVoiceDraft=true;',
    'if(draft.voiceDraft)body.qnVoiceDraft=true;\n      if(draft.photoQuote){body.qnPhotoQuote=clone(draft.photoQuote);window.qnPhotoQuoteMount?.(body);}');
  return replaceOnce(text,'voiceDraft:!!body.qnVoiceDraft,','voiceDraft:!!body.qnVoiceDraft,photoQuote:body.qnPhotoQuote?clone(body.qnPhotoQuote):null,');
}
module.exports={app,autosave};
if(require.main===module){
  const root=path.resolve(process.argv[2]||'.');
  // Validate all targets before touching any file. This intentionally rejects
  // the old GitHub main; use the recovered current production source.
  const files=['app.html','index.html'].map(name=>({name,data:app(fs.readFileSync(path.join(root,name),'utf8'))}));
  files.push({name:'form-autosave.js',data:autosave(fs.readFileSync(path.join(root,'form-autosave.js'),'utf8'))});
  for(const file of files)fs.writeFileSync(path.join(root,file.name),file.data);
}
