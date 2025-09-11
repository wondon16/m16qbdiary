// Ask form: sends via mailto and stores questions locally
(() => {
  const form = document.getElementById('askForm');
  const msg = document.getElementById('askMsg');
  const clearBtn = document.getElementById('clearAsk');
  const listEl = document.getElementById('myQuestionsList');
  const clearAll = document.getElementById('clearAllQuestions');

  function render(){
    const items = JSON.parse(localStorage.getItem('m16_questions')||'[]');
    listEl.innerHTML='';
    items.forEach(it => {
      const li = document.createElement('li'); li.className='booking-item';
      li.innerHTML = `
        <div><strong>${new Date(it.at).toLocaleString()}</strong></div>
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

  function send(){
    const name = form.elements['name'].value.trim();
    const email = form.elements['email'].value.trim();
    const q = form.elements['question'].value.trim();
    const subject = encodeURIComponent(`Question from ${name}`);
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${q}`);
    const mailto = `mailto:mushymillc@gmail.com?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    const items = JSON.parse(localStorage.getItem('m16_questions')||'[]');
    items.unshift({ id:'q_'+Date.now(), name, email, q, at: new Date().toISOString() });
    localStorage.setItem('m16_questions', JSON.stringify(items));
    render();
    msg.textContent = 'Opening your email app… If it does not open, copy/paste this address: mushymillc@gmail.com';
  }

  if(form){
    form.addEventListener('submit', (e)=>{ e.preventDefault(); const err = validate(); if(err){ msg.textContent=err; return;} msg.textContent=''; send(); });
  }
  if(clearBtn){ clearBtn.addEventListener('click', ()=>{ form.reset(); msg.textContent=''; }); }
  if(clearAll){ clearAll.addEventListener('click', ()=>{ if(confirm('Clear your saved questions?')){ localStorage.removeItem('m16_questions'); render(); }}); }

  render();
})();
