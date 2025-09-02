/* QB Diary — password gate, per-week save/reset, accurate completion, confetti */
(() => {
  const TOTAL_WEEKS = 18;
  const PASSCODE = 'M16QB'; // required every load
  const STORAGE_PREFIX = 'qb_diary_week_';
  const COMPLETE_PREFIX = 'qb_diary_complete_';

  // Gate
  const cover = document.getElementById('cover');
  const app = document.getElementById('app');
  const gateForm = document.getElementById('gateForm');
  const gateInput = document.getElementById('gateInput');
  const gateHint = document.getElementById('gateHint');
  function unlockApp(){ app.classList.remove('locked'); app.removeAttribute('aria-hidden'); cover.style.display='none'; }
  gateForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const v = (gateInput.value||'').trim();
    if (v === PASSCODE){ gateHint.textContent=''; unlockApp(); document.getElementById('nextWeek').focus(); }
    else { gateHint.textContent='Incorrect password. Try again.'; gateInput.select(); gateInput.focus(); }
  });

  // Elements
  const weekBadge = document.getElementById('weekBadge');
  const prevWeekBtn = document.getElementById('prevWeek');
  const nextWeekBtn = document.getElementById('nextWeek');
  const portalCards = document.querySelectorAll('.portal-card');
  const overlay = document.getElementById('overlay');
  const overlayClose = document.getElementById('overlayClose');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayIntro = document.getElementById('overlayIntro');
  const form = document.getElementById('pocketbookForm');
  const sections = document.querySelectorAll('.portal-section');
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const saveStatus = document.getElementById('saveStatus');
  const saveStatusPanel = document.getElementById('saveStatusPanel');
  const prevSectionBtn = document.getElementById('prevSection');
  const nextSectionBtn = document.getElementById('nextSection');
  const resetPortalBtn = document.getElementById('resetPortalBtn');
  const weekBar = document.getElementById('weekProgressBar');
  const weekText = document.getElementById('weekProgressText');
  const weekChecklist = document.getElementById('weekChecklist');
  const toast = document.getElementById('toast');
  const confettiBox = document.getElementById('confetti');

  let currentWeek = 1;
  let currentPortal = null;

  const ORDER = ['weekly','rival-film','mobility','fuel','focus-throw','post-grade'];
  const LABELS = {'weekly':'Weekly / Alter Ego','rival-film':'Rival / Film','mobility':'Mobility','fuel':'Fuel / Hydration','focus-throw':'Focus / Throwing','post-grade':'Post / Grade'};
  const COPY = {
    'weekly':{title:'Weekly Word + Alter Ego', intro:'Set the tone and step into your persona for this week’s competition.'},
    'rival-film':{title:'Rival & Film Study', intro:'Define the opponent. Identify strengths, stress their weaknesses.'},
    'mobility':{title:'Mobility & Warm-Up Flow', intro:'Prime the shoulders, open the hips, and cue fast feet.'},
    'fuel':{title:'Fuel & Hydration', intro:'Eat clean, fuel right, and hydrate on purpose.'},
    'focus-throw':{title:'Mental Focus & Throwing', intro:'Center your breath and sharpen your throwing progression.'},
    'post-grade':{title:'Post-Game & Self-Grade', intro:'Reflect honestly, grade yourself, and set the next target.'}
  };

  const keyFor = (w=currentWeek)=>`${STORAGE_PREFIX}${w}`;
  const completeKeyFor = (w=currentWeek)=>`${COMPLETE_PREFIX}${w}`;

  function setStatus(text, ok=false){ 
    saveStatus.textContent=text; 
    saveStatus.style.color = ok ? '#27d17a' : '#c9e2ff'; 
    if (saveStatusPanel){ saveStatusPanel.textContent=text; saveStatusPanel.style.color = ok ? '#27d17a' : '#c9e2ff'; }
  }

  function collectData(){
    const data = {};
    form.querySelectorAll('input[type="checkbox"]').forEach(cb=>{ if(!data[cb.name]) data[cb.name]=[]; if(cb.checked) data[cb.name].push(cb.value); });
    const fd = new FormData(form);
    for (const [k,v] of fd.entries()){
      if (data[k] !== undefined){ Array.isArray(data[k]) ? data[k].push(v) : data[k] = [data[k], v]; }
      else data[k]=v;
    }
    return data;
  }

  function populateForm(obj){
    form.reset(); if(!obj) return;
    Object.entries(obj).forEach(([name, value])=>{
      const field = form.elements[name]; if(!field) return;
      if (field instanceof RadioNodeList || (field.length && field[0])){
        const vals = Array.isArray(value) ? value : [value];
        Array.from(field).forEach(el=>{ if(el.type==='checkbox'||el.type==='radio') el.checked = vals.includes(el.value); else el.value = value; });
      } else field.value = value;
    });
  }

  function isComplete(id,data){
    switch(id){
      case 'weekly': return !!(data.weeklyWord && data.alterEgoName && data.trait1 && data.trait2 && data.trait3 && data.mantra);
      case 'rival-film': return !!(data.opponent);
      case 'mobility': { const a = Array.isArray(data.mobility)?data.mobility:[]; return a.length>=5; }
      case 'fuel': { const c = Array.isArray(data.fuelConfirm)?data.fuelConfirm:(data.fuelConfirm?[data.fuelConfirm]:[]); return ['nightMealPlanned','breakfastPicked','hydrationReviewed'].every(x=>c.includes(x)); }
      case 'focus-throw': { const f = Array.isArray(data.focus)?data.focus:(data.focus?[data.focus]:[]); return f.length>=1; }
      case 'post-grade': return !!(data.selfGrade && (data.reflection||'').trim().length>0);
      default: return false;
    }
  }

  function updateCards(){
    const data = JSON.parse(localStorage.getItem(keyFor())||'{}');
    ORDER.forEach(id=>{
      const card = document.querySelector(`.portal-card[data-portal="${id}"]`);
      const done = isComplete(id,data);
      card.classList.toggle('complete', done);
      card.querySelector('.status-pill').textContent = done ? 'Complete' : 'Incomplete';
    });
  }

  function renderChecklist(){
    weekChecklist.innerHTML=''; 
    const data = JSON.parse(localStorage.getItem(keyFor())||'{}');
    ORDER.forEach(id=>{
      const li = document.createElement('li'); li.className='week-check-item'; li.dataset.portal=id;
      if (isComplete(id,data)) li.classList.add('complete');
      li.innerHTML = `<span class="check-dot" aria-hidden="true"></span>${LABELS[id]}`;
      li.addEventListener('click', ()=>openPortal(id));
      weekChecklist.appendChild(li);
    });
  }

  function updateProgress(celebrate=true){
    const data = JSON.parse(localStorage.getItem(keyFor())||'{}');
    let done = ORDER.reduce((n,id)=>n + (isComplete(id,data)?1:0), 0);
    weekBar.style.width = `${Math.round((done/ORDER.length)*100)}%`;
    weekText.textContent = `${done}/${ORDER.length} complete`;
    const was = localStorage.getItem(completeKeyFor())==='1';
    const is = done===ORDER.length;
    weekBadge.textContent = `Week ${currentWeek}`; 
    weekBadge.classList.toggle('complete', is);
    localStorage.setItem(completeKeyFor(), is ? '1' : '0');
    if (is && !was && celebrate){ 
      toast.textContent=`Week ${currentWeek} complete!`; 
      toast.classList.add('show'); 
      setTimeout(()=>toast.classList.remove('show'),2200); 
      launchConfetti(); 
    }
  }

  function launchConfetti(){
    confettiBox.innerHTML=''; 
    const colors=['#62c7ff','#2aa3ff','#ffffff','#27d17a','#e6f7ff'];
    for(let i=0;i<60;i++){ 
      const s=document.createElement('span'); 
      s.className='piece'; 
      s.style.left=Math.random()*100+'vw'; 
      s.style.background=colors[Math.floor(Math.random()*colors.length)]; 
      s.style.animationDelay=(Math.random()*300)+'ms'; 
      confettiBox.appendChild(s); 
    }
    setTimeout(()=>confettiBox.innerHTML='',1700);
  }

  function saveWeek(manual=false){
    localStorage.setItem(keyFor(), JSON.stringify(collectData()));
    setStatus(`Saved • ${new Date().toLocaleTimeString()}`, true);
    updateCards(); renderChecklist(); updateProgress();
    if (manual){ toast.textContent=`Week ${currentWeek} saved`; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1500); }
  }
  function loadWeek(){
    const raw = localStorage.getItem(keyFor()); populateForm(raw?JSON.parse(raw):null);
    setStatus(`Week ${currentWeek} loaded`); updateCards(); renderChecklist(); updateProgress(false);
  }
  function clearWeek(){
    if (!confirm(`Clear all data for Week ${currentWeek}?`)) return;
    localStorage.removeItem(keyFor()); localStorage.setItem(completeKeyFor(),'0'); form.reset(); setStatus('Cleared');
    updateCards(); renderChecklist(); updateProgress(false);
    toast.textContent=`Week ${currentWeek} cleared`; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1500);
  }
  function resetCurrentPortal(){
    if (!currentPortal) return;
    if (!confirm(`Reset the "${LABELS[currentPortal]}" portal for Week ${currentWeek}?`)) return;
    const sec = [...sections].find(s=>s.dataset.section===currentPortal); if (!sec) return;
    sec.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
    sec.querySelectorAll('input[type="text"], textarea, select').forEach(el=>{ if(el.tagName==='SELECT') el.selectedIndex=0; else el.value=''; });
    saveWeek(false); setStatus('Portal reset', true);
  }

  function openPortal(id){
    currentPortal=id; const info=COPY[id];
    overlayTitle.textContent=info.title; overlayIntro.textContent=info.intro;
    sections.forEach(sec=>sec.classList.toggle('active', sec.dataset.section===id));
    overlay.classList.add('show'); overlay.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  }
  function closePortal(){ overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); document.body.style.overflow=''; currentPortal=null; }
  function gotoPortal(delta){ const idx=ORDER.indexOf(currentPortal); if(idx===-1) return; openPortal(ORDER[Math.min(Math.max(idx+delta,0),ORDER.length-1)]); }

  prevSectionBtn.addEventListener('click', ()=>gotoPortal(-1));
  nextSectionBtn.addEventListener('click', ()=>gotoPortal(+1));
  resetPortalBtn.addEventListener('click', resetCurrentPortal);
  portalCards.forEach(card=>{ const id=card.dataset.portal; card.addEventListener('click', ()=>openPortal(id)); card.querySelector('.btn-portal').addEventListener('click', e=>{e.stopPropagation(); openPortal(id);}); });
  overlayClose.addEventListener('click', closePortal);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) closePortal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'&&overlay.classList.contains('show')) closePortal(); if(e.key==='ArrowRight'&&overlay.classList.contains('show')) gotoPortal(1); if(e.key==='ArrowLeft'&&overlay.classList.contains('show')) gotoPortal(-1); });

  let timer; function autosave(){ setStatus('Editing…'); clearTimeout(timer); timer=setTimeout(()=>saveWeek(false),600); }
  form.addEventListener('input', autosave); form.addEventListener('change', autosave);
  saveBtn.addEventListener('click', ()=>saveWeek(true)); clearBtn.addEventListener('click', clearWeek);

  function switchWeek(w){ localStorage.setItem(keyFor(), JSON.stringify(collectData())); currentWeek=w; localStorage.setItem('qb_diary_last_week', String(currentWeek)); weekBadge.textContent=`Week ${currentWeek}`; loadWeek(); }
  prevWeekBtn.addEventListener('click', ()=>{ const w=Math.max(1,currentWeek-1); if(w!==currentWeek) switchWeek(w); });
  nextWeekBtn.addEventListener('click', ()=>{ const w=Math.min(TOTAL_WEEKS,currentWeek+1); if(w!==currentWeek) switchWeek(w); });

  window.addEventListener('DOMContentLoaded', ()=>{
    const last = parseInt(localStorage.getItem('qb_diary_last_week')||'1',10);
    currentWeek = Math.min(Math.max(1,last),TOTAL_WEEKS); weekBadge.textContent=`Week ${currentWeek}`; loadWeek();
    const hash = location.hash.replace('#',''); if (hash && ORDER.includes(hash)) openPortal(hash);
    const text = "Thank you for visiting my website!\n Email mushymillc@gmail.com\n to recieve password. The QB Game Day Pocketbook is a premium,\n season-long flipbook designed for athletes,\n blending futuristic, motivational aesthetics\n with interactive tools for mental prep,\n film study, workouts, nutrition,\n and post-game reflection.";
let index = 0;
const speed = 100; // typing speed in ms

function typeWriter() {
  if (index < text.length) {
    document.getElementById("typewriter-text").innerHTML += text.charAt(index);
    index++;
    setTimeout(typeWriter, speed);
  }
}

window.onload = typeWriter;

  });
})();
