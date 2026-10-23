import { randomUUID } from "node:crypto";
import type { Store } from "../../../contracts/core";

export type NotificationInput = {
  userId: string;
  kind:
    | "ORDER_PAID"
    | "STAFF_INVITED"
    | "EVENT_UPDATED"
    | "EVENT_REMINDER"
    | "WAIT_QUEUE_OFFER";
  title: string;
  message: string;
  target: "ORDER" | "TICKETS" | "STAFF";
  targetId: string;
  dedupeKey: string;
};

export function notificationStore(db: Store) {
  return {
    insert: (n: NotificationInput) =>
      db.query(
        `INSERT INTO notifications(id,user_id,kind,title,message,target,target_id,dedupe_key)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,dedupe_key) DO NOTHING RETURNING id`,
        [
          randomUUID(),
          n.userId,
          n.kind,
          n.title,
          n.message,
          n.target,
          n.targetId,
          n.dedupeKey,
        ],
      ),
    list: (user: string, offset: number, unread: boolean) =>
      db.query(
        `SELECT id,kind,title,message,target,target_id,created_at,read_at FROM notifications
       WHERE user_id=$1 AND ($3::boolean=false OR read_at IS NULL)
       ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET $2`,
        [user, offset, unread],
      ),
    unreadCount: async (user: string) =>
      Number(
        (
          await db.query(
            "SELECT count(*) AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL",
            [user],
          )
        )[0].count,
      ),
    markRead: (user: string, id: string) =>
      db.query(
        "UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE user_id=$1 AND id=$2 RETURNING id",
        [user, id],
      ),
    markAllRead: (user: string) =>
      db.query(
        "UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL",
        [user],
      ),
  };
}
