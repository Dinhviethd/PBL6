import "reflect-metadata";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import type { ConnectionOptions } from "node:tls";
import { DataSource, EntityManager } from "typeorm";
import { astVisitor, parse } from "pgsql-ast-parser";
import { ensure, type Owner, type Store, type UnitOfWork, type ExclusiveWork } from "../contracts/core";

export const ownership: Record<Owner, readonly string[]> = {
  auth: [
    "users",
    "roles",
    "permissions",
    "users_roles",
    "roles_permissions",
    "auth_sessions",
    "password_reset_challenges",
    "organizer_applications",
  ],
  event: ["categories", "events", "event_reviews", "event_checkin_staff"],
  order: [
    "wait_queue",
    "ticket_types",
    "orders",
    "order_items",
    "reservations",
    "tickets",
    "checkins",
  ],
  payment: ["payments", "payment_notifications", "sepay_payment_details", "sepay_transactions", "sepay_transaction_reviews"],
  audit: ["audit_logs"],
  notification: ["notifications"],
};

// Reject unparseable SQL, commands, schema-qualified tables and foreign-owner references.
// This guard runs for every application query, including raw SQL and joins.
export function assertOwned(owner: Owner, sql: string) {
  const statements = parse(sql);
  if (
    statements.length !== 1 ||
    !["select", "insert", "update", "delete"].includes(statements[0].type)
  ) {
    throw new Error(`Unsupported runtime SQL for ${owner}`);
  }
  const visitor = astVisitor((map) => ({
    tableRef: (ref) => {
      if (ref.schema || !ownership[owner].includes(ref.name))
        throw new Error(`Ownership violation: ${owner} -> ${ref.name}`);
    },
    call: (call) => {
      if (
        call.function.schema ||
        ![
          "now",
          "count",
          "sum",
          "coalesce",
          "lower",
          "upper",
          "min",
          "max",
          "any",
          "exists",
        ].includes(call.function.name.toLowerCase())
      )
        throw new Error(`Disallowed SQL function: ${call.function.name}`);
      map.super().call(call);
    },
  }));
  visitor.statement(statements[0]);
}

export type DatabaseTls = Pick<ConnectionOptions, "ca" | "rejectUnauthorized">;
export function createDatabase(url: string, ssl?: DatabaseTls | false) {
  const source = new DataSource({
    type: "postgres",
    url,
    synchronize: false,
    ssl: ssl ?? (process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : false),
    extra: { max: 12, statement_timeout: 15000 },
  });
  const context = new AsyncLocalStorage<EntityManager>();
  const uow: UnitOfWork = {
    async run(work) {
      if (context.getStore()) return work();
      return source.transaction("READ COMMITTED", (manager) =>
        context.run(manager, work),
      );
    },
  };
  const snapshot: UnitOfWork = {
    async run(work) {
      ensure(!context.getStore(), "SNAPSHOT_NESTED", "Không thể lồng lượt đọc báo cáo.", 500);
      return source.transaction("REPEATABLE READ", (manager) =>
        context.run(manager, work),
      );
    },
  };
  // Transaction-level lock is safe with transaction pooling; released on rollback/crash.
  // Queries made by work use this same manager/connection through AsyncLocalStorage.
  const exclusive: ExclusiveWork = async (key, work) => {
    ensure(!context.getStore(), "EXCLUSIVE_NESTED", "Exclusive work cannot be nested.", 500);
    const digest = createHash("sha256").update(key).digest();
    return source.transaction("READ COMMITTED", async manager => {
      const rows = await manager.query("SELECT pg_try_advisory_xact_lock($1,$2) AS acquired",
        [digest.readInt32BE(0), digest.readInt32BE(4)]);
      ensure(rows[0]?.acquired === true, "SEPAY_V2_BUSY", "Một lượt đối soát SePay đang chạy.", 409);
      return context.run(manager, work);
    });
  };
  return {
    start: () => source.initialize(),
    close: () => source.destroy(),
    uow,
    snapshot,
    exclusive,
    owner(owner: Owner): Store {
      return {
        async query(sql, args = []) {
          assertOwned(owner, sql);
          const result = await (context.getStore() ?? source.manager).query(
            sql,
            args,
          );
          // TypeORM's Postgres UPDATE/DELETE RETURNING result is [rows, affectedCount].
          return Array.isArray(result) &&
            Array.isArray(result[0]) &&
            typeof result[1] === "number"
            ? result[0]
            : result;
        },
      };
    },
  };
}
