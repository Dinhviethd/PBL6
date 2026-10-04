import type { Store, Principal, Row } from "../../contracts/core";
import { ensure, role } from "../../contracts/core";
import { eventStore } from "./infrastructure/store";
export function createEvents(db: Store) {
  const r = eventStore(db);
  return {
    ...r,
    async checkinGuard(id: string, p: Principal) {
      // Shared event lock is held through the scan transaction. Revocation takes
      // an exclusive lock, so a completed revocation rejects every later scan.
      const e = await r.one(id, "share");
      ensure(e, "NOT_FOUND", "Không tìm thấy sự kiện.", 404);
      if (
        !p.roles.includes("ADMIN") &&
        !(p.roles.includes("ORGANIZER") && e.organizer_id === p.userId)
      ) {
        const member = await r.staffMember(id, p.userId);
        ensure(
          member?.status === "ACTIVE",
          "FORBIDDEN",
          "Bạn chưa được cấp quyền check-in cho sự kiện này hoặc quyền đã bị thu hồi.",
          403,
        );
      }
      return e;
    },
    async inviteCheckinStaff(event: Row, p: Principal, user: Row) {
      ensure(
        user.id !== event.organizer_id && user.id !== p.userId,
        "INVALID_INVITEE",
        "Người quản lý đã có quyền check-in, không cần tự mời.",
        400,
      );
      ensure(
        !["CANCELLED", "ARCHIVED"].includes(event.status) &&
          new Date(event.ends_at) > new Date(),
        "EVENT_CLOSED",
        "Không thể mời nhân viên cho sự kiện đã đóng.",
      );
      const previous = await r.staffMember(event.id, user.id);
      ensure(
        !previous ||
          !["ACTIVE", "PENDING"].includes(previous.status) ||
          (previous.status === "PENDING" &&
            new Date(previous.expires_at) <= new Date()),
        "STAFF_EXISTS",
        "Tài khoản đã có quyền hoặc đang có lời mời còn hiệu lực.",
      );
      return r.inviteStaff(event.id, p.userId, user);
    },
    async respondCheckinInvitation(
      event: Row,
      p: Principal,
      id: string,
      accept: boolean,
    ) {
      const invitation = await r.staffInvitation(id);
      ensure(
        invitation &&
          invitation.event_id === event.id &&
          invitation.user_id === p.userId,
        "NOT_FOUND",
        "Không tìm thấy lời mời.",
        404,
      );
      ensure(
        invitation.status === "PENDING" &&
          new Date(invitation.expires_at) > new Date(),
        "INVITATION_CLOSED",
        "Lời mời đã hết hạn hoặc đã được xử lý.",
      );
      ensure(
        !["CANCELLED", "ARCHIVED"].includes(event.status) &&
          new Date(event.ends_at) > new Date(),
        "EVENT_CLOSED",
        "Sự kiện đã đóng.",
      );
      return r.respondStaff(id, accept);
    },
    async revokeCheckinStaff(eventId: string, id: string) {
      const invitation = await r.staffInvitation(id);
      ensure(
        invitation?.event_id === eventId,
        "NOT_FOUND",
        "Không tìm thấy nhân viên.",
        404,
      );
      return r.revokeStaff(id);
    },
    async guard(id: string, p?: Principal, write = false) {
      const e = await r.one(id, write ? "update" : "share");
      ensure(e, "NOT_FOUND", "Không tìm thấy sự kiện.", 404);
      if (p)
        ensure(
          p.roles.includes("ADMIN") ||
            (p.roles.includes("ORGANIZER") && e.organizer_id === p.userId),
          "FORBIDDEN",
          "Bạn không quản lý sự kiện này.",
          403,
        );
      return e;
    },
    async create(p: Principal, d: Row) {
      role(p, ["ORGANIZER", "ADMIN"]);
      const c = await r.category(d.categoryId);
      ensure(
        c && !c.archived_at,
        "INVALID_CATEGORY",
        "Danh mục không khả dụng.",
        400,
      );
      return r.save(p.userId, d);
    },
    async publicOne(slug: string) {
      const e = await r.bySlug(slug);
      ensure(
        e?.status === "PUBLISHED",
        "NOT_FOUND",
        "Sự kiện chưa được công khai.",
        404,
      );
      return e;
    },
  };
}
export type Events = ReturnType<typeof createEvents>;
