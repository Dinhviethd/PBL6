const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBooking } = require("../dist/workflows/booking");
const { createEvents } = require("../dist/modules/event/public");
const { createOrders } = require("../dist/modules/order/public");
const { createNotifications } = require("../dist/modules/notification/public");
const { assertOwned } = require("../dist/platform/database");

test("reminders recheck event eligibility, paginate, merge roles and pick up late recipients", async () => {
  const now = Date.now();
  const event = (id, hours, status = "PUBLISHED") => ({
    id,
    status,
    title: "Meetup",
    starts_at: new Date(now + hours * 3600000),
    venue_name: "Hall",
    address: "City",
  });
  const candidates = [
    event("a", 23),
    event("b", -1),
    event("c", 25),
    event("d", 1, "CANCELLED"),
    event("e", 1, "DRAFT"),
    event("f", 2),
  ];
  const sent = [],
    seen = new Set(),
    cursors = [];
  let late = false;
  const events = {
    reminderEvents: async (after) => {
      cursors.push(after);
      return candidates
        .filter((e) => after === null || e.id > after)
        .slice(0, 2);
    },
    guard: async (id) => candidates.find((e) => e.id === id),
    notificationStaff: async () => [{ user_id: "both" }, { user_id: "staff" }],
  };
  const orders = {
    reminderBuyers: async () => [
      { user_id: "both" },
      ...(late ? [{ user_id: "late-buyer" }] : []),
    ],
  };
  const notifications = {
    send: async (n) => {
      const key = n.userId + n.dedupeKey;
      if (seen.has(key)) return 0;
      seen.add(key);
      sent.push(n);
      return 1;
    },
  };
  const booking = createBooking(
    {},
    events,
    orders,
    {},
    {},
    { run: (work) => work() },
    notifications,
  );
  assert.equal(await booking.remind(), 4);
  assert.deepEqual(cursors, [null, "b", "d", "f"]);
  assert.ok(sent.every((n) => ["a", "f"].includes(n.targetId)));
  assert.ok(
    sent
      .filter((n) => n.userId === "both")
      .every((n) => n.target === "TICKETS"),
  );
  assert.ok(
    sent.filter((n) => n.userId === "staff").every((n) => n.target === "STAFF"),
  );
  assert.equal(await booking.remind(), 0);
  late = true;
  assert.equal(await booking.remind(), 2);
  assert.ok(sent.slice(-2).every((n) => n.userId === "late-buyer"));
  // A changed start time creates a new reminder version.
  candidates[0].starts_at = new Date(now + 22 * 3600000);
  assert.equal(await booking.remind(), 3);
});

test("all notification and recipient queries pass runtime ownership validation", async () => {
  const queries = [];
  const store = (owner) => ({
    query: async (sql, args = []) => {
      assertOwned(owner, sql);
      queries.push({ owner, sql, args });
      return sql.includes("count(*)") ? [{ count: "0" }] : [];
    },
  });
  const p = { userId: "recipient" };
  const n = createNotifications(store("notification"));
  await n.send({
    userId: p.userId,
    kind: "EVENT_REMINDER",
    title: "Reminder",
    message: "Test",
    target: "TICKETS",
    targetId: "event",
    dedupeKey: "key",
  });
  assert.deepEqual(await n.inbox(p, 1, true), {
    items: [],
    hasNext: false,
    unreadCount: 0,
  });
  await assert.rejects(n.markRead(p, "foreign-id"), (e) => e.status === 404);
  await n.markAllRead(p);
  assert.ok(
    queries
      .filter((q) => q.sql.startsWith("UPDATE"))
      .every((q) => q.args[0] === p.userId && q.sql.includes("user_id=$1")),
  );
  assert.ok(queries.some((q) => q.args[1] === 50 && q.args[2] === true));
  const events = createEvents(store("event"));
  await events.reminderEvents(null);
  await events.notificationStaff("event", true);
  await createOrders(store("order"), "test").reminderBuyers("event");
  assert.throws(() => assertOwned("notification", "SELECT * FROM users"));
  assert.throws(() => assertOwned("order", "SELECT * FROM notifications"));
});
