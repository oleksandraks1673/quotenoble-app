/* Quote.Noble: compare saved data by value and review genuine conflicts. */
(function () {
  "use strict";
  const collections = ["clients", "quotes", "invoices", "jobs", "smartTemplates"];
  let client, uid, scope, generation = 0, ready = false, running = false, connecting = false;
  let timer, hideTimer, lastSnapshot = "", remoteRow = null, conflict = null, dialog = null;
  let retryConnect = false, pending = false, backupValue = "", backupKey = "";
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
  function status(message, warning = false) {
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
  function baseline() {
    try { const raw = localStorage.getItem("qn_last_cloud_snapshot_" + (scope||uid)); return raw ? fingerprint(JSON.parse(raw)) : ""; } catch (_) { return ""; }
  }
  function remember(value) {
    lastSnapshot = fingerprint(value);
    try { localStorage.setItem("qn_last_cloud_snapshot_" + (scope||uid), JSON.stringify(value)); } catch (_) { /* Current copies remain intact. */ }
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
  function restore(value) {
    const previous = DB, next = normalize(value);
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
    if(window.qnCompanySession?.shared&&window.qnCompanyRead){
      const row=await window.qnCompanyRead(window.qnCompanySession.ownerId);
      if(row&&(!valid(row.payload)||!row.updated_at))throw Error('Invalid company data. Your device copy is kept.');
      return row;
    }
    const {data, error} = await sb.from("user_documents").select("payload,updated_at").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (data && (!valid(data.payload) || !data.updated_at)) throw Error("Cloud data needs review. Your device copy has been kept.");
    return data;
  }
  function nextTimestamp(row) {
    return new Date(Math.max(Date.now(), row ? Date.parse(row.updated_at) + 1 : 0)).toISOString();
  }
  async function writeCloud(sb, userId, value, expected) {
    if(window.qnCompanySession?.shared&&window.qnCompanyWrite){
      const row=await window.qnCompanyWrite(window.qnCompanySession.ownerId,value,expected?.updated_at||null);
      return {payload:clone(value),updated_at:row.updated_at};
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
    const value = clone(DB), signature = fingerprint(value);
    if (signature === lastSnapshot) return;
    const gen = generation, sb = client, userId = uid, expected = remoteRow;
    running = true;
    try {
      const written = await writeCloud(sb, userId, value, expected);
      if (gen !== generation) return;
      remoteRow = written; remember(value);
      pending = fingerprint(DB) !== signature;
      status(pending ? "Saving newer changes…" : "Saved to cloud ✓");
    } catch (e) {
      if (gen !== generation) return;
      if (e.stale) { ready = false; retryConnect = true; }
      else status("Saved on device · cloud sync pending", true);
    } finally {
      running = false;
      if (retryConnect) { retryConnect = false; window.qnCloudConnect(client, {id: uid}); }
      else if (pending) { pending = false; window.qnCloudSave(); }
    }
  }
  window.qnCloudSave = function () {
    if (!ready) return;
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
      const row = await readCloud(sb, user.id);
      if (gen !== generation) return;
      remoteRow = row;
      if (!row) { lastSnapshot = ""; ready = true; if (hasWork(DB)) pending = true; else status("Ready to save ✓"); return; }
      const local = fingerprint(DB), remote = fingerprint(row.payload), base = baseline();
      if (local === remote) { remember(DB); ready = true; status("Saved to cloud ✓"); return; }
      if (!hasWork(DB) && !base || base && base === local) {
        await backup(DB, row.payload); if(gen!==generation||fingerprint(DB)!==local)throw Error("Device records changed. Retry sync."); restore(row.payload); remember(DB); ready = true; status("Cloud changes restored ✓"); return;
      }
      if (!hasWork(row.payload) && !base || base && base === remote) {
        await backup(DB, row.payload); if(gen!==generation)return; lastSnapshot = remote; ready = true; pending = true; return;
      }
      if(window.qnCompanySession?.shared&&window.qnMergeCompanyCopies&&base){
        let previous;try{previous=JSON.parse(localStorage.getItem('qn_last_cloud_snapshot_'+(scope||uid)));}catch{}
        const merged=previous?window.qnMergeCompanyCopies(previous,normalize(DB),normalize(row.payload)):null;
        if(merged){await backup(DB,row.payload);if(gen!==generation||fingerprint(DB)!==local)throw Error("Device records changed. Retry sync.");restore(merged);remember(row.payload);ready=true;pending=true;status('Company changes merged · saving…');return;}
      }
      await pause(row);
    } catch (e) {
      if (gen === generation) { ready = false; status("Saved on device · cloud check unavailable", true); }
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
    await push();
    if (!ready || fingerprint(DB) !== lastSnapshot) throw Error("The latest quote has not reached the cloud yet. Please retry after it is saved.");
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
    const heading = node("div", undefined, "qn-sync-heading"), title = node("h2", "Review saved copies"); title.id = "qn-sync-title";
    heading.append(title, button("Close", () => d.close())); d.appendChild(heading);
    d.appendChild(node("p", "Your device and cloud have different records. Review the differences, then choose the complete copy you want to use. Nothing changes until you confirm."));
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
        confirmationText.textContent = side === "device" ? "Use this device for all records? This replaces the active cloud copy. Both copies will be kept as recovery backups on this device." : "Use the cloud copy for all records? This replaces the active records on this device. Both copies will be kept as recovery backups on this device.";
        feedback.textContent = ""; confirmation.scrollIntoView?.({block:"nearest"}); confirmButton.focus();
      }, "btn btn-primary"));
      cards.appendChild(card);
    }
    d.appendChild(cards);
    const list = node("section"), count = differences(normalize(reviewed.local), normalize(reviewed.row.payload), list);
    d.append(node("h3", count + " differences to review"), list);
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
        if (selected === "device") {
          const written = await writeCloud(client, uid, reviewed.local, fresh);
          if (gen !== generation) return;
          remoteRow = written; remember(reviewed.local);
        } else { restore(fresh.payload); remoteRow = fresh; remember(DB); }
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
  function editing(){return !!document.querySelector('#modal-root .modal,dialog[open]');}
  async function pollCloud(){
    if(retryConnect&&client&&uid&&!running&&!connecting&&!editing()&&!document.hidden&&navigator.onLine){retryConnect=false;await window.qnCloudConnect(client,{id:uid});return;}
    if(!client||!uid||!ready||running||connecting||conflict||document.hidden||!navigator.onLine||editing()||!document.body.classList.contains('qn-authenticated'))return;
    if(fingerprint(DB)!==lastSnapshot){window.qnCloudSave();return;}
    const gen=generation,sb=client,userId=uid;connecting=true;
    try{
      let metadata;
      if(window.qnCompanySession?.shared&&window.qnCompanyRead)metadata=await window.qnCompanyRead(window.qnCompanySession.ownerId,true);
      else{const result=await sb.from('user_documents').select('updated_at').eq('user_id',userId).maybeSingle();if(result.error)throw result.error;metadata=result.data;}
      if(gen!==generation||!metadata||metadata.updated_at===remoteRow?.updated_at)return;
      const row=await readCloud(sb,userId);
      if(gen!==generation||!row||editing())return;
      if(fingerprint(DB)===lastSnapshot){await backup(DB,row.payload);if(gen!==generation||fingerprint(DB)!==lastSnapshot)return;restore(row.payload);remoteRow=row;remember(row.payload);status('Company changes synced ✓');}
      else retryConnect=true;
    }catch(e){if(gen===generation){status(e.message||'Saved on device · cloud check unavailable',true);if(e.status===403||e.status===402)ready=false;}}
    finally{if(gen===generation){connecting=false;if(retryConnect){retryConnect=false;window.qnCloudConnect(client,{id:uid});}}}
  }
  setInterval(pollCloud,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollCloud();});
  window.qnSyncRecovery = openRecovery;
  document.addEventListener("click", e => {
    if (e.target.closest?.("[data-qn-sync-review]")) openReview();
    if (e.target.closest?.("[data-qn-sync-recovery]")) openRecovery();
  });
  window.addEventListener("online", () => { if (client && uid) window.qnCloudConnect(client, {id: uid}); });
  setInterval(() => { if (ready && navigator.onLine && !running) push(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && ready) { clearTimeout(timer); push(); } });
  window.addEventListener("pagehide", () => { if (ready) { clearTimeout(timer); push(); } });
})();
