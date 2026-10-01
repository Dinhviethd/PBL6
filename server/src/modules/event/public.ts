import type { Store, Principal, Row } from "../../contracts/core";
import { ensure, role } from "../../contracts/core";
import { eventStore } from "./infrastructure/store";
export function createEvents(db: Store) {
  const r = eventStore(db);
  return {
    ...r,
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
