/* Quote.Noble Smart Templates: quote-item adapter. No persistence side effects. */
(function(root){
"use strict";
function requireLibrary(){const lib=root.QuoteNobleSmartTemplates;if(!lib||!Array.isArray(lib.templates))throw new Error("Load smart-templates/library.js first");return lib;}
function toQuoteItem(templateId, options){
const template=requireLibrary().templates.find(t=>t.id===templateId);
if(!template)throw new Error("Unknown service template: "+templateId);
const opts=options||{};
const quantity=opts.quantity===undefined?1:Number(opts.quantity);
const unitPrice=opts.unitPrice===undefined?0:Number(opts.unitPrice);
if(!Number.isFinite(quantity)||quantity<=0)throw new Error("Quantity must be greater than zero");
if(!Number.isFinite(unitPrice)||unitPrice<0)throw new Error("Price must be zero or greater");
return {name:template.name,description:typeof opts.description==="string"?opts.description:template.description,quantity,unitPrice,templateId:template.id};
}
function insertIntoQuote(quote,templateId,options){
if(!quote||typeof quote!=="object")throw new TypeError("Quote must be an object");
const item=toQuoteItem(templateId,options);
return {...quote,items:[...(Array.isArray(quote.items)?quote.items:[]),item]};
}
function findTemplates(query,trade){return requireLibrary().search(query,trade);}
root.QuoteNobleSmartTemplateAdapter=Object.freeze({toQuoteItem,insertIntoQuote,findTemplates});
})(typeof window!=="undefined"?window:globalThis);
