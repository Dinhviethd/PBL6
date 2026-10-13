import { ensure, type Store, type Principal } from "../../contracts/core";
import {
  notificationStore,
  type NotificationInput,
} from "./infrastructure/store";

export function createNotifications(db: Store) {
  const repo = notificationStore(db);
  return {
    async send(input: NotificationInput) {
      return (await repo.insert(input)).length;
    },
    async inbox(p: Principal, page: number, unread: boolean) {
      const rows = await repo.list(p.userId, page * 50, unread);
      return {
        items: rows.slice(0, 50),
        hasNext: rows.length > 50,
        unreadCount: await repo.unreadCount(p.userId),
      };
    },
    async count(p: Principal) {
      return { unreadCount: await repo.unreadCount(p.userId) };
    },
    async markRead(p: Principal, id: string) {
      ensure(
        (await repo.markRead(p.userId, id)).length,
        "NOT_FOUND",
        "Không tìm thấy thông báo.",
        404,
      );
    },
    markAllRead: (p: Principal) => repo.markAllRead(p.userId),
  };
}
export type Notifications = ReturnType<typeof createNotifications>;
