import { supabase } from '../lib/supabase.js';
import { createMeetingEvent } from './googleCalendar.js';
import {
  sendBookingConfirmationToUser,
  sendBookingConfirmationToListener,
} from './sendgrid.js';

export async function generateMeetingAndNotify(bookingId) {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, user_id, listener_id, slot_date, start_time, end_time, platform, amount, listener_payout')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    console.error('generateMeetingAndNotify: booking not found', bookingError?.message);
    return;
  }

  const [userResult, listenerResult] = await Promise.all([
    supabase.from('users').select('email, full_name').eq('id', booking.user_id).single(),
    supabase.from('users').select('email, full_name').eq('id', booking.listener_id).single(),
  ]);

  const user = userResult.data;
  const listener = listenerResult.data;

  if (!user || !listener) {
    console.error('generateMeetingAndNotify: user or listener not found');
    return;
  }

  const startDateTime = `${booking.slot_date}T${booking.start_time}:00Z`;
  const endDateTime = `${booking.slot_date}T${booking.end_time}:00Z`;
  const dateDisplay = booking.slot_date;
  const timeDisplay = `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`;

  let meetLink = null;
  let eventId = null;

  if (booking.platform === 'google_meet') {
    try {
      const meetResult = await createMeetingEvent({
        summary: `ChatMate session: ${user.full_name} + ${listener.full_name}`,
        description: 'ChatMate emotional support session. This platform is not therapy.',
        startDateTime,
        endDateTime,
        attendees: [user.email, listener.email],
      });

      meetLink = meetResult.meetLink;
      eventId = meetResult.eventId;

      await supabase
        .from('bookings')
        .update({ meeting_link: meetLink, calendar_event_id: eventId })
        .eq('id', bookingId);
    } catch (calendarError) {
      console.error('Google Calendar error:', calendarError.message);
    }
  }

  const userFirstName = user.full_name.split(' ')[0];

  try {
    await sendBookingConfirmationToUser({
      userEmail: user.email,
      userName: user.full_name,
      listenerName: listener.full_name,
      date: dateDisplay,
      time: timeDisplay,
      platform: booking.platform,
      meetLink,
    });
  } catch (emailError) {
    console.error('SendGrid error (user email):', emailError.message);
  }

  try {
    await sendBookingConfirmationToListener({
      listenerEmail: listener.email,
      listenerName: listener.full_name,
      userFirstName,
      date: dateDisplay,
      time: timeDisplay,
      platform: booking.platform,
      meetLink,
      earnings: booking.listener_payout || 0,
    });
  } catch (emailError) {
    console.error('SendGrid error (listener email):', emailError.message);
  }
}
