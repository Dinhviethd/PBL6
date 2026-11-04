import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
export function eventStore(db: Store) {
  return {
    dashboardEvents: (ownerId: string, eventId?: string) => db.query(
      `SELECT id,title,cover_image_url,venue_name,starts_at,ends_at,status,sales_paused,archived_at,cancelled_at
       FROM events WHERE organizer_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY starts_at,id`,
      [ownerId, eventId ?? null],
    ),
    organizerStaffPage: (ownerId: string, offset: number) =>
      db.query(
        `SELECT s.user_id, max(s.staff_name) AS name,max(s.staff_email) AS email,count(*) AS assignment_count
       FROM event_checkin_staff s JOIN events e ON e.id=s.event_id
       WHERE e.organizer_id=$1 GROUP BY s.user_id ORDER BY s.user_id LIMIT 51 OFFSET $2`,
        [ownerId, offset],
      ),
    organizerStaffAssignments: (ownerId: string, userId: string) =>
      db.query(
        `SELECT s.id,s.event_id,s.user_id,s.status,s.expires_at,e.title FROM event_checkin_staff s
       JOIN events e ON e.id=s.event_id WHERE e.organizer_id=$1 AND s.user_id=$2 ORDER BY e.id,s.id`,
        [ownerId, userId],
      ),
    organizerProfileEvents: (ownerId: string) =>
      db.query(
        "SELECT id,published_at FROM events WHERE organizer_id=$1 ORDER BY id",
        [ownerId],
      ),
    eventIdsByOrganizers: (userIds: string[]) =>
      db.query(
        "SELECT id,organizer_id FROM events WHERE organizer_id=ANY($1::uuid[])",
        [userIds],
      ),
    reminderEvents: (after: string | null) =>
      db.query(
        `SELECT id FROM events WHERE status='PUBLISHED' AND starts_at>now()
       AND starts_at<=now()+interval '24 hours' AND ($1::uuid IS NULL OR id>$1)
       ORDER BY id LIMIT 100`,
        [after],
      ),
    notificationStaff: (eventId: string, includePending = false) =>
      db.query(
        `SELECT user_id FROM event_checkin_staff WHERE event_id=$1 AND
       (status='ACTIVE' OR ($2::boolean=true AND status='PENDING' AND expires_at>now()))
       ORDER BY user_id`,
        [eventId, includePending],
      ),
    staffMember: async (eventId: string, userId: string) =>
      (
        await db.query(
          "SELECT * FROM event_checkin_staff WHERE event_id=$1 AND user_id=$2",
          [eventId, userId],
        )
      )[0],
    staffInvitation: async (id: string) =>
      (
        await db.query("SELECT * FROM event_checkin_staff WHERE id=$1", [id])
      )[0],
    staffList: (eventId: string, offset: number) =>
      db.query(
        "SELECT * FROM event_checkin_staff WHERE event_id=$1 ORDER BY invited_at DESC,id LIMIT 50 OFFSET $2",
        [eventId, offset],
      ),
    staffAssignments: (userId: string, offset: number) =>
      db.query(
        `SELECT s.id,s.event_id,s.status,s.invited_at,s.expires_at,e.title,e.venue_name,e.starts_at,e.ends_at,
        e.checkin_opens_at,e.checkin_closes_at,e.status AS event_status
        FROM event_checkin_staff s JOIN events e ON e.id=s.event_id
        WHERE s.user_id=$1 ORDER BY s.invited_at DESC,s.id LIMIT 50 OFFSET $2`,
        [userId, offset],
      ),
    staffAssignmentsPage: (userId: string, offset: number) =>
      db.query(
        `SELECT assignments.*, totals.total
         FROM (SELECT count(*) AS total FROM event_checkin_staff s
           JOIN events e ON e.id=s.event_id WHERE s.user_id=$1) totals
         LEFT JOIN (SELECT s.id,s.event_id,s.status,s.invited_at,s.expires_at,
           e.title,e.venue_name,e.starts_at,e.ends_at,e.checkin_opens_at,
           e.checkin_closes_at,e.status AS event_status,e.cover_image_url AS image_url
           FROM event_checkin_staff s JOIN events e ON e.id=s.event_id
           WHERE s.user_id=$1 ORDER BY s.invited_at DESC,s.id LIMIT 50 OFFSET $2
         ) assignments ON true
         ORDER BY assignments.invited_at DESC,assignments.id`,
        [userId, offset],
      ),
    inviteStaff: async (eventId: string, actor: string, user: Row) =>
      (
        await db.query(
          `INSERT INTO event_checkin_staff(id,event_id,user_id,invited_by,staff_name,staff_email)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_id,user_id) DO UPDATE SET
        id=EXCLUDED.id,invited_by=EXCLUDED.invited_by,staff_name=EXCLUDED.staff_name,staff_email=EXCLUDED.staff_email,
        status='PENDING',invited_at=now(),expires_at=now()+interval '7 days',responded_at=NULL,revoked_at=NULL RETURNING *`,
          [randomUUID(), eventId, user.id, actor, user.name, user.email],
        )
      )[0],
    respondStaff: async (id: string, accept: boolean) =>
      (
        await db.query(
          "UPDATE event_checkin_staff SET status=$2,responded_at=now() WHERE id=$1 RETURNING *",
          [id, accept ? "ACTIVE" : "DECLINED"],
        )
      )[0],
    revokeStaff: async (id: string) =>
      (
        await db.query(
          "UPDATE event_checkin_staff SET status='REVOKED',revoked_at=now() WHERE id=$1 RETURNING *",
          [id],
        )
      )[0],
    categories: () =>
      db.query(
        "SELECT * FROM categories WHERE archived_at IS NULL ORDER BY name",
      ),
    category: async (id: string) =>
      (await db.query("SELECT * FROM categories WHERE id=$1", [id]))[0],
    categoryBySlug: async (slug: string) =>
      (await db.query("SELECT * FROM categories WHERE slug=$1", [slug]))[0],
    categoryPage: (
      q: string,
      archived: boolean | null,
      limit: number,
      offset: number,
    ) =>
      db.query(
        `SELECT c.id,c.name,c.slug,c.description,c.archived_at,c.created_at,c.updated_at,
           count(e.id)::int AS event_count,count(*) OVER()::int AS total
         FROM categories c
         LEFT JOIN events e ON e.category_id=c.id AND e.archived_at IS NULL
         WHERE ($1='' OR c.name ILIKE '%'||$1||'%' OR c.slug ILIKE '%'||$1||'%')
           AND ($2::boolean IS NULL OR (c.archived_at IS NOT NULL)=$2)
         GROUP BY c.id
         ORDER BY c.archived_at NULLS FIRST,c.name,c.id
         LIMIT $3 OFFSET $4`,
        [q, archived, limit, offset],
      ),
    categoryStats: () =>
      db.query(
        `SELECT
           (SELECT count(*)::int FROM categories WHERE archived_at IS NULL) AS total,
           (SELECT count(*)::int FROM categories WHERE archived_at IS NOT NULL) AS archived,
           (SELECT count(*)::int FROM events e JOIN categories c ON c.id=e.category_id
             WHERE e.archived_at IS NULL AND c.archived_at IS NULL) AS total_events`,
      ),
    saveCategory: (d: Row, id?: string) =>
      id
        ? db.query(
            "UPDATE categories SET name=$2,slug=$3,description=$4,updated_at=now() WHERE id=$1 RETURNING *",
            [id, d.name, d.slug, d.description ?? null],
          )
        : db.query(
            "INSERT INTO categories(id,name,slug,description) VALUES($1,$2,$3,$4) RETURNING *",
            [randomUUID(), d.name, d.slug, d.description ?? null],
          ),
    archiveCategory: (id: string) =>
      db.query("UPDATE categories SET archived_at=now() WHERE id=$1", [id]),
    one: async (id: string, lock?: "share" | "update") =>
      (
        await db.query(
          `SELECT * FROM events WHERE id=$1${lock === "share" ? " FOR SHARE" : lock === "update" ? " FOR UPDATE" : ""}`,
          [id],
        )
      )[0],
    bySlug: async (slug: string) =>
      (await db.query("SELECT * FROM events WHERE slug=$1", [slug]))[0],
    list: (f: Row) =>
      db.query(
        `SELECT *,count(*) OVER() AS total_results FROM events WHERE ($1::text IS NULL OR status=$1) AND ($2::uuid IS NULL OR organizer_id=$2)
      AND (title ILIKE $3) AND ($4::uuid IS NULL OR category_id=$4) AND ($5::text IS NULL OR city_code=$5)
      AND ($6::timestamptz IS NULL OR starts_at >= $6) AND ($7::timestamptz IS NULL OR starts_at <= $7)
      AND ($10::uuid[] IS NULL OR id=ANY($10::uuid[]))
      ORDER BY starts_at,id LIMIT $8 OFFSET $9`,
        [
          f.status ?? null,
          f.owner ?? null,
          `%${f.q ?? ""}%`,
          f.category ?? null,
          f.city ?? null,
          f.from ?? null,
          f.to ?? null,
          f.limit ?? 50,
          f.offset ?? 0,
          f.ids ?? null,
        ],
      ),
    adminList: (f: Row) =>
      db.query(
        `SELECT e.id,e.slug,e.title,e.category_id,e.organizer_id,e.cover_image_url,
          e.venue_name,e.address,e.city_code,e.starts_at,e.ends_at,e.status,e.sales_paused,
          e.created_at,e.updated_at
         FROM events e
         WHERE ($1::text IS NULL OR e.status=$1)
           AND ($3::uuid IS NULL OR e.category_id=$3)
           AND ($4::text IS NULL OR e.city_code=$4)
           AND ($5::timestamptz IS NULL OR e.starts_at >= $5)
           AND ($6::timestamptz IS NULL OR e.starts_at <= $6)
           AND ($7::uuid[] IS NULL OR e.id=ANY($7::uuid[]))
           AND ($8::text='' OR e.title ILIKE $9 OR e.slug ILIKE $9 OR e.id::text ILIKE $9
             OR e.organizer_id=ANY(coalesce($2::uuid[],'{}'::uuid[])))
           AND ($12::uuid IS NULL OR e.organizer_id=$12)
         ORDER BY e.created_at DESC,e.id
         LIMIT $10 OFFSET $11`,
        [
          f.status ?? null,
          f.organizerIds ?? null,
          f.categoryId ?? null,
          f.cityCode ?? null,
          f.startsFrom ?? null,
          f.startsTo ?? null,
          f.eventIds ?? null,
          f.q ?? "",
          `%${String(f.q ?? "").replace(/[\\%_]/g, "\\$&")}%`,
          f.limit,
          f.offset,
          f.organizerId ?? null,
        ],
      ),
    adminCount: async (f: Row) =>
      (
        await db.query(
          `SELECT count(*) AS total FROM events e
           WHERE ($1::text IS NULL OR e.status=$1)
             AND ($3::uuid IS NULL OR e.category_id=$3)
             AND ($4::text IS NULL OR e.city_code=$4)
             AND ($5::timestamptz IS NULL OR e.starts_at >= $5)
             AND ($6::timestamptz IS NULL OR e.starts_at <= $6)
             AND ($7::uuid[] IS NULL OR e.id=ANY($7::uuid[]))
             AND ($8::text='' OR e.title ILIKE $9 OR e.slug ILIKE $9 OR e.id::text ILIKE $9
               OR e.organizer_id=ANY(coalesce($2::uuid[],'{}'::uuid[])))
             AND ($10::uuid IS NULL OR e.organizer_id=$10)`,
          [
            f.status ?? null,
            f.organizerIds ?? null,
            f.categoryId ?? null,
            f.cityCode ?? null,
            f.startsFrom ?? null,
            f.startsTo ?? null,
            f.eventIds ?? null,
            f.q ?? "",
            `%${String(f.q ?? "").replace(/[\\%_]/g, "\\$&")}%`,
            f.organizerId ?? null,
          ],
        )
      )[0],
    adminKpis: async (f: Row) =>
      (
        await db.query(
          `SELECT count(*)::text AS total,
             count(*) FILTER (WHERE status='PUBLISHED' AND NOT sales_paused AND ends_at>now())::text AS selling,
             count(*) FILTER (WHERE status='PENDING_REVIEW')::text AS pending_review,
             count(*) FILTER (WHERE sales_paused OR status IN ('CANCELLED','ARCHIVED'))::text AS paused_or_cancelled
           FROM events e
           WHERE ($1::text IS NULL OR e.status=$1)
             AND ($3::uuid IS NULL OR e.category_id=$3)
             AND ($4::text IS NULL OR e.city_code=$4)
             AND ($5::timestamptz IS NULL OR e.starts_at >= $5)
             AND ($6::timestamptz IS NULL OR e.starts_at <= $6)
             AND ($7::uuid[] IS NULL OR e.id=ANY($7::uuid[]))
             AND ($8::text='' OR e.title ILIKE $9 OR e.slug ILIKE $9 OR e.id::text ILIKE $9
               OR e.organizer_id=ANY(coalesce($2::uuid[],'{}'::uuid[])))
             AND ($10::uuid IS NULL OR e.organizer_id=$10)`,
          [
            f.status ?? null,
            f.organizerIds ?? null,
            f.categoryId ?? null,
            f.cityCode ?? null,
            f.startsFrom ?? null,
            f.startsTo ?? null,
            f.eventIds ?? null,
            f.q ?? "",
            `%${String(f.q ?? "").replace(/[\\%_]/g, "\\$&")}%`,
            f.organizerId ?? null,
          ],
        )
      )[0],
    adminFilterOptions: async () => {
      const [categories, cities] = await Promise.all([
        db.query("SELECT id,name FROM categories WHERE archived_at IS NULL ORDER BY name,id"),
        db.query("SELECT DISTINCT city_code FROM events WHERE city_code<>'' ORDER BY city_code"),
      ]);
      return {
        categories,
        cities: cities.map((row) => row.city_code),
        ticketScales: [
          { value: "SMALL", label: "Dưới 1.000 vé" },
          { value: "MEDIUM", label: "1.000–3.000 vé" },
          { value: "LARGE", label: "Trên 3.000 vé" },
        ],
      };
    },
    save: async (owner: string, d: Row, id?: string) => {
      const args = [
        id ?? randomUUID(),
        owner,
        d.categoryId,
        d.slug,
        d.title,
        d.description,
        d.coverImageUrl ?? null,
        d.venueName,
        d.address,
        d.cityCode,
        d.startsAt,
        d.endsAt,
        d.checkinOpensAt,
        d.checkinClosesAt,
      ];
      return (
        await db.query(
          id
            ? `UPDATE events SET category_id=$3,slug=$4,title=$5,description=$6,cover_image_url=$7,venue_name=$8,address=$9,city_code=$10,starts_at=$11,ends_at=$12,checkin_opens_at=$13,checkin_closes_at=$14,status='DRAFT',updated_at=now() WHERE id=$1 AND organizer_id=$2 RETURNING *`
            : "INSERT INTO events(id,organizer_id,category_id,slug,title,description,cover_image_url,venue_name,address,city_code,starts_at,ends_at,checkin_opens_at,checkin_closes_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *",
          args,
        )
      )[0];
    },
    submit: (id: string) =>
      db.query(
        "UPDATE events SET status='PENDING_REVIEW',review_version=review_version+1,submitted_at=now(),updated_at=now() WHERE id=$1 RETURNING *",
        [id],
      ),
    review: async (
      e: Row,
      admin: string,
      approve: boolean,
      reason: string,
      snapshot: Row,
    ) => {
      await db.query(
        "INSERT INTO event_reviews(id,event_id,review_version,reviewer_id,decision,reason,reviewed_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          randomUUID(),
          e.id,
          e.review_version,
          admin,
          approve ? "APPROVED" : "REJECTED",
          reason || null,
          JSON.stringify(snapshot),
        ],
      );
      return db.query(
        "UPDATE events SET status=$2,published_at=CASE WHEN $3 THEN now() ELSE published_at END,updated_at=now() WHERE id=$1 RETURNING *",
        [e.id, approve ? "PUBLISHED" : "REJECTED", approve],
      );
    },
    pause: (id: string, paused: boolean) =>
      db.query(
        "UPDATE events SET sales_paused=$2,updated_at=now() WHERE id=$1",
        [id, paused],
      ),
    cancel: (id: string, reason: string) =>
      db.query(
        "UPDATE events SET status='CANCELLED',cancelled_at=now(),cancellation_reason=$2,updated_at=now() WHERE id=$1",
        [id, reason],
      ),
    reviews: (id: string) =>
      db.query(
        "SELECT decision,reason,review_version,created_at FROM event_reviews WHERE event_id=$1 ORDER BY review_version DESC",
        [id],
      ),
    summary: async () =>
      (await db.query("SELECT count(*) AS events FROM events"))[0],
    statusCounts: (owner: string) =>
      db.query(
        "SELECT status, count(*)::int AS count FROM events WHERE organizer_id=$1 GROUP BY status ORDER BY status",
        [owner],
      ),
  };
}
