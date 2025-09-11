// Simple client-side homework manager: assignments + submissions
// Stores data in localStorage. Files are saved as data URLs.
(function(){
  const LS_ASSIGN = 'qb_hw_assignments';
  const LS_SUBMIT = 'qb_hw_submissions';

  function read(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch{ return fallback; }
  }
  function write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function uid(){ return 'id_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
  function fmtBytes(n){ if(!n&&n!==0) return ''; const u=['B','KB','MB','GB']; let i=0; let v=n; while(v>=1024&&i<u.length-1){v/=1024;i++;} return `${v.toFixed(v<10&&i?1:0)} ${u[i]}`; }
  function el(tag, opts={}){ const e=document.createElement(tag); Object.assign(e, opts); return e; }

  async function filesToData(files){
    const arr = Array.from(files||[]);
    const out = [];
    for (const f of arr){
      const dataUrl = await new Promise((res, rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
      out.push({ name:f.name, type:f.type, size:f.size, dataUrl });
    }
    return out;
  }

  function renderAttachments(list){
    const wrap = el('div');
    (list||[]).forEach(file=>{
      const a = el('a', { href:file.dataUrl, download:file.name, textContent:`⬇ ${file.name} (${fmtBytes(file.size)})` });
      a.style.display='inline-block'; a.style.margin='4px 8px 4px 0';
      wrap.appendChild(a);
    });
    return wrap;
  }

  // ---------- HOMEWORK (admin) page ----------
  function initHomeworkPage(){
    const form = document.getElementById('hwCreateForm'); if(!form) return;
    const msg = document.getElementById('hwCreateMsg');
    const list = document.getElementById('hwList');
    const emptyMsg = document.getElementById('hwEmptyMsg');
    const clearBtn = document.getElementById('hwClearForm');

    function render(){
      const items = read(LS_ASSIGN, []);
      list.innerHTML='';
      if(!items.length){ emptyMsg.style.display='block'; return; }
      emptyMsg.style.display='none';
      items.sort((a,b)=>b.createdAt-a.createdAt).forEach(it=>{
        const li = el('li', { className:'booking-item' });
        const h = el('div', { className:'booking-who' });
        h.textContent = `${it.title} • ${new Date(it.createdAt).toLocaleString()}`;
        const note = el('div'); note.textContent = it.note || '';
        const att = renderAttachments(it.files);
        const actions = el('div', { className:'booking-actions' });
        const del = el('button', { className:'btn btn-outline pill', type:'button', textContent:'Delete' });
        del.addEventListener('click', ()=>{
          if(!confirm('Delete this assignment?')) return;
          const all = read(LS_ASSIGN, []); write(LS_ASSIGN, all.filter(a=>a.id!==it.id)); render();
        });
        actions.appendChild(del);
        li.append(h, note, att, actions);
        list.appendChild(li);
      });
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); msg.textContent='Posting…';
      const title = form.title.value.trim();
      const note = form.note.value.trim();
      const files = await filesToData(form.files.files);
      if(!title){ msg.textContent='Please add a title.'; return; }
      const items = read(LS_ASSIGN, []);
      items.push({ id:uid(), title, note, files, createdAt:Date.now() });
      write(LS_ASSIGN, items);
      form.reset(); msg.textContent='Assignment posted.'; setTimeout(()=>msg.textContent='', 1200);
      render();
    });
    clearBtn?.addEventListener('click', ()=>{ form.reset(); msg.textContent='Cleared.'; setTimeout(()=>msg.textContent='', 900); });
    render();
  }

  // ---------- COMPLETED page ----------
  function initCompletedPage(){
    const list = document.getElementById('assignmentsToDo'); if(!list) return;
    const empty = document.getElementById('assignmentsEmptyMsg');
    const myList = document.getElementById('mySubmissions');
    const clearMine = document.getElementById('clearMySubmissions');

    function renderMySubmissions(){
      const subs = read(LS_SUBMIT, []);
      myList.innerHTML='';
      if(!subs.length){
        const none = el('li', { className:'booking-item' });
        none.textContent='No submissions yet.'; myList.appendChild(none); return;
      }
      subs.sort((a,b)=>b.submittedAt-a.submittedAt).forEach(s=>{
        const li = el('li', { className:'booking-item' });
        const h = el('div', { className:'booking-who' });
        h.innerHTML = `<strong>${s.name||'Anonymous'}</strong> • ${new Date(s.submittedAt).toLocaleString()}`;
        const meta = el('div'); meta.textContent = `Assignment: ${s.assignmentTitle || s.assignmentId}`;
        const note = el('div'); note.textContent = s.note || '';
        const att = renderAttachments(s.files);
        li.append(h, meta, note, att);
        myList.appendChild(li);
      });
    }

    function renderAssignments(){
      const items = read(LS_ASSIGN, []);
      list.innerHTML='';
      if(!items.length){ empty.style.display='block'; return; }
      empty.style.display='none';
      items.sort((a,b)=>b.createdAt-a.createdAt).forEach(it=>{
        const li = el('li', { className:'booking-item' });
        const title = el('div', { className:'booking-who' });
        title.textContent = `${it.title}`;
        const note = el('div'); note.textContent = it.note || '';
        const att = renderAttachments(it.files);

        const subForm = el('form', { className:'booking-form', noValidate:true });
        subForm.innerHTML = `
          <hr class="divider" />
          <div class="form-row two">
            <div>
              <label class="lbl">Your Name</label>
              <input class="inp" type="text" name="name" placeholder="First Last" />
            </div>
            <div>
              <label class="lbl">Email (optional)</label>
              <input class="inp" type="email" name="email" placeholder="you@example.com" />
            </div>
          </div>
          <div class="form-row">
            <label class="lbl">Notes (optional)</label>
            <textarea class="inp" name="note" rows="3" placeholder="Anything we should know?"></textarea>
          </div>
          <div class="form-row">
            <label class="lbl">Upload your completed files</label>
            <input class="inp" type="file" name="files" multiple />
          </div>
          <div class="form-row">
            <button type="submit" class="btn btn-primary pill">Submit Work</button>
            <button type="button" class="btn btn-outline pill btn-cancel">Clear</button>
          </div>
          <p class="muted sub-msg" aria-live="polite"></p>
        `;
        const msg = subForm.querySelector('.sub-msg');
        const cancelBtn = subForm.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', ()=>{ subForm.reset(); msg.textContent=''; });
        subForm.addEventListener('submit', async (e)=>{
          e.preventDefault(); msg.textContent='Uploading…';
          const fd = new FormData(subForm);
          const files = await filesToData(subForm.elements.files.files);
          if(!files.length){ msg.textContent='Please attach your completed file(s).'; return; }
          const sub = read(LS_SUBMIT, []);
          sub.push({
            id: uid(), assignmentId: it.id, assignmentTitle: it.title,
            name: (fd.get('name')||'').toString().trim(),
            email: (fd.get('email')||'').toString().trim(),
            note: (fd.get('note')||'').toString().trim(),
            files, submittedAt: Date.now()
          });
          write(LS_SUBMIT, sub);
          subForm.reset(); msg.textContent='Submitted!'; setTimeout(()=>msg.textContent='', 1200);
          renderMySubmissions();
        });

        li.append(title, note, att, subForm);
        list.appendChild(li);
      });
    }

    clearMine?.addEventListener('click', ()=>{
      if(!confirm('Clear your submissions saved on this device?')) return;
      write(LS_SUBMIT, []); renderMySubmissions();
    });

    renderAssignments();
    renderMySubmissions();
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    initHomeworkPage();
    initCompletedPage();
  });
})();

