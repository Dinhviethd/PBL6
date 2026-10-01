import { randomUUID } from "node:crypto";
import type { Store, Row } from "../../../contracts/core";
export function eventStore(db: Store) {
  return {
    categories: () =>
      db.query(
        "SELECT * FROM categories WHERE archived_at IS NULL ORDER BY name",
      ),
    category: async (id: string) =>
      (await db.query("SELECT * FROM categories WHERE id=$1", [id]))[0],
    saveCategory: (d: Row, id?: string) =>
      id
        ? db.query(
            "UPDATE categories SET name=$2,slug=$3,updated_at=now() WHERE id=$1 RETURNING *",
            [id, d.name, d.slug],
          )
        : db.query(
            "INSERT INTO categories(id,name,slug) VALUES($1,$2,$3) RETURNING *",
            [randomUUID(), d.name, d.slug],
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
  };
}
