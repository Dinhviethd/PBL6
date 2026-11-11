export type EventFilters = {
  q: string;
  city: string;
  category: string;
  from: string;
  to: string;
  minPrice?: string;
  maxPrice?: string;
};
export const emptyEventFilters: EventFilters = {
  q: "",
  city: "",
  category: "",
  from: "",
  to: "",
  minPrice: "",
  maxPrice: "",
};

function localDate(value: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Nhập ngày theo định dạng YYYY-MM-DD.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error("Ngày không hợp lệ. Vui lòng chọn lại.");
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}+07:00`);
}

export function eventQuery(filters: EventFilters, page = 0) {
  const params = new URLSearchParams({ page: String(page) });
  for (const key of ["q", "city", "category"] as const) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  for (const key of ["minPrice", "maxPrice"] as const) {
    const amount = filters[key]?.trim();
    if (!amount) continue;
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(Number(amount)))
      throw new Error("Giá vé phải là số nguyên không âm hợp lệ.");
    params.set(key, amount);
  }
  if (
    params.has("minPrice") &&
    params.has("maxPrice") &&
    Number(params.get("minPrice")) > Number(params.get("maxPrice"))
  )
    throw new Error("Giá tối đa phải bằng hoặc lớn hơn giá tối thiểu.");
  if (filters.from) params.set("from", localDate(filters.from).toISOString());
  if (filters.to) params.set("to", localDate(filters.to, true).toISOString());
  if (filters.from && filters.to && filters.from > filters.to)
    throw new Error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
  return params.toString();
}

export function eventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Đang cập nhật thời gian"
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      });
}
