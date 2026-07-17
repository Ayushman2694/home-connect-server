import cron from "node-cron";
import Feed from "../models/feed.model.js";
import { NOTIFICATION_TYPES } from "../utils/constants.js";
import { createNotificationForMany } from "../services/notification.service.js";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

// Feed schema stores event times as eventStartDate/eventStartTime and
// eventEndDate/eventEndTime (there is no eventDate/eventTime field — reading
// those meant reminders never fired).
function parseDateTime(date, time) {
  if (!date) return null;
  const raw = time ? `${date} ${time}` : date;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseEventStart(feed) {
  return parseDateTime(feed.eventStartDate, feed.eventStartTime);
}

function parseEventEnd(feed) {
  // Fall back to the start when no end date is set.
  return parseDateTime(feed.eventEndDate, feed.eventEndTime) || parseEventStart(feed);
}

async function processEventReminders() {
  const now = Date.now();
  const events = await Feed.find({
    type: "event",
    $or: [{ reminderSent: false }, { completedNotified: false }],
  });

  for (const event of events) {
    const eventStart = parseEventStart(event);
    if (!eventStart) continue;

    const registrantIds = (event.rsvps || []).map((r) => r.user);
    if (registrantIds.length === 0) continue;

    const msUntilEvent = eventStart.getTime() - now;
    const eventEnd = parseEventEnd(event);
    const msUntilEnd = eventEnd ? eventEnd.getTime() - now : msUntilEvent;

    if (!event.reminderSent && msUntilEvent > 0 && msUntilEvent <= REMINDER_WINDOW_MS) {
      try {
        await createNotificationForMany({
          title: "Event Reminder",
          message: `${event.title || "Your event"} is happening soon.`,
          notificationType: NOTIFICATION_TYPES.EVENT_REMINDER,
          receivers: registrantIds,
          metadata: { eventId: event._id },
        });
        event.reminderSent = true;
        await event.save();
      } catch (err) {
        console.error(`Failed to send reminder for event ${event._id}:`, err.message);
      }
    }

    // Completed = the event has ended (not merely started)
    if (!event.completedNotified && msUntilEnd <= 0) {
      try {
        await createNotificationForMany({
          title: "Event Completed",
          message: `${event.title || "The event"} has concluded. Thanks for attending!`,
          notificationType: NOTIFICATION_TYPES.EVENT_COMPLETED,
          receivers: registrantIds,
          metadata: { eventId: event._id },
        });
        event.completedNotified = true;
        await event.save();
      } catch (err) {
        console.error(`Failed to send completion notice for event ${event._id}:`, err.message);
      }
    }
  }
}

export function startEventReminderCron() {
  // Runs hourly — checks for events starting within 24h (reminder) or
  // already passed (completed), sending each notification exactly once
  // via the reminderSent/completedNotified flags on Feed.
  cron.schedule("0 * * * *", () => {
    processEventReminders().catch((err) =>
      console.error("Event reminder cron failed:", err.message),
    );
  });
  console.log("⏰ Event reminder cron scheduled (hourly)");
}
