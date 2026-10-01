import { randomUUID } from "node:crypto";
import type { Store, Principal } from "../../../contracts/core";
export function auditStore(db: Store) {
  return {
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
