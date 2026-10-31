const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createOrganizerProfileStats,
} = require("../dist/workflows/organizer-profile");

const principal = (roles) => ({
  userId: "owner-a",
  sessionId: "session-a",
  roles,
  permissions: [],
});

test("B11 stats authorize before accessing event or order data", async () => {
  let calls = 0;
  const stats = createOrganizerProfileStats(
    {
      organizerProfileEvents: async () => {
        calls++;
        return [];
      },
    },
    {
      organizerProfileTicketCount: async () => {
        calls++;
        return {};
      },
    },
    {
      run: async (work) => {
        calls++;
        return work();
      },
    },
  );
  await assert.rejects(stats(principal(["USER"])), { status: 403 });
  assert.equal(calls, 0);
});

test("B11 stats aggregate all owned events in one snapshot without pagination", async () => {
  let inSnapshot = false;
  const eventIds = Array.from({ length: 73 }, (_, i) => `event-${i}`);
  const stats = createOrganizerProfileStats(
    {
      organizerProfileEvents: async (ownerId) => {
        assert.equal(ownerId, "owner-a");
        assert.ok(inSnapshot);
        return eventIds.map((id, i) => ({
          id,
          published_at: i < 61 ? new Date() : null,
        }));
      },
    },
    {
      organizerProfileTicketCount: async (ids) => {
        assert.ok(inSnapshot);
        assert.deepEqual(ids, eventIds);
        return { served_tickets: "9007199254740993" };
      },
    },
    {
      run: async (work) => {
        inSnapshot = true;
        try {
          return await work();
        } finally {
          inSnapshot = false;
        }
      },
    },
  );
  const result = await stats(principal(["ORGANIZER"]));
  assert.equal(result.publishedEvents, 61);
  assert.equal(result.servedTickets, "9007199254740993");
  assert.equal(result.definitions.publishedEvents, "EVENTS_EVER_PUBLISHED");
  assert.equal(
    result.definitions.servedTickets,
    "PAID_VALID_OR_CHECKED_IN_TICKETS",
  );
});

test("B11 stats empty ownership never requests another organizer's events", async () => {
  const stats = createOrganizerProfileStats(
    { organizerProfileEvents: async () => [] },
    {
      organizerProfileTicketCount: async (ids) => {
        assert.deepEqual(ids, []);
        return { served_tickets: "0" };
      },
    },
    { run: async (work) => work() },
  );
  const result = await stats(principal(["ADMIN"]));
  assert.equal(result.publishedEvents, 0);
  assert.equal(result.servedTickets, "0");
});
