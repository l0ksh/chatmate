import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { sendReminderEmail } from './sendgrid.js';

export function startReminderJob() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[cron] Running reminder + completion check...');

    try {
      await sendReminders();
    } catch (err) {
      console.error('[cron] Reminder error:', err.message);
    }

    try {
      await markCompleted();
    } catch (err) {
      console.error('[cron] Completion error:', err.message);
    }
  });

  console.log('[cron] Reminder job scheduled (every 15 minutes)');
}

async function sendReminders() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const targetDate = oneHourLater.toISOString().slice(0, 10);
  const targetHour = oneHourLater.toISOString().slice(11, 16);

  const nowDate = now.toISOString().slice(0, 10);
  const nowHour = now.toISOString().slice(11, 16);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id, slot_date, start_time, end_time, platform, meeting_link,
      reminder_sent,
      user:user_id(email, full_name),
      listener:listener_id(email, full_name)
    `)
    .eq('status', 'confirmed')
    .eq('reminder_sent', false);

  if (error) {
    console.error('[cron] Query error:', error.message);
    return;
  }

  for (const booking of bookings || []) {
    const sessionStart = `${booking.slot_date}T${booking.start_time}`;
    const sessionStartDate = new Date(sessionStart + 'Z');
    const diffMs = sessionStartDate.getTime() - now.getTime();

    if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
      const timeDisplay = `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`;

      try {
        await sendReminderEmail({
          email: booking.user.email,
          name: booking.user.full_name,
          listenerOrUserLabel: booking.listener.full_name,
          date: booking.slot_date,
          time: timeDisplay,
          meetLink: booking.meeting_link,
        });
      } catch (emailErr) {
        console.error('[cron] User reminder email failed:', emailErr.message);
      }

      try {
        await sendReminderEmail({
          email: booking.listener.email,
          name: booking.listener.full_name,
          listenerOrUserLabel: booking.user.full_name.split(' ')[0],
          date: booking.slot_date,
          time: timeDisplay,
          meetLink: booking.meeting_link,
        });
      } catch (emailErr) {
        console.error('[cron] Listener reminder email failed:', emailErr.message);
      }

      await supabase
        .from('bookings')
        .update({ reminder_sent: true })
        .eq('id', booking.id);

      console.log(`[cron] Reminder sent for booking ${booking.id}`);
    }
  }
}

async function markCompleted() {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const currentTime = now.slice(11, 19);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, slot_date, end_time')
    .eq('status', 'confirmed');

  if (error) {
    console.error('[cron] Mark-completed query error:', error.message);
    return;
  }

  for (const booking of bookings || []) {
    const sessionEnd = new Date(`${booking.slot_date}T${booking.end_time}Z`);
    if (sessionEnd <= new Date()) {
      await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.id);

      console.log(`[cron] Booking ${booking.id} marked as completed`);
    }
  }
}
