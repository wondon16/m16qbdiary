// Serverless function to email sign-ups via Resend
// Env vars: RESEND_API_KEY, ASK_TO_EMAIL (optional)

function esc(s=""){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ok:false,error:'Method not allowed'}); return; }
  try{
    const { firstName='', lastName='', email='', phone='', reason='', focus='' } = req.body || {};
    const emailRe=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if(!firstName.trim()||!lastName.trim()||!emailRe.test(email)||!reason.trim()||!focus.trim()){
      res.status(400).json({ok:false,error:'Invalid input'}); return;
    }
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.ASK_TO_EMAIL || 'mushymillc@gmail.com';
    if(!RESEND_API_KEY){ res.status(500).json({ok:false,error:'Email service not configured'}); return; }

    const ref = `S-${Date.now().toString(36).toUpperCase()}`;
    const html = `
      <div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#0b1e3a;max-width:640px;margin:0 auto;border:1px solid #1b3d66;border-radius:10px;overflow:hidden">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#13294B;padding:14px;border-radius:10px 10px 0 0"><tr>
          <td align="left"><div style="color:#ffffff;font-weight:800;font-size:18px">M16 Flow</div></td>
          <td align="right" style="color:#7BAFD4;font-weight:700">${ref}</td>
        </tr></table>
        <div style="padding:16px;background:#f7fbff">
          <h2 style="margin:0 0 8px;color:#13294B">New Sign-Up</h2>
          <p style="margin:0 0 8px"><strong>${esc(firstName)} ${esc(lastName)}</strong> &lt;${esc(email)}&gt; • ${esc(phone)}</p>
          <div style="margin:8px 0">
            <div style="font-weight:700;margin-bottom:4px">Why they’re joining</div>
            <div style="padding:10px;border:1px solid #cfe3f7;border-radius:8px;background:#ffffff">${esc(reason).replace(/\n/g,'<br>')}</div>
          </div>
          <div style="margin:8px 0">
            <div style="font-weight:700;margin-bottom:4px">Focus areas</div>
            <div style="padding:10px;border:1px solid #cfe3f7;border-radius:8px;background:#ffffff">${esc(focus).replace(/\n/g,'<br>')}</div>
          </div>
        </div>
      </div>`;

    const payload = {
      from:'M16 Flow <noreply@yourdomain.com>',
      to:[TO], subject:`New sign-up ${ref}: ${firstName} ${lastName}`,
      reply_to: email,
      text:`Ref: ${ref}\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\nReason: ${reason}\nFocus: ${focus}`,
      html
    };
    const r = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
    if(!r.ok){ const t = await r.text().catch(()=> ''); res.status(502).json({ok:false,error:'Send failed', detail:t}); return; }

    // Auto-reply
    try{ await fetch('https://api.resend.com/emails', { method:'POST', headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify({ from:'M16 Flow <noreply@yourdomain.com>', to:[email], subject:`Thanks — submission received (${ref})`, text:`We received your information and will be in touch soon.\nReference: ${ref}\n\n– M16 Flow` }) }); }catch(e){ }

    res.status(200).json({ok:true, id:ref});
  }catch(e){ console.error(e); res.status(500).json({ok:false,error:'Server error'}); }
};

