import { randomUUID } from "node:crypto";
import type { Store, Principal } from "../../../contracts/core";
export function auditStore(db: Store) {
  return {
    organizerLegalHistory: (ownerId: string | null, offset = 0) => db.query(
      `SELECT metadata,created_at FROM audit_logs WHERE resource_type='organizer'
       AND action IN ('organizer.legal_approved','organizer.legal_rejected')
       AND ($1::uuid IS NULL OR resource_id=$1) ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $2`,
      [ownerId,offset]),
    append: (
      p: Principal | null,
      action: string,
      resource: string,
      id: string,
      metadata = {},
    ) =>
      db.query(
        "INSERT INTO audit_logs(id,actor_id,actor_kind,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          randomUUID(),
          p?.userId ?? null,
          p ? "USER" : "SYSTEM",
          action,
          resource,
          id,
          JSON.stringify(metadata),
        ],
      ),
  };
}
