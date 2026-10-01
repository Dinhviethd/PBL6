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
