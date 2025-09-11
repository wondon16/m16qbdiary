// Simple scheduler logic: calendar, slots, PayPal fallback, and local bookings
(() => {
  const tzLabel = document.getElementById('tzLabel');
  const calGrid = document.getElementById('calGrid');
  const calMonth = document.getElementById('calMonth');
  const calYear = document.getElementById('calYear');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const slotList = document.getElementById('slotList');
  const slotDateLabel = document.getElementById('slotDateLabel');
  const bookingForm = document.getElementById('bookingForm');
  const toPayBtn = document.getElementById('toPay');
  const clearBtn = document.getElementById('clearBooking');
  const bookMsg = document.getElementById('bookMsg');
  const payPanel = document.getElementById('payPanel');
  const paypalWrap = document.getElementById('paypalButtons');
  const payMsg = document.getElementById('payMsg');
  const afterBooking = document.getElementById('afterBooking');
  const icsBtn = document.getElementById('icsBtn');
  const gcalBtn = document.getElementById('gcalBtn');
  const copyMeet = document.getElementById('copyMeet');
  const mailtoBtn = document.getElementById('mailtoBtn');
  const myBookingsList = document.getElementById('myBookingsList');
  const clearAllBookings = document.getElementById('clearAllBookings');

  // Timezone label
  try { tzLabel.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { tzLabel.textContent = 'Local'; }

  // Calendar state
  let view = new Date();
  let selectedDate = null;
  let selectedTime = null;

  function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
  function isSameDay(a,b){ return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

  function renderCalendar(){
    const s = startOfMonth(view);
    const e = endOfMonth(view);
    calMonth.textContent = s.toLocaleString(undefined, {month:'long'});
    calYear.textContent = s.getFullYear();
    calGrid.innerHTML = '';
    const firstWday = (s.getDay()+7)%7; // 0=Sun
    for(let i=0;i<firstWday;i++){
      const div = document.createElement('div'); div.className='day blank'; calGrid.appendChild(div);
    }
    const today = new Date();
    for(let d=1; d<=e.getDate(); d++){
      const btn = document.createElement('button'); btn.type='button'; btn.className='day'; btn.textContent=String(d);
      const cur = new Date(s.getFullYear(), s.getMonth(), d);
      if (isSameDay(cur, today)) btn.classList.add('today');
      if (selectedDate && isSameDay(cur, selectedDate)) btn.classList.add('selected');
      btn.addEventListener('click', () => selectDate(cur));
      calGrid.appendChild(btn);
    }
  }

  calPrev.addEventListener('click', ()=>{ view = new Date(view.getFullYear(), view.getMonth()-1, 1); renderCalendar(); });
  calNext.addEventListener('click', ()=>{ view = new Date(view.getFullYear(), view.getMonth()+1, 1); renderCalendar(); });

  // Slots
  const BASE_SLOTS = ['09:00','10:30','12:00','14:00','15:30','17:00'];
  function renderSlots(){
    slotList.innerHTML='';
    if(!selectedDate){ slotDateLabel.textContent = 'Select a date to see times.'; return; }
    const label = selectedDate.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
    slotDateLabel.textContent = label;
    BASE_SLOTS.forEach(t => {
      const btn=document.createElement('button'); btn.type='button'; btn.className='btn pill btn-sm slot-btn'; btn.textContent=t;
      if (selectedTime===t) btn.classList.add('slot-selected');
      btn.addEventListener('click', ()=>{ selectedTime=t; renderSlots(); syncForm(); });
      slotList.appendChild(btn);
    });
  }

  function selectDate(d){ selectedDate = d; selectedTime = null; renderCalendar(); renderSlots(); syncForm(); }

  // Form sync
  function syncForm(){
    bookingForm.elements['date'].value = selectedDate ? selectedDate.toLocaleDateString() : '';
    bookingForm.elements['time'].value = selectedTime || '';
  }
  function resetBooking(){
    selectedDate = null; selectedTime = null; bookingForm.reset(); payPanel.hidden=true; paypalWrap.innerHTML=''; afterBooking.hidden=true; payMsg.textContent=''; bookMsg.textContent='';
    renderCalendar(); renderSlots(); syncForm();
  }
  clearBtn.addEventListener('click', resetBooking);

  // Pay / capture flow
  function validate(){
    const name = bookingForm.elements['name'].value.trim();
    const email = bookingForm.elements['email'].value.trim();
    if (!selectedDate) return 'Pick a date';
    if (!selectedTime) return 'Pick a time';
    if (!name) return 'Enter your name';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email';
    return '';
  }
  function proceedToPay(){
    const err = validate();
    if (err){ bookMsg.textContent = err; return; }
    bookMsg.textContent=''; payPanel.hidden=false; paypalWrap.innerHTML='';
    if (window.paypal && window.paypal.Buttons){
      window.paypal.Buttons({
        style:{ layout:'vertical', color:'gold', shape:'pill', label:'paypal' },
        createOrder: (data, actions) => actions.order.create({
          purchase_units: [{ description:'QB Diary — booking', amount:{ currency_code:'USD', value:'7.00' } }]
        }),
        onApprove: (data, actions) => actions.order.capture().then(details => { finalizeBooking(details.id); }),
        onError: err => { console.error(err); payMsg.textContent='Payment failed. Try again.'; }
      }).render('#paypalButtons');
    } else {
      // Fallback demo button so the page is usable without a PayPal key
      const demo=document.createElement('button'); demo.type='button'; demo.className='btn btn-primary pill'; demo.textContent='Simulate Payment';
      demo.addEventListener('click', ()=>finalizeBooking('DEMO-' + Math.random().toString(36).slice(2,8).toUpperCase()));
      paypalWrap.appendChild(demo);
      payMsg.textContent='PayPal SDK not configured; using demo button.';
    }
  }
  toPayBtn.addEventListener('click', proceedToPay);

  // Booking storage and outputs
  function finalizeBooking(paymentId){
    const record = {
      id: 'bk_' + Date.now(),
      name: bookingForm.elements['name'].value.trim(),
      email: bookingForm.elements['email'].value.trim(),
      date: selectedDate.toISOString(),
      time: selectedTime,
      paymentId
    };
    saveBooking(record);
    buildOutputs(record);
    afterBooking.hidden=false; afterBooking.scrollIntoView({behavior:'smooth', block:'center'});
    payMsg.textContent = `Confirmed • Payment ${paymentId}`;
  }

  function saveBooking(rec){
    const list = JSON.parse(localStorage.getItem('qb_bookings')||'[]');
    list.push(rec); localStorage.setItem('qb_bookings', JSON.stringify(list));
    renderBookings();
  }
  function renderBookings(){
    const list = JSON.parse(localStorage.getItem('qb_bookings')||'[]');
    myBookingsList.innerHTML='';
    list.forEach(rec => {
      const li=document.createElement('li'); li.className='booking-item';
      const when = new Date(rec.date);
      li.innerHTML = `
        <div><strong>${when.toLocaleDateString()} ${rec.time}</strong></div>
        <div class="booking-who">${rec.name} • <span class="paid">Paid</span></div>
        <div class="booking-actions">
          <button class="btn btn-sm btn-outline" data-del="${rec.id}">Delete</button>
        </div>`;
      myBookingsList.appendChild(li);
    });
    myBookingsList.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click', ()=>deleteBooking(btn.getAttribute('data-del'))));
  }
  function deleteBooking(id){
    const list = JSON.parse(localStorage.getItem('qb_bookings')||'[]').filter(b=>b.id!==id);
    localStorage.setItem('qb_bookings', JSON.stringify(list)); renderBookings();
  }
  clearAllBookings.addEventListener('click', ()=>{ if(confirm('Clear all bookings?')){ localStorage.removeItem('qb_bookings'); renderBookings(); }});

  function buildOutputs(rec){
    // Generate ICS and Google Calendar links
    const start = new Date(rec.date);
    const [h,m] = rec.time.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 45*60*1000);
    function fmtICS(dt){ return dt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z'); }
    const title = 'QB Diary — Google Meet';
    const desc = `Session with ${rec.name} (Payment ${rec.paymentId})`;
    const meet = `https://meet.google.com/${Math.random().toString(36).slice(2,5)}-${Math.random().toString(36).slice(2,6)}-${Math.random().toString(36).slice(2,5)}`;
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//QB Diary//Scheduler//EN','BEGIN:VEVENT',
      `UID:${rec.id}@qb-diary`,
      `DTSTAMP:${fmtICS(new Date())}`,
      `DTSTART:${fmtICS(start)}`,
      `DTEND:${fmtICS(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}\\nMeet: ${meet}`,
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');

    const icsBlob = new Blob([ics], {type:'text/calendar'});
    icsBtn.href = URL.createObjectURL(icsBlob);

    const gcalParams = new URLSearchParams({
      action:'TEMPLATE', text:title,
      dates: `${fmtICS(start)}/${fmtICS(end)}`,
      details: `${desc} \nMeet: ${meet}`
    });
    gcalBtn.href = `https://calendar.google.com/calendar/render?${gcalParams.toString()}`;

    copyMeet.onclick = async () => { try { await navigator.clipboard.writeText(meet); payMsg.textContent='Meet link copied.'; } catch { alert(meet); } };
    mailtoBtn.href = `mailto:${rec.email}?subject=${encodeURIComponent('QB Diary Session Confirmation')}&body=${encodeURIComponent(`Confirmed for ${start.toLocaleString()}\nMeet: ${meet}`)}`;
  }

  // Init
  renderCalendar();
  renderSlots();
  renderBookings();
})();

