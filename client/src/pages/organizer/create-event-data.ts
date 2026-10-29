export const emptyEventForm = {
  title: "", categoryId: "", description: "", venueName: "", address: "", cityCode: "",
  startsDate: "", startsTime: "", endsDate: "", endsTime: "",
  checkinOpensAt: "", checkinClosesAt: "", coverImageUrl: "",
};
export type CreateEventForm = typeof emptyEventForm;
export const draftKey = (userId: string) => `eventhub.create-event.${userId}.v1`;
export const MAX_BANNER_BYTES = 5 * 1024 * 1024;

export function readEventDraft(key: string): { values: CreateEventForm; restored: boolean; error: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { values: { ...emptyEventForm }, restored: false, error: "" };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || typeof parsed.values !== "object" || !parsed.values)
      throw new Error("Invalid draft");
    const values = { ...emptyEventForm };
    for (const field of Object.keys(values) as (keyof CreateEventForm)[]) {
      if (typeof parsed.values[field] !== "string" || parsed.values[field].length > 20000)
        throw new Error("Invalid draft field");
      values[field] = parsed.values[field];
    }
    if (values.coverImageUrl && !/^(https?:\/\/|\/uploads\/[0-9a-f-]+\.webp$)/.test(values.coverImageUrl))
      values.coverImageUrl = "";
    return { values, restored: true, error: "" };
  } catch {
    return { values: { ...emptyEventForm }, restored: false,
      error: "Không đọc được bản nháp trên thiết bị. Bạn vẫn có thể nhập và lưu sự kiện." };
  }
}

// Form times are explicitly Vietnam time, independent of the browser timezone.
export function eventInstant(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Vui lòng nhập đầy đủ ngày và giờ.");
  const date = new Date(`${value}:00+07:00`);
  if (!Number.isFinite(date.getTime())) throw new Error("Ngày hoặc giờ không hợp lệ.");
  return date.toISOString();
}

export function createEventPayload(values: CreateEventForm) {
  const startsAt = eventInstant(`${values.startsDate}T${values.startsTime}`);
  const endsAt = eventInstant(`${values.endsDate}T${values.endsTime}`);
  const checkinOpensAt = eventInstant(values.checkinOpensAt);
  const checkinClosesAt = eventInstant(values.checkinClosesAt);
  if (startsAt >= endsAt) throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu sự kiện.");
  if (checkinOpensAt >= checkinClosesAt) throw new Error("Thời gian đóng check-in phải sau thời gian mở check-in.");
  if (checkinClosesAt > endsAt) throw new Error("Check-in phải đóng trước hoặc cùng lúc sự kiện kết thúc.");
  const payload = {
    title: values.title.trim(), categoryId: values.categoryId, description: values.description.trim(),
    venueName: values.venueName.trim(), address: values.address.trim(), cityCode: values.cityCode.trim(),
    startsAt, endsAt, checkinOpensAt, checkinClosesAt,
    ...(values.coverImageUrl ? { coverImageUrl: values.coverImageUrl } : {}),
  };
  if ([payload.title, payload.description, payload.venueName, payload.address, payload.cityCode].some((v) => !v))
    throw new Error("Vui lòng điền các thông tin bắt buộc, không chỉ nhập khoảng trắng.");
  return payload;
}

export function eventMapUrl(values: Pick<CreateEventForm, "venueName" | "address" | "cityCode">) {
  if (!values.address.trim()) return "";
  const query = [values.venueName, values.address, values.cityCode].map((s) => s.trim()).filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
