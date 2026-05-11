import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'hello@chatmate.com';

if (!apiKey) {
  console.warn('SENDGRID_API_KEY missing. Email sending will fail.');
}

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const DISCLAIMER_FOOTER =
  'Disclaimer: ChatMate is not a therapy platform. Listeners are not licensed therapists.';

export async function sendBookingConfirmationToUser({
  userEmail,
  userName,
  listenerName,
  date,
  time,
  platform,
  meetLink,
}) {
  const msg = {
    to: userEmail,
    from: { email: fromEmail, name: 'ChatMate' },
    subject: `Your session with ${listenerName} is confirmed`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #2A9D8F;">Session confirmed!</h2>
        <p>Hi ${userName},</p>
        <p>Your session with <strong>${listenerName}</strong> has been confirmed.</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Date</td><td>${date}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Time</td><td>${time} (UTC)</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Platform</td><td>${platform === 'google_meet' ? 'Google Meet' : 'Zoom'}</td></tr>
        </table>
        ${
          meetLink
            ? `<a href="${meetLink}" style="display: inline-block; background: #2A9D8F; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Join session</a>`
            : '<p>Meeting link will be shared shortly.</p>'
        }
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">${DISCLAIMER_FOOTER}</p>
      </div>
    `,
  };

  return sgMail.send(msg);
}

export async function sendBookingConfirmationToListener({
  listenerEmail,
  listenerName,
  userFirstName,
  date,
  time,
  platform,
  meetLink,
  earnings,
}) {
  const msg = {
    to: listenerEmail,
    from: { email: fromEmail, name: 'ChatMate' },
    subject: `New session booked — ${date} at ${time}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #2A9D8F;">New session booked!</h2>
        <p>Hi ${listenerName},</p>
        <p>A new session has been booked with you.</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">User</td><td>${userFirstName}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Date</td><td>${date}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Time</td><td>${time} (UTC)</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Platform</td><td>${platform === 'google_meet' ? 'Google Meet' : 'Zoom'}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Your earnings</td><td>INR ${(earnings / 100).toFixed(2)}</td></tr>
        </table>
        ${
          meetLink
            ? `<a href="${meetLink}" style="display: inline-block; background: #2A9D8F; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Join session</a>`
            : '<p>Meeting link will be shared shortly.</p>'
        }
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">${DISCLAIMER_FOOTER}</p>
      </div>
    `,
  };

  return sgMail.send(msg);
}

export async function sendReminderEmail({ email, name, listenerOrUserLabel, date, time, meetLink }) {
  const msg = {
    to: email,
    from: { email: fromEmail, name: 'ChatMate' },
    subject: 'Your session starts in 1 hour',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #2A9D8F;">Reminder: session in 1 hour</h2>
        <p>Hi ${name},</p>
        <p>Your session with <strong>${listenerOrUserLabel}</strong> starts at <strong>${time} (UTC)</strong> on <strong>${date}</strong>.</p>
        ${
          meetLink
            ? `<a href="${meetLink}" style="display: inline-block; background: #2A9D8F; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Join session</a>`
            : ''
        }
        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">${DISCLAIMER_FOOTER}</p>
      </div>
    `,
  };

  return sgMail.send(msg);
}
