// Ask form: tries EmailJS (if configured) else mailto; stores locally
(() => {
  const form = document.getElementById('askForm');
  const msg = document.getElementById('askMsg');
  const clearBtn = document.getElementById('clearAsk');
  const listEl = document.getElementById('myQuestionsList');
  const clearAll = document.getElementById('clearAllQuestions');
  const cfg = (window.EMAILJS_CONFIG||{});
  let emailjsReady = false;
  function initEmailJS(){
    try{
      if (window.emailjs && cfg.PUBLIC_KEY){ window.emailjs.init(cfg.PUBLIC_KEY); emailjsReady = true; }
    }catch(e){ emailjsReady = false; }
  }
  document.addEventListener('DOMContentLoaded', initEmailJS);

  function render(){
    const items = JSON.parse(localStorage.getItem('m16_questions')||'[]');
    listEl.innerHTML='';
    items.forEach(it => {
      const li = document.createElement('li'); li.className='booking-item';
      li.innerHTML = `
        <div><strong>${new Date(it.at).toLocaleString()}</strong>${it.id?` • <span class=\"muted\">${it.id}</span>`:''}</div>
        <div class="booking-who">${it.name} • ${it.email}</div>
        <div>${it.q.replace(/[\n\r]+/g,'<br>')}</div>`;
      listEl.appendChild(li);
    });
  }

  function validate(){
    const name = form.elements['name'].value.trim();
    const email = form.elements['email'].value.trim();
    const q = form.elements['question'].value.trim();
    if(!name) return 'Enter your name';
    if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email';
    if(!q) return 'Type your question';
    return '';
  }

  async function send(){
    const name = form.elements['name'].value.trim();
    const email = form.elements['email'].value.trim();
    const q = form.elements['question'].value.trim();
    // Try serverless endpoint first
    let refId = '';
    try{
      const resp = await fetch('/api/ask', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, question: q })
      });
      if (resp.ok){ const data = await resp.json().catch(()=>({})); refId = data.id || ''; msg.textContent = `Sent! We emailed you a confirmation${refId ? ' • Ref '+refId : ''}.`; }
    }catch(e){ /* ignore and fall back */ }

    // Then try EmailJS if configured
    if (!refId && emailjsReady && cfg.SERVICE_ID && cfg.TEMPLATE_ID){
      try{
        msg.textContent = 'Sending…';
        await window.emailjs.send(cfg.SERVICE_ID, cfg.TEMPLATE_ID, {
          from_name: name,
          from_email: email,
          message: q,
          to_email: cfg.TO_EMAIL || 'mushymillc@gmail.com'
        });
        msg.textContent = 'Sent! Check your inbox for a confirmation.';
      } catch(err){
        console.error(err);
        // Fallback to mailto on failure
        const subject = encodeURIComponent(`Question from ${name}`);
        const body = encodeURIComponent(`From: ${name} <${email}>\n\n${q}`);
        const mailto = `mailto:${cfg.TO_EMAIL||'mushymillc@gmail.com'}?subject=${subject}&body=${body}`;
        window.location.href = mailto;
        msg.textContent = 'Opening your email app…';
      }
    } else if (!refId) {
      // Mailto fallback
      const subject = encodeURIComponent(`Question from ${name}`);
      const body = encodeURIComponent(`From: ${name} <${email}>\n\n${q}`);
      const mailto = `mailto:${cfg.TO_EMAIL||'mushymillc@gmail.com'}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
      msg.textContent = 'Opening your email app…';
    }
    const items = JSON.parse(localStorage.getItem('m16_questions')||'[]');
    items.unshift({ id: refId || ('q_'+Date.now()), name, email, q, at: new Date().toISOString() });
    localStorage.setItem('m16_questions', JSON.stringify(items));
    render();
  }

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const err = validate();
      if(err){ msg.textContent=err; return; }
      msg.textContent='';
      const btn = document.getElementById('sendBtn'); if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
      await send();
      if(btn){ btn.disabled=false; btn.textContent='Send Question'; }
    });
  }
  if(clearBtn){ clearBtn.addEventListener('click', ()=>{ form.reset(); msg.textContent=''; }); }
  if(clearAll){ clearAll.addEventListener('click', ()=>{ if(confirm('Clear your saved questions?')){ localStorage.removeItem('m16_questions'); render(); }}); }

  render();
})();
