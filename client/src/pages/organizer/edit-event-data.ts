import type { Event } from "@/features/ticketing/types";
import { createEventPayload, type CreateEventForm } from "./create-event-data";

// Fixed Vietnam time, including when the browser uses a different timezone.
function localTime(value: string) {
  return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
}

export function editEventForm(event: Event): CreateEventForm {
  const start = localTime(event.starts_at), end = localTime(event.ends_at);
  return {
    title: event.title, categoryId: event.category_id, description: event.description,
    venueName: event.venue_name, address: event.address, cityCode: event.city_code,
    startsDate: start.slice(0, 10), startsTime: start.slice(11),
    endsDate: end.slice(0, 10), endsTime: end.slice(11),
    checkinOpensAt: localTime(event.checkin_opens_at),
    checkinClosesAt: localTime(event.checkin_closes_at), coverImageUrl: event.cover_image_url ?? "",
  };
}

export function editEventPayload(values: CreateEventForm, event: Event) {
  const initial = editEventForm(event);
  // datetime-local displays minutes. Preserve original seconds/milliseconds for
  // untouched values so a text edit does not trigger SOLD_EVENT or notifications.
  return createEventPayload(values, {
    ...(values.startsDate === initial.startsDate && values.startsTime === initial.startsTime ? { startsAt: event.starts_at } : {}),
    ...(values.endsDate === initial.endsDate && values.endsTime === initial.endsTime ? { endsAt: event.ends_at } : {}),
    ...(values.checkinOpensAt === initial.checkinOpensAt ? { checkinOpensAt: event.checkin_opens_at } : {}),
    ...(values.checkinClosesAt === initial.checkinClosesAt ? { checkinClosesAt: event.checkin_closes_at } : {}),
  });
}
