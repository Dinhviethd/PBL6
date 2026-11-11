export type DateRange = { fromDate: string; toDate: string };
const dayMs = 86400000;
export const vietnamDate = (date = new Date()) =>
  new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export function dayBoundary(day: string, next = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new Error("Chọn ngày theo định dạng YYYY-MM-DD.");
  const [y, m, d] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (y < 1970 || y > 9998 || utc.toISOString().slice(0, 10) !== day)
    throw new Error("Ngày không hợp lệ. Vui lòng chọn lại.");
  return new Date(
    utc.getTime() - 7 * 3600000 + (next ? dayMs : 0),
  ).toISOString();
}
export function validateRange(range: DateRange, maxDays?: number) {
  if (range.fromDate) dayBoundary(range.fromDate);
  if (range.toDate) dayBoundary(range.toDate);
  if (range.fromDate && range.toDate) {
    const days =
      (Date.parse(dayBoundary(range.toDate, true)) -
        Date.parse(dayBoundary(range.fromDate))) /
      dayMs;
    if (days <= 0)
      throw new Error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
    if (maxDays && days > maxDays)
      throw new Error(`Chọn tối đa ${maxDays} ngày.`);
  } else if (maxDays) throw new Error("Chọn đầy đủ ngày bắt đầu và kết thúc.");
}
export function recentRange(days = 30, now = new Date()): DateRange {
  const toDate = vietnamDate(now);
  return {
    fromDate: vietnamDate(
      new Date(Date.parse(dayBoundary(toDate)) - (days - 1) * dayMs),
    ),
    toDate,
  };
}
export function rangeParams(range: DateRange, instants = false) {
  validateRange(range);
  const q = new URLSearchParams();
  if (range.fromDate)
    q.set(
      instants ? "from" : "fromDate",
      instants ? dayBoundary(range.fromDate) : range.fromDate,
    );
  if (range.toDate)
    q.set(
      instants ? "toExclusive" : "toDate",
      instants ? dayBoundary(range.toDate, true) : range.toDate,
    );
  return q;
}
export const orderGroups = [
  { value: "all", label: "Tất cả" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "processing", label: "Đang xử lý" },
  { value: "closed", label: "Đã kết thúc" },
];
