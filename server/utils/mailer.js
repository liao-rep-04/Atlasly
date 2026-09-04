// Transactional email via Resend's REST API (no SDK needed — one POST).
// Without RESEND_API_KEY configured, emails are logged to the console
// instead of sent — the password-reset flow stays fully testable in dev,
// same graceful-fallback pattern as utils/funFacts.js.

export const mailerConfigured = () => Boolean(process.env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, html, text }) => {
  if (!mailerConfigured()) {
    console.log(
      `[Mailer] ⚠️ RESEND_API_KEY not set — printing email instead of sending:\n` +
        `  To: ${to}\n  Subject: ${subject}\n  ---\n${text}\n  ---`
    );
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Atlasly <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`[Mailer] ✗ Resend responded ${response.status}: ${body}`);
      return { sent: false, reason: 'send_failed' };
    }
    console.log(`[Mailer] ✓ Email sent to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error('[Mailer] ❌ Send error:', error.message);
    return { sent: false, reason: 'send_failed' };
  }
};
