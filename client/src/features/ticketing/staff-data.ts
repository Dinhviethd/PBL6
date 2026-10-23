export type Assignment = {
  id: string;
  event_id: string;
  status: string;
  expires_at: string;
  staff_name: string;
  staff_email: string;
  title: string;
  venue_name: string;
  starts_at: string;
  ends_at: string;
  checkin_opens_at: string;
  checkin_closes_at: string;
  event_status: string;
};
export const status = (s: Assignment) =>
  s.status === "PENDING" && new Date(s.expires_at) <= new Date()
    ? "EXPIRED"
    : s.status;
export const labels: Record<string, string> = {
  PENDING: "Chờ chấp nhận",
  ACTIVE: "Đã nhận việc",
  DECLINED: "Đã từ chối",
  REVOKED: "Đã thu hồi",
  EXPIRED: "Lời mời hết hạn",
};
