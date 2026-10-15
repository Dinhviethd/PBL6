export type InboxNotification = {
  id: string;
  kind: "ORDER_PAID" | "STAFF_INVITED" | "EVENT_UPDATED" | "EVENT_REMINDER";
  title: string;
  message: string;
  target: "ORDER" | "TICKETS" | "STAFF";
  target_id: string;
  created_at: string;
  read_at: string | null;
};
export type NotificationInbox = {
  items: InboxNotification[];
  unreadCount: number;
  hasNext: boolean;
};
export const notificationLabels = {
  ORDER_PAID: "Vé của bạn",
  STAFF_INVITED: "Lời mời",
  EVENT_UPDATED: "Cập nhật sự kiện",
  EVENT_REMINDER: "Nhắc lịch",
};
