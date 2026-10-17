from pathlib import Path
p=Path("index.html")
s=p.read_text()
if "QN_SERVICE_LIBRARY" in s:
 print("Already patched")
 raise SystemExit(0)
categories={
"Roofing":["Asphalt shingle replacement","Architectural shingles installation","Roof tear-off and disposal","Roof leak repair","Roof inspection","Roof ventilation installation","Ridge vent installation","Roof exhaust vent installation","Chimney flashing repair","Skylight replacement","Skylight flashing repair","Synthetic slate roofing","Cedar roofing installation","Metal roof installation","Flat roof membrane replacement","Flat roof repair"],
"Gutters":["Eavestrough installation","Eavestrough replacement","Gutter cleaning","Leaf guard installation","Downspout installation","Downspout relocation","Soffit installation","Fascia replacement"],
"HVAC":["Furnace installation","Furnace replacement","Air conditioner installation","Air conditioner replacement","Heat pump installation","Heat pump service","Ductwork installation","Duct cleaning"],
"Exterior":["Siding installation","Siding repair","Window replacement","Exterior door installation"],
"General":["Interior painting","Drywall repair","Bathroom renovation","Kitchen renovation"]}
import json
lib="""
const QN_SERVICE_LIBRARY=__LIBRARY__;
function qnBindServiceLibrary(body){
 const cat=body.querySelector('#qn-library-category'), service=body.querySelector('#qn-library-service'), apply=body.querySelector('#qn-library-apply');if(!cat||!service||!apply)return;
 cat.innerHTML='<option value="">Select category</option>'+Object.keys(QN_SERVICE_LIBRARY).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 cat.onchange=()=>{service.innerHTML='<option value="">Select service</option>'+(QN_SERVICE_LIBRARY[cat.value]||[]).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');};
 apply.onclick=()=>{const name=service.value;if(!name)return alert('Choose a service first.');const wrap=body.querySelector('#items-wrap');const items=readItems(body);const scope='Supply labour and standard installation materials for '+name.toLowerCase()+'. Inspect and prepare the work area; complete the agreed work to applicable standards; remove job-related debris and leave the area clean. Confirm quantities, material specifications, exclusions and site conditions before sending.';items.push({service:name,desc:scope,qty:1,price:0});wrap.innerHTML=itemRowsHTML(items);updateLiveTotals(body);};
}
""".replace("__LIBRARY__",json.dumps(categories))
def change(old,new):
 global s
 assert old in s, "Missing anchor: "+old[:80]
 s=s.replace(old,new,1)
change("function openQuoteForm(existing, presetClientId) {",lib+"\nfunction openQuoteForm(existing, presetClientId) {")
needle="'<div class=\"field\"><label>Line items</label><div id=\"items-wrap\">'"
insertion="""'<div class="field" style="padding:14px;border:1px solid #e6c79c;border-radius:12px;background:#fffaf2"><label style="font-weight:750;color:#92400e">✦ Smart Templates · Service Library</label><div class="hint" style="margin:6px 0 10px">Choose a trade and service to add an editable scope of work. Review details and enter your price.</div><select id="qn-library-category" aria-label="Service category" style="width:100%;margin-bottom:8px"></select><select id="qn-library-service" aria-label="Service template" style="width:100%;margin-bottom:8px"></select><button type="button" class="btn btn-primary btn-small" id="qn-library-apply">+ Add to quote</button></div>' +
    """+needle
change(needle,insertion)
change("bindItemRows(body); updateLiveTotals(body); qnBindMaterials(body);","bindItemRows(body); updateLiveTotals(body); qnBindMaterials(body); qnBindServiceLibrary(body);")
change("const ink=[29,38,50], muted=[103,115,128], accent=[188,104,38], light=[248,249,251], border=[224,230,236];","const ink=[29,38,50], muted=[103,115,128], accent=[198,106,39], light=[255,248,234], border=[236,211,177];")
change('pdf.setFillColor(255,255,255);pdf.rect(0,0,W,H,"F");','pdf.setFillColor(255,255,255);pdf.rect(0,0,W,H,"F");pdf.setFillColor(255,248,234);pdf.rect(0,0,W,first?91:46,"F");pdf.setFillColor(198,106,39);pdf.rect(0,first?89:44,W,2,"F");')
change("    font(8.5,true);color(muted);\n    text(\"DESCRIPTION\"","    pdf.setFillColor(255,248,234);pdf.roundedRect(M,y-2,contentW,33,4,4,'F');font(8.5,true);color(accent);\n    text(\"DESCRIPTION\"")
change("  let ty=y+23;","  pdf.setFillColor(255,248,234);pdf.roundedRect(boxX,y+4,boxW,isQ?100:142,7,7,'F');\n  let ty=y+23;")
p.write_text(s)
# Keep app.html identical to index.html when the repository stores the same application in both.
q=Path("app.html")
if q.exists() and q.read_bytes()!=p.read_bytes(): q.write_text(s)
print("Patched 40 service templates and unified quote/invoice PDF palette")
