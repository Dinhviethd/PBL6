const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const { assertOwned } = require("../dist/platform/database");
const { inspect, root } = require("../scripts/check-boundaries.cjs");
test("SQL ownership rejects reads, writes, joins, nested queries and multiple statements", () => {
  for (const sql of [
    "SELECT * FROM users",
    "UPDATE users SET name='x'",
    "DELETE FROM users",
    "INSERT INTO users(name) VALUES('x')",
    'SELECT e.id FROM events e JOIN users u ON u."idUser"=e.organizer_id',
    'SELECT * FROM events WHERE organizer_id IN (SELECT "idUser" FROM users)',
    "SELECT * FROM public.events",
    "SELECT * FROM events WHERE EXISTS(SELECT id FROM users)",
    "SELECT 1; SELECT * FROM users",
  ])
    assert.throws(() => assertOwned("event", sql));
  assert.doesNotThrow(() =>
    assertOwned(
      "event",
      "SELECT * FROM events WHERE id=ANY($1::uuid[]) AND EXISTS(SELECT id FROM categories)",
    ),
  );
  assert.doesNotThrow(() =>
    assertOwned("event", "SELECT * FROM events WHERE id=$1 FOR SHARE"),
  );
  assert.throws(() =>
    assertOwned(
      "event",
      "SELECT query_to_xml('SELECT * FROM users',true,false,'')",
    ),
  );
  assert.doesNotThrow(() =>
    assertOwned(
      "order",
      "SELECT r.* FROM reservations r JOIN order_items i ON i.id=r.order_item_id WHERE i.order_id=$1 FOR UPDATE",
    ),
  );
});
test("C8 event metrics use an ownership-guard-compatible SELECT without a CTE", () => {
  const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
  const selected = ids.map((_, index) => `($${index + 1}::uuid)`).join(",");
  const idsParam = `$${ids.length + 1}::uuid[]`;
  const sql = `SELECT selected.event_id,
    coalesce(inventory.tickets_sold,'0') AS tickets_sold,
    coalesce(issued.tickets_issued,'0') AS tickets_issued,
    coalesce(revenue.gmv,'0') AS gmv,
    coalesce(attendance.checkins,'0') AS checkins
    FROM (VALUES ${selected}) AS selected(event_id)
    LEFT JOIN (SELECT event_id,sum(sold_quantity)::text AS tickets_sold FROM ticket_types WHERE event_id=ANY(${idsParam}) AND archived_at IS NULL GROUP BY event_id) inventory USING(event_id)
    LEFT JOIN (SELECT event_id,count(*) FILTER (WHERE status<>'VOID')::text AS tickets_issued FROM tickets WHERE event_id=ANY(${idsParam}) GROUP BY event_id) issued USING(event_id)
    LEFT JOIN (SELECT event_id,coalesce(sum(total_amount),0)::text AS gmv FROM orders WHERE event_id=ANY(${idsParam}) AND status='PAID' GROUP BY event_id) revenue USING(event_id)
    LEFT JOIN (SELECT event_id,count(*)::text AS checkins FROM checkins WHERE event_id=ANY(${idsParam}) GROUP BY event_id) attendance USING(event_id)`;
  assert.throws(() => assertOwned("order", `WITH selected AS (SELECT unnest($1::uuid[])) ${sql}`), /Unsupported runtime SQL/);
  assert.doesNotThrow(() => assertOwned("order", sql));
});
test("static boundary checker rejects real import and raw-query bypasses", () => {
  const file = path.join(root, "modules/payment/public.ts");
  for (const source of [
    "import {r} from '../order/infrastructure/store';",
    "export {r} from '@/modules/auth/infrastructure/store';",
    "import {createDatabase} from '../../platform/database';",
    "db.query('SELECT * FROM orders');",
    "const x=require('../auth/public');",
  ])
    assert.ok(inspect(file, source).length, source);
  assert.equal(
    inspect(file, "import type {Principal} from '../../contracts/core';")
      .length,
    0,
  );
});
