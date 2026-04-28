/**
 * mailer.js — HireSphere email utility
 *
 * Sends transactional emails via Resend (https://resend.com).
 * No npm package needed — uses Node's built-in `https` module
 * exactly like our Groq integration.
 *
 * Free tier: 3,000 emails/month, 100/day.
 * Get your free API key at: https://resend.com/api-keys
 * Add it to backend/.env → RESEND_API_KEY=re_xxxxxxxxxxxx
 *
 * From address: uses MAIL_FROM env var.
 *   - If you use Resend's free domain: "HireSphere <onboarding@resend.dev>"
 *     (free, works immediately, no domain setup)
 *   - If you have a custom domain verified in Resend:
 *     "HireSphere <noreply@yourdomain.com>"
 */

const https = require('https');

// ── Low-level Resend API call ──────────────────────────────────────────────────

function sendViaResend(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`Resend error ${res.statusCode}: ${parsed.message || data}`));
            } else {
              resolve(parsed);
            }
          } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Shared brand styles ───────────────────────────────────────────────────────

const BASE_STYLES = `
  body { margin:0; padding:0; background:#09090f; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
  .card { background:#111118; border-radius:16px; border:1px solid rgba(255,255,255,0.06); overflow:hidden; }
  .header { padding:28px 32px 24px; border-bottom:1px solid rgba(255,255,255,0.06); }
  .logo-row { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
  .logo-icon { width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#22d3ee,#8b5cf6,#ec4899); display:inline-flex; align-items:center; justify-content:center; }
  .logo-text { font-size:18px; font-weight:700; color:#ffffff; letter-spacing:-0.3px; }
  .logo-text span { color:#22d3ee; }
  .body { padding:28px 32px; }
  .footer { padding:20px 32px; border-top:1px solid rgba(255,255,255,0.05); background:#0c0c14; }
  h1 { margin:0 0 8px; font-size:22px; font-weight:800; letter-spacing:-0.4px; }
  p { margin:0 0 16px; font-size:14px; line-height:1.65; color:#a1a1aa; }
  p:last-child { margin-bottom:0; }
  .highlight { color:#ffffff; }
  .muted { color:#52525b; font-size:12px; }
  .btn { display:inline-block; padding:12px 28px; border-radius:10px; font-size:14px; font-weight:600; text-decoration:none; margin-top:8px; }
  .divider { height:1px; background:rgba(255,255,255,0.05); margin:20px 0; }
  .info-row { display:flex; gap:8px; align-items:flex-start; margin-bottom:10px; }
  .info-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:#52525b; min-width:88px; padding-top:1px; }
  .info-val { font-size:13px; color:#d4d4d8; }
`;

function baseTemplate(accentColor, headerBg, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header" style="background:${headerBg}">
        <div class="logo-row">
          <div class="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="logo-text">Hire<span>Sphere</span></div>
        </div>
        ${content.header}
      </div>
      <div class="body">
        ${content.body}
      </div>
      <div class="footer">
        <p class="muted">This email was sent by HireSphere. If you believe this was sent in error, please disregard it.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Email: Candidate Selected ─────────────────────────────────────────────────

function selectedHtml({ candidateName, interviewTitle, interviewerName, companyName }) {
  return baseTemplate(
    '#a3e635',
    'linear-gradient(135deg,rgba(163,230,53,0.08) 0%,rgba(34,211,238,0.04) 100%)',
    {
      header: `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:14px;background:rgba(163,230,53,0.12);border:1px solid rgba(163,230,53,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a3e635" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <h1 style="color:#a3e635;">Congratulations! 🎉</h1>
            <p style="margin:0;font-size:13px;color:#71717a;">You've been selected</p>
          </div>
        </div>
      `,
      body: `
        <p>Hi <span class="highlight">${candidateName}</span>,</p>
        <p>We're thrilled to let you know that after reviewing your interview for <strong class="highlight">${interviewTitle}</strong>, you have been <strong style="color:#a3e635;">selected</strong> to move forward!</p>
        <div class="divider"></div>
        <div class="info-row"><span class="info-label">Interview</span><span class="info-val">${interviewTitle}</span></div>
        <div class="info-row"><span class="info-label">Interviewer</span><span class="info-val">${interviewerName || 'HireSphere Team'}</span></div>
        ${companyName ? `<div class="info-row"><span class="info-label">Company</span><span class="info-val">${companyName}</span></div>` : ''}
        <div class="divider"></div>
        <p>The hiring team will be in touch shortly with next steps. In the meantime, feel free to reply to this email if you have any questions.</p>
        <p>We look forward to working with you!</p>
        <p style="margin-top:20px;color:#52525b;font-size:13px;">Best regards,<br/><span style="color:#d4d4d8;font-weight:600;">${interviewerName || 'The HireSphere Team'}</span></p>
      `,
    }
  );
}

// ── Email: Candidate Rejected ─────────────────────────────────────────────────

function rejectedHtml({ candidateName, interviewTitle, interviewerName, companyName }) {
  return baseTemplate(
    '#f43f5e',
    'linear-gradient(135deg,rgba(244,63,94,0.06) 0%,rgba(139,92,246,0.03) 100%)',
    {
      header: `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:14px;background:rgba(244,63,94,0.10);border:1px solid rgba(244,63,94,0.22);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h1 style="color:#f87171;">Application Update</h1>
            <p style="margin:0;font-size:13px;color:#71717a;">${interviewTitle}</p>
          </div>
        </div>
      `,
      body: `
        <p>Hi <span class="highlight">${candidateName}</span>,</p>
        <p>Thank you for taking the time to interview for <strong class="highlight">${interviewTitle}</strong>. We genuinely appreciate your effort and the time you invested in the process.</p>
        <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements. This was not an easy decision — the competition was strong.</p>
        <div class="divider"></div>
        <div class="info-row"><span class="info-label">Interview</span><span class="info-val">${interviewTitle}</span></div>
        ${companyName ? `<div class="info-row"><span class="info-label">Company</span><span class="info-val">${companyName}</span></div>` : ''}
        <div class="divider"></div>
        <p>We encourage you to keep honing your skills and applying. This decision reflects the needs of this specific role — not your abilities or potential.</p>
        <p>We wish you all the best in your career journey and hope our paths cross again in the future.</p>
        <p style="margin-top:20px;color:#52525b;font-size:13px;">Warm regards,<br/><span style="color:#d4d4d8;font-weight:600;">${interviewerName || 'The HireSphere Team'}</span></p>
      `,
    }
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a hiring decision email to the candidate.
 * Silently skips if RESEND_API_KEY is not configured (no crash).
 *
 * @param {'selected'|'rejected'} decision
 * @param {{ candidateName, candidateEmail, interviewTitle, interviewerName, companyName? }} opts
 */
async function sendDecisionEmail(decision, opts) {
  const apiKey  = process.env.RESEND_API_KEY;
  const from    = process.env.MAIL_FROM || 'HireSphere <onboarding@resend.dev>';

  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    console.log('[mailer] RESEND_API_KEY not set — skipping decision email');
    return;
  }

  const isSelected = decision === 'selected';
  const subject    = isSelected
    ? `🎉 Congratulations! You've been selected — ${opts.interviewTitle}`
    : `Application Update — ${opts.interviewTitle}`;
  const html = isSelected
    ? selectedHtml(opts)
    : rejectedHtml(opts);

  try {
    const result = await sendViaResend(apiKey, {
      from,
      to:      [opts.candidateEmail],
      subject,
      html,
    });
    console.log(`[mailer] ${decision} email sent to ${opts.candidateEmail} — id: ${result.id}`);
  } catch (err) {
    // Non-fatal — log but don't crash the request
    console.error('[mailer] Failed to send decision email:', err.message);
  }
}

module.exports = { sendDecisionEmail };
