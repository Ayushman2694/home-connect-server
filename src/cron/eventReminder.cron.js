import cron from "node-cron";
import Feed from "../models/feed.model.js";
import { NOTIFICATION_TYPES } from "../utils/constants.js";
import { createNotificationForMany } from "../services/notification.service.js";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function parseEventDateTime(feed) {
  const raw = feed.eventTime ? `${feed.eventDate} ${feed.eventTime}` : feed.eventDate;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function processEventReminders() {
  const now = Date.now();
  const events = await Feed.find({
    type: "event",
    $or: [{ reminderSent: false }, { completedNotified: false }],
  });

  for (const event of events) {
    const eventDateTime = parseEventDateTime(event);
    if (!eventDateTime) continue;

    const registrantIds = (event.rsvps || []).map((r) => r.user);
    if (registrantIds.length === 0) continue;

    const msUntilEvent = eventDateTime.getTime() - now;

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

    if (!event.completedNotified && msUntilEvent <= 0) {
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
