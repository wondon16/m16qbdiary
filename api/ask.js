// Vercel-compatible serverless function to email Ask form via Resend
// Env vars required when deploying:
// - RESEND_API_KEY: Your Resend API key
// - ASK_TO_EMAIL: Destination address (default: mushymillc@gmail.com)

function escapeHtml(s=""){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { name = '', email = '', question = '' } = req.body || {};

    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!name.trim() || !emailRe.test(email) || !question.trim()) {
      res.status(400).json({ ok: false, error: 'Invalid input' });
      return;
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.ASK_TO_EMAIL || 'mushymillc@gmail.com';
    const LOGO_URL = process.env.ASK_LOGO_URL || '';

    if (!RESEND_API_KEY) {
      res.status(500).json({ ok: false, error: 'Email service not configured' });
      return;
    }

    const ref = `Q-${Date.now().toString(36).toUpperCase()}`;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeQuestion = escapeHtml(question).replace(/\n/g,'<br>');

    const headerHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#13294B;padding:14px;border-radius:10px 10px 0 0">
        <tr>
          <td align="left">
            ${LOGO_URL ? `<img src="${LOGO_URL}" alt="M16 Flow" height="36" style="display:block;border:0">` : `<div style="color:#ffffff;font-weight:800;font-size:18px">M16 Flow</div>`}
          </td>
          <td align="right" style="color:#7BAFD4;font-weight:700">${ref}</td>
        </tr>
      </table>`;

    const adminHtml = `
      <div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#0b1e3a;max-width:640px;margin:0 auto;border:1px solid #1b3d66;border-radius:10px;overflow:hidden">
        ${headerHtml}
        <div style="padding:16px;background:#f7fbff">
          <h2 style="margin:0 0 8px;color:#13294B">New Question</h2>
          <p style="margin:0 0 10px">From: <strong>${safeName}</strong> &lt;${safeEmail}&gt;</p>
          <div style="padding:12px;border:1px solid #cfe3f7;border-radius:10px;background:#ffffff">
            ${safeQuestion}
          </div>
        </div>
      </div>`;

    const payload = {
      from: 'Ask Form <noreply@yourdomain.com>',
      to: [TO],
      subject: `New question ${ref} from ${name}`,
      reply_to: email,
      text: `Ref: ${ref}\nFrom: ${name} <${email}>\n\n${question}`,
      html: adminHtml,
    };

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      res.status(502).json({ ok: false, error: 'Send failed', detail: errText });
      return;
    }

    // Auto-reply to user (best-effort; won't fail the request if this errors)
    try {
      const userHtml = `
        <div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#0b1e3a;max-width:640px;margin:0 auto;border:1px solid #1b3d66;border-radius:10px;overflow:hidden">
          ${headerHtml}
          <div style="padding:16px;background:#f7fbff">
            <h2 style="margin:0 0 8px;color:#13294B">Thanks — we received your question</h2>
            <p style="margin:0 0 10px">We’ll reply to <strong>${safeEmail}</strong> soon.</p>
            <p style="margin:0 0 10px">Reference: <strong>${ref}</strong></p>
            <div style="padding:12px;border:1px solid #cfe3f7;border-radius:10px;background:#ffffff">${safeQuestion}</div>
            <p style="margin:12px 0 0;color:#163556">– M16 Flow</p>
          </div>
        </div>`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'M16 Flow <noreply@yourdomain.com>',
          to: [email],
          subject: `Thanks — we received your question (${ref})`,
          text:
`Hey ${name},\n\nWe received your question and will reply to you at this address soon.\nReference: ${ref}\n\nYour message:\n----------------------------------------\n${question}\n----------------------------------------\n\n– M16 Flow`,
          html: userHtml,
        }),
      });
    } catch (e) {
      console.error('Auto-reply failed:', e);
    }

    res.status(200).json({ ok: true, id: ref });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
