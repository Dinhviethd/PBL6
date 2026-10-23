export type WaitEntry = {
  id: string;
  event_title: string;
  type_name: string;
  status: "WAITING" | "OFFERED" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  position: string;
  order_id: string | null;
  expires_at: string | null;
};
export const waitLabels = {
  WAITING: "Đang chờ",
  OFFERED: "Đã giữ vé cho bạn",
  COMPLETED: "Đã mua vé",
  EXPIRED: "Hết hạn lời mời",
  CANCELLED: "Đã rời / đóng hàng chờ",
};
