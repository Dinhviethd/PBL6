import type { Store, Principal } from "../../contracts/core";
import { auditStore } from "./infrastructure/store";
export function createAudit(db: Store) {
  return auditStore(db);
}
