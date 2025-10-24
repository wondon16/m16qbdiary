/* QB Diary — stable gate, accurate completion rules, per-portal reset, polished controls */
(() => {
  const TOTAL_WEEKS = 18;
  const PASSCODE = 'M16QB';
  const STORAGE_PREFIX = 'qb_diary_week_';
  const COMPLETE_PREFIX = 'qb_diary_complete_';

  // ===== COVER GATE =====
  const cover = document.getElementById('cover');
  const app = document.getElementById('app');
  const gateForm = document.getElementById('gateForm');
  const gateInput = document.getElementById('gateInput');
  const gateHint = document.getElementById('gateHint');

  function unlockApp(){
    app.classList.remove('locked');
    app.removeAttribute('aria-hidden');
    cover.style.display = 'none';
  }
  gateForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const v = (gateInput.value || '').trim();
    if (v === PASSCODE){
      gateHint.textContent = '';
      unlockApp();
      document.getElementById('nextWeek').focus();
    } else {
      gateHint.textContent = 'Incorrect password. Try again.';
      gateInput.select();
      gateInput.focus();
    }
  });

  // ===== GLOBAL ELEMENTS =====
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
  const coverageImages = document.querySelectorAll('.coverage-diagram img');
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  let lastFocusedElement = null;

  function openLightbox(img){
    if (!lightbox || !lightboxImg || !lightboxCaption) return;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || '';
    const caption = img.closest('.coverage-diagram')?.querySelector('figcaption')?.textContent || '';
    lightboxCaption.textContent = caption;
    lightbox.classList.add('show');
    lightbox.setAttribute('aria-hidden', 'false');
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox(){
    if (!lightbox || !lightboxImg || !lightboxCaption) return;
    lightbox.classList.remove('show');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.removeAttribute('src');
    lightboxImg.alt = '';
    lightboxCaption.textContent = '';
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  if (coverageImages.length && lightbox){
    coverageImages.forEach(img=>{
      img.setAttribute('tabindex','0');
      img.setAttribute('role','button');
      img.addEventListener('click', ()=> openLightbox(img));
      img.addEventListener('keydown', (evt)=>{
        if (evt.key === 'Enter' || evt.key === ' '){
          evt.preventDefault();
          openLightbox(img);
        }
      });
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (evt)=>{
      if (evt.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (evt)=>{
      if (evt.key === 'Escape' && lightbox.classList.contains('show')) closeLightbox();
    });
  }

  let currentWeek = 1;
  let currentPortal = null;

  const PORTAL_ORDER = ['rival-film','mobility','fuel','focus-throw','coverage'];
  const PORTAL_LABELS = {
    'rival-film':'Rival / Film',
    'mobility':'Mobility',
    'fuel':'Fuel / Hydration',
    'focus-throw':'Focus / Throwing',
    'coverage':'Coverage Recognition'
  };
  const PORTAL_COPY = {
    'rival-film':  { title:'Rival & Film Study',      intro:'Define the opponent. Identify strengths, stress their weaknesses.' },
    'mobility':    { title:'Mobility & Warm-Up Flow', intro:'Prime the shoulders, open the hips, and cue fast feet.' },
    'fuel':        { title:'Fuel & Hydration',        intro:'Eat clean, fuel right, and hydrate on purpose.' },
    'focus-throw': { title:'Mental Focus & Throwing', intro:'Center your breath and sharpen your throwing progression.' },
    'coverage':    { title:'Coverage Recognition Help', intro:'Lock in the Top Gun coverage bullets and prep answers for every shell.' },
  };

  // ===== STORAGE =====
  const keyFor = (week = currentWeek) => `${STORAGE_PREFIX}${week}`;
  const completeKeyFor = (week = currentWeek) => `${COMPLETE_PREFIX}${week}`;

  function setStatus(text, ok=false){
    saveStatus.textContent = text;
    saveStatus.style.color = ok ? '#27d17a' : '#c9e2ff';
    if (saveStatusPanel){
      saveStatusPanel.textContent = text;
      saveStatusPanel.style.color = ok ? '#27d17a' : '#c9e2ff';
    }
  }

  // Serialize form (incl. checkboxes arrays)
  function collectData(){
    const data = {};
    form.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      if (!data[cb.name]) data[cb.name] = [];
      if (cb.checked) data[cb.name].push(cb.value);
    });
    const fd = new FormData(form);
    for (const [k,v] of fd.entries()){
      if (data[k] !== undefined){
        if (Array.isArray(data[k])) data[k].push(v);
        else data[k] = [data[k], v];
      } else data[k] = v;
    }
    return data;
  }

  function populateForm(obj){
    form.reset();
    if (!obj) return;
    Object.entries(obj).forEach(([name, value])=>{
      const field = form.elements[name];
      if (!field) return;
      if (field instanceof RadioNodeList || (field.length && field[0])){
        const vals = Array.isArray(value) ? value : [value];
        Array.from(field).forEach(el=>{
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = vals.includes(el.value);
          else el.value = value;
        });
      } else field.value = value;
    });
  }

  // ===== COMPLETION RULES =====
  function isPortalComplete(id, data){
    switch(id){
      case 'rival-film':
        return !!(data.opponent);
      case 'mobility': {
        const arr = Array.isArray(data.mobility) ? data.mobility : [];
        return arr.length >= 5;
      }
      case 'fuel': {
        const confirms = Array.isArray(data.fuelConfirm) ? data.fuelConfirm : (data.fuelConfirm ? [data.fuelConfirm] : []);
        return ['nightMealPlanned','breakfastPicked','hydrationReviewed'].every(x => confirms.includes(x));
      }
      case 'focus-throw': {
        const focus = Array.isArray(data.focus) ? data.focus : (data.focus ? [data.focus] : []);
        return focus.length >= 1;
      }
      case 'coverage': {
        const confirm = Array.isArray(data.coverageConfirm) ? data.coverageConfirm : (data.coverageConfirm ? [data.coverageConfirm] : []);
        return ['preSnapReviewed','readsReviewed','manPlanReady'].every(x => confirm.includes(x));
      }
      default: return false;
    }
  }

  // ===== UI SYNC =====
  function updatePortalCards(){
    const data = JSON.parse(localStorage.getItem(keyFor()) || '{}');
    PORTAL_ORDER.forEach(id=>{
      const card = document.querySelector(`.portal-card[data-portal="${id}"]`);
      const complete = isPortalComplete(id, data);
      card.classList.toggle('complete', !!complete);
      card.querySelector('.status-pill').textContent = complete ? 'Complete' : 'Incomplete';
    });
  }

  function renderChecklist(){
    weekChecklist.innerHTML = '';
    const data = JSON.parse(localStorage.getItem(keyFor()) || '{}');
    PORTAL_ORDER.forEach(id=>{
      const li = document.createElement('li');
      li.className = 'week-check-item';
      li.dataset.portal = id;
      if (isPortalComplete(id, data)) li.classList.add('complete');
      li.innerHTML = `<span class="check-dot" aria-hidden="true"></span>${PORTAL_LABELS[id]}`;
      li.addEventListener('click', ()=>openPortal(id));
      weekChecklist.appendChild(li);
    });
  }

  function updateProgressAndWeekBadge(showCelebrate=true){
    const data = JSON.parse(localStorage.getItem(keyFor()) || '{}');
    let completed = 0;
    PORTAL_ORDER.forEach(id => { if (isPortalComplete(id, data)) completed++; });

    const pct = Math.round((completed / PORTAL_ORDER.length) * 100);
    weekBar.style.width = `${pct}%`;
    weekText.textContent = `${completed}/${PORTAL_ORDER.length} complete`;

    const wasComplete = localStorage.getItem(completeKeyFor()) === '1';
    const isComplete = completed === PORTAL_ORDER.length;

    weekBadge.textContent = `Week ${currentWeek}`;
    weekBadge.classList.toggle('complete', isComplete);
    localStorage.setItem(completeKeyFor(), isComplete ? '1' : '0');

    if (isComplete && !wasComplete && showCelebrate){
      showToast(`Week ${currentWeek} complete!`);
      launchConfetti();
    }
  }

  // ===== TOAST / CONFETTI =====
  function showToast(message){
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), 2200);
  }
  function launchConfetti(){
    confettiBox.innerHTML = '';
    const colors = ['#62c7ff','#2aa3ff','#ffffff','#27d17a','#e6f7ff'];
    for (let i=0;i<60;i++){
      const s = document.createElement('span');
      s.className = 'piece';
      s.style.left = Math.random()*100 + 'vw';
      s.style.background = colors[Math.floor(Math.random()*colors.length)];
      s.style.transform = `translateY(-20px) rotate(${Math.random()*360}deg)`;
      s.style.animationDelay = (Math.random()*300) + 'ms';
      s.style.opacity = 0.7 + Math.random()*0.3;
      confettiBox.appendChild(s);
    }
    setTimeout(()=>confettiBox.innerHTML='', 1700);
  }

  // ===== SAVE / LOAD / CLEAR =====
  function saveWeek(manual=false){
    const data = collectData();
    localStorage.setItem(keyFor(), JSON.stringify(data));
    const stamp = new Date().toLocaleTimeString();
    setStatus(`Saved • ${stamp}`, true);
    updatePortalCards();
    renderChecklist();
    updateProgressAndWeekBadge();
    if (manual) showToast(`Week ${currentWeek} saved`);
  }
  function loadWeek(){
    const raw = localStorage.getItem(keyFor());
    populateForm(raw ? JSON.parse(raw) : null);
    setStatus(`Week ${currentWeek} loaded`);
    updatePortalCards();
    renderChecklist();
    updateProgressAndWeekBadge(false);
  }
  function clearWeek(){
    if (!confirm(`Clear all data for Week ${currentWeek}?`)) return;
    localStorage.removeItem(keyFor());
    localStorage.setItem(completeKeyFor(), '0');
    form.reset();
    setStatus('Cleared');
    updatePortalCards();
    renderChecklist();
    updateProgressAndWeekBadge(false);
    showToast(`Week ${currentWeek} cleared`);
  }

  // ===== PER-PORTAL RESET =====
  function resetCurrentPortal(){
    if (!currentPortal) return;
    if (!confirm(`Reset the "${PORTAL_LABELS[currentPortal]}" portal for Week ${currentWeek}?`)) return;
    const activeSection = [...sections].find(s => s.dataset.section === currentPortal);
    if (!activeSection) return;
    activeSection.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    activeSection.querySelectorAll('input[type="text"], textarea, select').forEach(el=>{
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
    saveWeek(false);
    setStatus('Portal reset', true);
  }

  // ===== OVERLAY CONTROL =====
  function openPortal(id){
    currentPortal = id;
    const info = PORTAL_COPY[id];
    document.getElementById('overlayTitle').textContent = info.title;
    document.getElementById('overlayIntro').textContent  = info.intro;
    sections.forEach(sec => sec.classList.toggle('active', sec.dataset.section === id));
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closePortal(){
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentPortal = null;
  }
  function gotoAdjacentPortal(delta){
    const idx = PORTAL_ORDER.indexOf(currentPortal);
    if (idx === -1) return;
    const nextIdx = Math.min(Math.max(idx + delta, 0), PORTAL_ORDER.length-1);
    openPortal(PORTAL_ORDER[nextIdx]);
  }

  document.getElementById('prevSection').addEventListener('click', ()=>gotoAdjacentPortal(-1));
  document.getElementById('nextSection').addEventListener('click', ()=>gotoAdjacentPortal(+1));
  document.getElementById('resetPortalBtn').addEventListener('click', resetCurrentPortal);

  portalCards.forEach(card=>{
    const id = card.dataset.portal;
    card.addEventListener('click', ()=>openPortal(id));
    card.querySelector('.btn-portal').addEventListener('click', (e)=>{ e.stopPropagation(); openPortal(id); });
  });

  document.getElementById('overlayClose').addEventListener('click', closePortal);
  overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closePortal(); });
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && overlay.classList.contains('show')) closePortal();
    if (e.key === 'ArrowRight' && overlay.classList.contains('show')) gotoAdjacentPortal(+1);
    if (e.key === 'ArrowLeft'  && overlay.classList.contains('show')) gotoAdjacentPortal(-1);
  });

  // ===== AUTOSAVE =====
  let saveTimer;
  function scheduleAutosave(){
    setStatus('Editing…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>saveWeek(false), 600);
  }
  form.addEventListener('input', scheduleAutosave);
  form.addEventListener('change', scheduleAutosave);
  saveBtn.addEventListener('click', ()=>saveWeek(true));
  clearBtn.addEventListener('click', clearWeek);

  // ===== WEEK SWITCH =====
  function switchWeek(week){
    localStorage.setItem(keyFor(), JSON.stringify(collectData())); // silent save
    currentWeek = week;
    localStorage.setItem('qb_diary_last_week', String(currentWeek));
    weekBadge.textContent = `Week ${currentWeek}`;
    loadWeek();
  }
  prevWeekBtn.addEventListener('click', ()=>{ const w = Math.max(1, currentWeek-1); if (w!==currentWeek) switchWeek(w); });
  nextWeekBtn.addEventListener('click', ()=>{ const w = Math.min(18, currentWeek+1); if (w!==currentWeek) switchWeek(w); });

  // ===== BOOT =====
  window.addEventListener('DOMContentLoaded', ()=>{
    const last = parseInt(localStorage.getItem('qb_diary_last_week') || '1', 10);
    currentWeek = Math.min(Math.max(1, last), 18);
    weekBadge.textContent = `Week ${currentWeek}`;
    loadWeek();
    const hash = location.hash.replace('#','');
    if (hash && PORTAL_ORDER.includes(hash)) openPortal(hash);
  });
})();
