/* Quote.Noble: compare saved data by value and review genuine conflicts. */
(function () {
  "use strict";
  const collections = ["clients", "quotes", "invoices", "jobs", "smartTemplates", "expenses", "inspections", "roofDesigns"];
  let client, uid, scope, generation = 0, ready = false, running = false, connecting = false;
  let timer, hideTimer, lastSnapshot = "", remoteRow = null, conflict = null, dialog = null;
  let retryConnect = false, pending = false, backupValue = "", backupKey = "", baselineRecord = null;
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalize(value) {
    const copy = clone(value);
    for (const key of collections) if (copy[key] == null) copy[key] = [];
    if (copy.photos == null) copy.photos = {};
    if (copy.reports == null) copy.reports = {};
    if (copy.seq == null) copy.seq = {quote: 1001, invoice: 2001};
    return copy;
  }
  function stable(value) {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + stable(value[k])).join(",") + "}";
    return JSON.stringify(value);
  }
  const fingerprint = value => stable(normalize(value));
  const valid = value => value && typeof value === "object" && ["clients", "quotes", "invoices"].every(k => Array.isArray(value[k]));
  const hasWork = value => !!(value.profile?.businessName || collections.some(k => value[k]?.length) || Object.keys(value.photos || {}).length || Object.keys(value.reports || {}).length);
  function node(tag, text, cls) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function button(text, action, cls = "btn btn-outline") {
    const b = node("button", text, cls); b.type = "button"; b.addEventListener("click", action); return b;
  }
  let lastFailure='';
  function cloudFailure(error){
    const code=String(error?.code||error?.status||'').slice(0,40);
    const message=String(error?.message||error?.error||'').replace(/data:image\/[^ ]+/gi,'[image]').slice(0,220);
    if(error?.status===413||/payload too large|request entity too large|body.*large/i.test(message))return 'The cloud request is too large. Your device copy is kept. (413)';
    if(/jwt|token.*expir|invalid.*token/i.test(message)||error?.status===401)return 'Your cloud session needs reconnecting. Keep this device copy. '+(code?'('+code+')':'');
    if(/failed to fetch|network|load failed/i.test(message))return 'The cloud request could not reach the server. '+(code?'('+code+')':'');
    return 'Cloud error'+(code?' ('+code+')':'')+': '+(message||'No error details were returned.');
  }
  function renderAutosave(message,warning){
    const title=document.getElementById('qn-autosave-title'),detail=document.getElementById('qn-autosave-detail'),time=document.getElementById('qn-autosave-time'),action=document.getElementById('qn-autosave-action');
    let state='saving',heading='Saving automatically…',description='Your changes are being saved to your account.';
    if(window.qnSaveFailed){state='attention';heading='Device storage needs attention';description='Keep your work open. Free some device storage so drafts can be saved safely.';}
    else if(conflict){state='attention';heading='Some changes need review';description='Both saved copies are kept. Review the changes to finish syncing safely.';}
    else if(!navigator.onLine){state='offline';heading='Saved on this device';description='No internet connection. Cloud sync will resume automatically when you are online.';}
    else if(warning){state='pending';heading='Cloud save pending';description=lastFailure||message||'Cloud save has not completed. Your device copy is kept.';}
    else if(message.includes('✓')){state='saved';heading=remoteRow?'Saved to your account':'Autosave is on';description=remoteRow?'Your saved records are up to date. No manual sync is needed.':'Your records will sync automatically as you work.';}
    else if(connecting){heading='Checking your saved records…';description='Connecting to your account automatically.';}
    const updatedAt=state==='saved'?remoteRow?.updated_at:null;
    window.qnAutosaveState={state,title:heading,detail:description,updatedAt};
    if(title){title.textContent=heading;title.closest('.qn-autosave-card')?.setAttribute('data-state',state);}
    if(detail)detail.textContent=description;
    if(time){time.hidden=!updatedAt;if(updatedAt)time.textContent='Last cloud save: '+new Date(updatedAt).toLocaleString();}
    if(action){action.hidden=!conflict&&(!warning||!navigator.onLine);action.textContent=conflict?'Review changes':'Try again';action.onclick=()=>{if(conflict)openReview();else if(ready){clearTimeout(timer);push();}else window.qnCloudConnect(client,{id:uid});};}
    document.dispatchEvent(new CustomEvent('qn-autosave-status',{detail:window.qnAutosaveState}));
  }
  function status(message, warning = false) {
    renderAutosave(message,warning);
    let bar = document.getElementById("qn-save-status");
    if (!bar) {
      bar = node("div", undefined, "qn-sync-status"); bar.id = "qn-save-status";
      bar.setAttribute("role", "status");
      const header = document.querySelector(".app-header");
      if (header) header.insertAdjacentElement("afterend", bar); else document.body.appendChild(bar);
    }
    clearTimeout(hideTimer); bar.hidden = false; bar.replaceChildren(node("span", message));
    bar.classList.toggle("qn-sync-warning", warning);
    if (conflict) bar.appendChild(button("Review copies", openReview));
    else if (warning && client) bar.appendChild(button("Retry sync", () => window.qnCloudConnect(client, {id: uid})));
    if (!warning) hideTimer = setTimeout(() => { bar.hidden = true; }, message.includes("✓") ? 2200 : 6000);
  }
  const baselineKey=()=>"qn_last_cloud_snapshot_"+(scope||uid);
  function baseline(){return baselineRecord?fingerprint(baselineRecord):"";}
  async function loadBaseline(){
    const key=baselineKey();
    try{
      const saved=await window.QNInspectionPhotos.readSnapshot(key);
      if(saved){
        try{const raw=localStorage.getItem(key);if(raw){await window.QNInspectionPhotos.writeSnapshot(key+':legacy:'+Date.now(),JSON.parse(raw));if(localStorage.getItem(key)===raw)localStorage.removeItem(key);}}catch(_){}
        return saved;
      }
    }catch(_){}
    try{
      const raw=localStorage.getItem(key);if(!raw)return null;const saved=JSON.parse(raw);
      // Preserve and verify legacy snapshots before releasing their small-storage quota.
      await window.QNInspectionPhotos.writeSnapshot(key,saved);
      if(localStorage.getItem(key)===raw)localStorage.removeItem(key);return saved;
    }catch(_){/* Retain the old snapshot if larger storage is unavailable. */}
    return null;
  }
  function remember(value){
    lastSnapshot=fingerprint(value);baselineRecord=clone(value);const key=baselineKey(),saved=baselineRecord;
    window.QNInspectionPhotos.writeSnapshot(key,saved).catch(()=>{/* Cloud and device reports remain saved. */});
  }
  // Recovery snapshots use IndexedDB, independent of the small localStorage quota.
  function recoveryDB() {
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('quotenoble-recovery',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('copies');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(Error('Close other Quote Noble tabs and retry recovery.'));
    });
  }
  async function recoveryStore(key,value) {
    const db=await recoveryDB();
    try {
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('copies','readwrite');tx.objectStore('copies').put(value,key);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Recovery backup was not saved.'));
      });
      const saved=await new Promise((resolve,reject)=>{
        const r=db.transaction('copies').objectStore('copies').get(key);
        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
      });
      if(saved!==value)throw Error('Recovery backup verification failed.');
    } finally { db.close(); }
  }
  async function recoveryCopies() {
    const db=await recoveryDB();
    try { return await new Promise((resolve,reject)=>{
      const entries=[],r=db.transaction('copies').objectStore('copies').openCursor();
      r.onsuccess=()=>{const cursor=r.result;if(!cursor)return resolve(entries);entries.push([cursor.key,cursor.value]);cursor.continue();};
      r.onerror=()=>reject(r.error);
    }); } finally { db.close(); }
  }
  async function backup(local, remote) {
    const value=JSON.stringify({device:local,cloud:remote});
    if(value===backupValue&&backupKey)return;
    const prefix='qn_sync_recovery_'+(scope||uid)+'_',key=prefix+Date.now();
    await recoveryStore(key,value);
    backupValue=value;backupKey=key;
    // Relocate only this account's old recovery snapshots, after verifying each copy.
    const keys=[];
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(prefix))keys.push(k);}
    for(const k of keys){
      const old=localStorage.getItem(k);if(old===null)continue;
      try { await recoveryStore(k,old);if(localStorage.getItem(k)===old)localStorage.removeItem(k); }
      catch(_) { /* Keep the original recovery snapshot when migration fails. */ }
    }
  }
  async function pause(row) {
    ready = false; clearTimeout(timer); remoteRow = row;
    conflict = {row: clone(row), backupOK: false};
    try { await backup(DB, row.payload); conflict.backupOK = true; } catch (_) { /* Review can still download both copies. */ }
    status(conflict.backupOK ? "Two saved copies need review · backups kept" : "Two saved copies need review · download backups", true);
  }
  function refreshView() {
    const active = document.querySelector(".view.active");
    if (typeof showView === "function") showView(active?.id?.replace(/^view-/, "") || "home");
  }
  async function restore(value) {
    const previous=DB,next=normalize(value),account=LS_KEY,signature=fingerprint(DB);
    await window.QNInspectionPhotos.prepare(next,account);
    if(account!==LS_KEY||DB!==previous||fingerprint(DB)!==signature)throw Error('Device records changed while loading photos. Retry sync.');
    if (!storage.save(next)) { storage.save(previous); throw Error("The cloud copy could not be saved on this device. Your current work is still open."); }
    DB = next; refreshView();
    const opened=window.qnCurrentDocument,root=document.getElementById('doc-root');
    if(opened&&root?.firstChild&&window.qnRenderSavedDocument){
      const exists=(opened.kind==='q'?DB.quotes:DB.invoices).some(record=>record.id===opened.id);
      if(exists){const y=window.scrollY||0;window.qnRenderSavedDocument(opened.kind,opened.id);window.scrollTo?.(0,y);}
      else root.replaceChildren();
    }
  }
  async function readCloud(sb, userId) {
    const company=window.qnCompanySession;
    let companyRow=null;
    if(company?.ownerId&&window.qnCompanyRead){
      try{
        const row=await window.qnCompanyRead(company.ownerId);
        if(row&&(!valid(row.payload)||!row.updated_at))throw Error('Invalid company data. Your device copy is kept.');
        if(row)companyRow={...row,source:'company'};
      }catch(error){
        if(company.shared&&company.ownerId!==userId)throw error;
      }
    }
    let userRow=null;
    if(!company?.shared||company.ownerId===userId){
      const {data, error} = await sb.from("user_documents").select("payload,updated_at").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (data && (!valid(data.payload) || !data.updated_at)) throw Error("Cloud data needs review. Your device copy has been kept.");
      if(data)userRow={...data,source:'user'};
    }
    if(companyRow&&hasWork(companyRow.payload))return companyRow;
    if(userRow&&hasWork(userRow.payload))return userRow;
    return companyRow||userRow||null;
  }
  function nextTimestamp(row) {
    return new Date(Math.max(Date.now(), row ? Date.parse(row.updated_at) + 1 : 0)).toISOString();
  }
  // Choosing a copy chooses conflicting edits, not permission to discard other records.
  function preserveRecords(preferred, other) {
    const next=normalize(preferred), alternate=normalize(other);
    if(alternate.formDrafts||next.formDrafts)next.formDrafts={...(alternate.formDrafts||{}),...(next.formDrafts||{})};
    const markers={...(alternate.deletedRecords||{}),...(next.deletedRecords||{})};
    if(Object.keys(markers).length)next.deletedRecords=markers;
    for(const key of ['clients','quotes','invoices','jobs','expenses','inspections','roofDesigns']){
      const ids=new Set(next[key].map(record=>record.id));
      for(const record of alternate[key])if(!ids.has(record.id)){next[key].push(clone(record));ids.add(record.id);}
      next[key]=next[key].filter(record=>!markers[key+':'+record.id]);
    }
    for(const key of ['quote','invoice'])next.seq[key]=Math.max(next.seq[key]||0,alternate.seq[key]||0);
    return next;
  }
  async function writeCloud(sb, userId, value, expected) {
    const company=window.qnCompanySession;
    if((expected?.source==='company'||company?.shared&&company.ownerId!==userId)&&window.qnCompanyWrite&&company?.ownerId){
      const row=await window.qnCompanyWrite(company.ownerId,value,expected?.updated_at||null);
      return {payload:clone(value),updated_at:row.updated_at,source:'company'};
    }
    const changes = {payload: value, updated_at: nextTimestamp(expected)};
    const query = expected
      ? sb.from("user_documents").update(changes).eq("user_id", userId).eq("updated_at", expected.updated_at)
      : sb.from("user_documents").insert({user_id: userId, ...changes});
    const {data, error} = await query.select("updated_at").maybeSingle();
    if (error || !data) {
      if (!data && !error || error?.code === "23505") { const e = Error("The cloud copy changed. Review the latest copies before continuing."); e.stale = true; throw e; }
      throw error;
    }
    return {payload: clone(value), updated_at: data.updated_at};
  }
  async function push() {
    if (!ready || !client || !uid || running || connecting) return;
    if (!navigator.onLine) { status("Saved on device · waiting for internet", true); return; }
    if(remoteRow){
      const protectedValue=preserveRecords(DB,remoteRow.payload);
      if(fingerprint(protectedValue)!==fingerprint(DB)){
        try { await restore(protectedValue); }
        catch(error){status(error.message,true);return;}
      }
    }
    const value = clone(DB), signature = fingerprint(value);
    if (signature === lastSnapshot) return;
    const gen = generation, sb = client, userId = uid, expected = remoteRow;
    running = true;
    try {
      const written = await writeCloud(sb, userId, value, expected);
      if (gen !== generation) return;
      remoteRow = written; remember(value); lastFailure="";
      pending = fingerprint(DB) !== signature;
      status(pending ? "Saving newer changes…" : "Saved to cloud ✓");
    } catch (e) {
      if (gen !== generation) return;
      if (String(e.message||e.error||"").includes("QN_DOCUMENT_CONFLICT")) {
        try { const fresh=await readCloud(sb,userId); if(gen===generation&&fresh)await pause(fresh); }
        catch(_){ready=false;status("Saved on device · cloud records need review",true);}
      }
      else if (e.stale) { ready = false; retryConnect = true; }
      else {lastFailure=cloudFailure(e);status(lastFailure,true);}
    } finally {
      running = false;
      if (retryConnect) { retryConnect = false; window.qnCloudConnect(client, {id: uid}); }
      else if (pending) { pending = false; window.qnCloudSave(); }
    }
  }
  window.qnCloudSave = function () {
    if (!ready) { pending = true; status(window.qnSaveFailed ? "Device storage failed · keep this page open and retry sync" : conflict ? "Saved on device · review copies to finish cloud sync" : "Saved on device · cloud sync pending", true); return; }
    if (running) { pending = true; return; }
    status("Saving…"); clearTimeout(timer); timer = setTimeout(push, 800);
  };
  window.qnCloudConnect = async function (sb, user) {
    if (!sb || !user?.id) return;
    if(uid===user.id&&editing()){retryConnect=true;return;}
    if (uid === user.id && (running || connecting)) { retryConnect = true; return; }
    if (uid !== user.id && dialog) dialog.close();
    client = sb; uid = user.id; window.qnApprovalSession = {client:sb,user}; const gen = ++generation;
    ready = false; connecting = true; conflict = null; clearTimeout(timer);
    status("Checking saved cloud data…");
    try {
      if(window.qnCompanyResolve){
        const company=await window.qnCompanyResolve(sb,user);
        if(gen!==generation)return;
        scope=user.id+(company.ownerId===user.id?'':'_'+company.ownerId);
        window.qnApprovalSession={client:sb,user:{...user,id:company.ownerId},actorId:user.id};
        document.dispatchEvent(new Event('qn-billing-status-checking'));
      }else scope=user.id;
      const loadedBaseline=await loadBaseline();if(gen!==generation)return;baselineRecord=loadedBaseline;
      const row = await readCloud(sb, user.id);
      if (gen !== generation) return;
      remoteRow = row;
      if (!row) {
        lastSnapshot = "";
        // An empty new origin must not upload a blank workspace when the company
        // list could not be loaded. That insert would be a second cloud copy.
        if (window.qnCompanyListFailed && !hasWork(DB)) {
          ready = false;
          status("Saved on device · company cloud access unavailable", true);
          return;
        }
        ready = true; if (hasWork(DB)) pending = true; else status("Ready to save ✓"); return;
      }
      const local = fingerprint(DB), remote = fingerprint(row.payload), base = baseline();
      if (local === remote) { remember(DB); ready = true; status("Saved to cloud ✓"); return; }
      if (!hasWork(DB) && !base || base && base === local) {
        await backup(DB, row.payload); if(gen!==generation||fingerprint(DB)!==local)throw Error("Device records changed. Retry sync."); await restore(row.payload); remember(DB); ready = true; status("Cloud changes restored ✓"); return;
      }
      if (!hasWork(row.payload) && !base || base && base === remote) {
        await backup(DB, row.payload); if(gen!==generation)return; lastSnapshot = remote; ready = true; pending = true; return;
      }
      if(window.qnMergeCompanyCopies){
        const previous=baselineRecord;
        const merged=window.qnMergeCompanyCopies(previous||null,normalize(DB),normalize(row.payload));
        if(merged){await backup(DB,row.payload);if(gen!==generation||fingerprint(DB)!==local)throw Error("Device records changed. Retry sync.");await restore(merged);remember(row.payload);ready=true;pending=true;status('Company changes merged · saving…');return;}
      }
      await pause(row);
    } catch (e) {
      if (gen === generation) {
        ready = false;
        const message=String(e?.message||'').toLowerCase();
        const reason=/timeout|timed out|abort/.test(message)?'Cloud connection timed out':
          /session|sign.in|jwt|token|unauthoriz|401|403|permission/.test(message)?'Sign in again to reconnect cloud':
          /company|partner|membership|access/.test(message)?'Company cloud access unavailable':
          /photos|storage|device records/.test(message)?'Local photos or records need review':
          !navigator.onLine?'Internet connection unavailable':'Cloud check failed — please retry';
        lastFailure=cloudFailure(e);status('Saved on device · '+reason,true);
        console.warn('Quote.Noble cloud read failed', {reason, code:e?.code||null, status:e?.status||null});
      }
    } finally {
      if (gen === generation) {
        connecting = false;
        if(ready)document.dispatchEvent(new Event('qn-billing-refresh'));
        setTimeout(()=>Promise.resolve(window.qnCompanyAfterConnect?.()).catch(()=>{}),0);
        if (retryConnect) { retryConnect = false; window.qnCloudConnect(client, {id: uid}); }
        else if (pending && ready) { pending = false; window.qnCloudSave(); }
      }
    }
  };
  window.qnCloudFlush = async function () {
    const start = Date.now();
    while (running || connecting) {
      if (Date.now() - start > 15000) throw Error("Cloud saving is taking longer than expected. Please try again.");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready || !client || !uid || !navigator.onLine) throw Error("Finish cloud sync before sharing this quote.");
    clearTimeout(timer);
    for (let attempt = 0; attempt < 4; attempt++) {
      if (!ready) throw Error(lastFailure || "Cloud sync needs attention. Your device copy is safe.");
      while (running || connecting) {
        if (Date.now() - start > 20000) throw Error(lastFailure || "Cloud saving is taking longer than expected.");
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      if (fingerprint(DB) === lastSnapshot) return;
      await push();
      if (ready && fingerprint(DB) === lastSnapshot) return;
      if (lastFailure) throw Error("Cloud save failed: " + lastFailure + ". Your device copy is safe.");
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    throw Error(lastFailure || "The latest quote is still saving. Please retry after cloud sync completes.");
  };
  function download(value, label) {
    const link = node("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: "application/json"}));
    link.download = "QuoteNoble-" + label + "-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
    (document.querySelector("dialog[open]") || document.body).appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  }
  function summary(value) {
    return ["quotes", "invoices", "clients", "jobs"].map(k => (value[k] || []).length + " " + k).join(" · ");
  }
  function describe(value, key = "") {
    if (value == null) return "—";
    if (typeof value === "string" && value.startsWith("data:image/")) return "Saved image";
    if (Array.isArray(value)) return value.length ? value.map((v, i) => (i + 1) + ". " + describe(v)).join("\n") : "None";
    if (typeof value === "object") return Object.entries(value).filter(([k]) => !["id", "clientId", "quoteId", "invoiceId"].includes(k)).map(([k, v]) => k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()) + ": " + describe(v, k)).join("\n");
    if (typeof value === "number" && ["price", "amount", "depositPaid", "materialCost"].includes(key)) return new Intl.NumberFormat("en-CA", {style:"currency", currency:"CAD"}).format(value / 100);
    return String(value);
  }
  function recordDescription(record, data) {
    if (!record) return "Not present in this copy";
    const customer = (data.clients || []).find(c => c.id === record.clientId);
    return (customer ? "Customer: " + customer.name + "\n" : "") + describe(record);
  }
  function differences(local, remote, container) {
    let count = 0;
    function add(title, left, right) {
      count++; const details = node("details", undefined, "qn-sync-difference");
      details.appendChild(node("summary", title));
      const columns = node("div", undefined, "qn-sync-columns");
      for (const [label, value] of [["This device", left], ["Cloud copy", right]]) {
        const column = node("div"); column.append(node("strong", label), node("pre", value)); columns.appendChild(column);
      }
      details.appendChild(columns); container.appendChild(details);
    }
    for (const key of collections) {
      const left = local[key] || [], right = remote[key] || [];
      if (stable(left) === stable(right)) continue;
      const identifiable = [...left, ...right].every(r => r && r.id) && new Set(left.map(r => r.id)).size === left.length && new Set(right.map(r => r.id)).size === right.length;
      if (!identifiable) { add(key, describe(left), describe(right)); continue; }
      const ids = new Set([...left, ...right].map(r => r.id)); let recordChanges = 0;
      for (const id of ids) {
        const a = left.find(r => r.id === id), b = right.find(r => r.id === id);
        if (stable(a) === stable(b)) continue;
        recordChanges++; const item = a || b;
        add((key[0].toUpperCase() + key.slice(1)) + " · " + (item.number || item.name || item.title || "Record"), recordDescription(a, local), recordDescription(b, remote));
      }
      if (!recordChanges) add(key + " order", left.map(r => r.number || r.name || r.title || r.id).join("\n"), right.map(r => r.number || r.name || r.title || r.id).join("\n"));
    }
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      if (!collections.includes(key) && stable(local[key]) !== stable(remote[key])) add(key === "profile" ? "Business details" : key === "seq" ? "Next document numbers" : key.replace(/^./, c => c.toUpperCase()), describe(local[key]), describe(remote[key]));
    }
    return count;
  }
  async function openReview() {
    if (dialog) { dialog.focus(); return; }
    if (!conflict) { await window.qnCloudConnect(client, {id: uid}); if (!conflict) return; }
    const reviewed = {local: clone(DB), row: clone(conflict.row)}, gen = generation;
    const localPrint = fingerprint(reviewed.local), remotePrint = fingerprint(reviewed.row.payload);
    const previousFocus = document.activeElement, oldOverflow = document.body.style.overflow;
    const d = node("dialog", undefined, "qn-sync-dialog"); dialog = d;
    d.setAttribute("aria-labelledby", "qn-sync-title");
    const heading = node("div", undefined, "qn-sync-heading"), title = node("h2", "Finish cloud sync"); title.id = "qn-sync-title";
    heading.append(title, button("Close", () => d.close())); d.appendChild(heading);
    d.appendChild(node("p", "Some edits differ between this device and the cloud. Open the differences below before choosing. Other documents and recovery backups are kept."));
    const list = node("section"), count = differences(normalize(reviewed.local), normalize(reviewed.row.payload), list);
    d.append(node("h3", count + " differences to review"), list);
    const cards = node("div", undefined, "qn-sync-columns");
    const confirmation = node("section", undefined, "qn-sync-confirm"); confirmation.hidden = true;
    const confirmationText = node("p"), feedback = node("p"); feedback.setAttribute("role", "status");
    let selected = null, busy = false;
    for (const [side, label, value] of [["device", "This device", reviewed.local], ["cloud", "Cloud copy", reviewed.row.payload]]) {
      const card = node("section", undefined, "qn-sync-copy");
      card.append(node("h3", label), node("strong", value.profile?.businessName || "Business not set"), node("p", summary(value)));
      if (side === "cloud") card.appendChild(node("small", "Saved " + new Date(reviewed.row.updated_at).toLocaleString()));
      card.appendChild(button("Download " + (side === "device" ? "device" : "cloud") + " backup", () => download(value, side + "-backup")));
      card.appendChild(button("Choose " + (side === "device" ? "this device" : "cloud copy"), () => {
        selected = side; confirmation.hidden = false;
        confirmationText.textContent = side === "device" ? "Use this device’s edits? Other cloud documents will also be kept. Both copies will be kept as recovery backups on this device." : "Use the cloud edits? Documents created only on this device will also be kept. Both copies will be kept as recovery backups on this device.";
        feedback.textContent = ""; confirmation.scrollIntoView?.({block:"nearest"}); confirmButton.focus();
      }, "btn btn-primary"));
      cards.appendChild(card);
    }
    d.appendChild(cards);
    const confirmButton = button("Confirm and resume sync", async () => {
      if (busy || !selected) return; busy = true;
      d.querySelectorAll("button").forEach(b => b.disabled = true); feedback.textContent = "Checking the latest cloud copy…";
      try {
        if (gen !== generation || fingerprint(DB) !== localPrint) throw Object.assign(Error("Your device copy changed. Close this review and open it again."), {changed:true});
        const fresh = await readCloud(client, uid);
        if (gen !== generation || fingerprint(DB) !== localPrint) throw Object.assign(Error("Your device copy changed. Close this review and open it again."), {changed:true});
        if (!fresh || fresh.updated_at !== reviewed.row.updated_at || fingerprint(fresh.payload) !== remotePrint) {
          if (fresh) await pause(fresh);
          throw Object.assign(Error("The cloud copy changed. Close this review and open it again."), {changed:true});
        }
        await backup(reviewed.local, fresh.payload);
        if(gen!==generation||fingerprint(DB)!==localPrint)throw Error('Your device copy changed. Close this review and open it again.');
        const resolved=selected==='device'?preserveRecords(reviewed.local,fresh.payload):preserveRecords(fresh.payload,reviewed.local);
        const written=await writeCloud(client,uid,resolved,fresh);
        if(gen!==generation)return;
        await restore(resolved); remoteRow=written; remember(resolved);
        conflict = null; ready = true; d.close(); status("Copies resolved · saved to cloud ✓");
        if (fingerprint(DB) !== lastSnapshot) window.qnCloudSave();
      } catch (e) {
        feedback.textContent = e.stale ? "The cloud copy changed. Close this review and open it again." : e.message || "Could not resume sync. Both original copies are unchanged.";
        if (e.stale) await window.qnCloudConnect(client, {id: uid});
        d.querySelectorAll("button").forEach(b => b.disabled = false);
        if (e.changed || e.stale) confirmButton.disabled = true;
      } finally { busy = false; }
    }, "btn btn-primary");
    confirmation.append(confirmationText, confirmButton, feedback); d.appendChild(confirmation);
    d.addEventListener("cancel", e => { if (busy) e.preventDefault(); });
    d.addEventListener("close", () => { d.remove(); if (dialog === d) dialog = null; document.body.style.overflow = oldOverflow; previousFocus?.focus?.({preventScroll:true}); });
    document.body.appendChild(d); document.body.style.overflow = "hidden"; d.showModal(); window.qnTrackDialog?.(d,openReview);
  }
  window.qnReviewSync = openReview;
  async function openRecovery() {
    if (dialog) { dialog.focus(); return; }
    if (!uid) return;
    const d = node("dialog", undefined, "qn-sync-dialog"), previousFocus = document.activeElement, oldOverflow = document.body.style.overflow;
    dialog = d; const title = node("h2", "Recovery backups"); title.id = "qn-recovery-title"; d.setAttribute("aria-labelledby", title.id);
    const heading = node("div", undefined, "qn-sync-heading"); heading.append(title, button("Close", () => d.close())); d.appendChild(heading);
    d.appendChild(node("p", "Download either saved copy. You can restore the downloaded file from Backup & restore."));
    const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key?.startsWith("qn_sync_recovery_" + (scope||uid) + "_")) keys.push(key); } } catch (_) { /* No readable recovery storage. */ }
    const archived=new Map();
    try { for(const [key,value] of await recoveryCopies())if(key.startsWith("qn_sync_recovery_"+(scope||uid)+"_"))archived.set(key,value); }
    catch(_) { d.appendChild(node("p","Additional recovery backups could not be opened. Please retry.")); }
    for(const key of keys)archived.set(key,localStorage.getItem(key));
    let shown = 0;
    for (const key of [...archived.keys()].sort().reverse()) {
      try {
        const copies = JSON.parse(archived.get(key));
        if (!valid(copies.device) || !valid(copies.cloud)) continue;
        shown++; const card = node("section", undefined, "qn-sync-copy");
        card.appendChild(node("h3", new Date(Number(key.slice(key.lastIndexOf("_") + 1))).toLocaleString()));
        for (const [side, label] of [["device", "Device"], ["cloud", "Cloud"]]) {
          card.append(node("p", label + ": " + summary(copies[side])), button("Download " + label.toLowerCase() + " recovery", () => download(copies[side], side + "-recovery")));
        }
        d.appendChild(card);
      } catch (_) { /* Ignore unreadable recovery items without deleting them. */ }
    }
    if (!shown) d.appendChild(node("p", "No recovery backups have been created for this account on this device yet."));
    d.addEventListener("close", () => { d.remove(); if (dialog === d) dialog = null; document.body.style.overflow = oldOverflow; previousFocus?.focus?.({preventScroll:true}); });
    document.body.appendChild(d); document.body.style.overflow = "hidden"; d.showModal(); window.qnTrackDialog?.(d,openRecovery);
  }
  function editing(){return !!window.QNInspections?.isEditing?.()||!!document.querySelector('#modal-root .modal,dialog[open]');}
  async function pollCloud(){
    if(retryConnect&&client&&uid&&!running&&!connecting&&!editing()&&!document.hidden&&navigator.onLine){retryConnect=false;await window.qnCloudConnect(client,{id:uid});return;}
    if(!client||!uid||!ready||running||connecting||conflict||document.hidden||!navigator.onLine||editing()||!document.body.classList.contains('qn-authenticated'))return;
    if(fingerprint(DB)!==lastSnapshot){window.qnCloudSave();return;}
    const gen=generation,sb=client,userId=uid;connecting=true;
    try{
      let metadata;
      if(window.qnCompanySession?.shared&&window.qnCompanySession.ownerId!==userId&&window.qnCompanyRead)metadata=await window.qnCompanyRead(window.qnCompanySession.ownerId,true);
      else{const result=await sb.from('user_documents').select('updated_at').eq('user_id',userId).maybeSingle();if(result.error)throw result.error;metadata=result.data;}
      if(gen!==generation||!metadata||metadata.updated_at===remoteRow?.updated_at)return;
      const row=await readCloud(sb,userId);
      if(gen!==generation||!row||editing())return;
      if(fingerprint(DB)===lastSnapshot){await backup(DB,row.payload);if(gen!==generation||fingerprint(DB)!==lastSnapshot)return;await restore(row.payload);remoteRow=row;remember(row.payload);status('Company changes synced ✓');}
      else retryConnect=true;
    }catch(e){if(gen===generation){status(e.message||'Saved on device · cloud check unavailable',true);if(e.status===403||e.status===402)ready=false;}}
    finally{if(gen===generation){connecting=false;if(retryConnect){retryConnect=false;window.qnCloudConnect(client,{id:uid});}}}
  }
  setInterval(pollCloud,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(!ready&&!conflict&&client&&uid&&!running&&!connecting)window.qnCloudConnect(client,{id:uid});else pollCloud();}});
  window.qnSyncRecovery = openRecovery;
  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-qn-sync-review]")) openReview();
    if (e.target.closest?.("[data-qn-sync-recovery]")) openRecovery();
  });
  window.addEventListener("online", () => { if (client && uid) window.qnCloudConnect(client, {id: uid}); });
  setInterval(() => {
    if(!navigator.onLine||running||connecting)return;
    if(ready)push();
    else if(client&&uid&&!conflict&&!document.hidden)window.qnCloudConnect(client,{id:uid});
  }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && ready) { clearTimeout(timer); push(); } });
  window.addEventListener("pagehide", () => { if (ready) { clearTimeout(timer); push(); } });
})();

