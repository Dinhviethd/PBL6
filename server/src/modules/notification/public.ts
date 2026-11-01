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
      // One statement keeps the page, filtered total and inbox count on one snapshot.
      const pageSize = 10;
      const rows = await repo.list(p.userId, page * pageSize, unread);
      const total = Number(rows[0]?.total ?? 0);
      return {
        items: rows.filter((row) => row.id).map(({ total: _total, unread_count: _unread, ...item }) => item),
        hasNext: (page + 1) * pageSize < total,
        unreadCount: Number(rows[0]?.unread_count ?? 0),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
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
