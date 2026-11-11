import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyEventFilters,
  eventQuery,
  eventDate,
} from "../src/lib/event-search.ts";

test("price filters preserve zero and reject malformed/inverted/unsafe amounts", () => {
  const params = new URLSearchParams(
    eventQuery({ ...emptyEventFilters, minPrice: "0", maxPrice: "100000" }),
  );
  assert.equal(params.get("minPrice"), "0");
  assert.equal(params.get("maxPrice"), "100000");
  for (const minPrice of ["-1", "1.5", "free", "9007199254740992"])
    assert.throws(() => eventQuery({ ...emptyEventFilters, minPrice }));
  assert.throws(() =>
    eventQuery({
      ...emptyEventFilters,
      minPrice: "200000",
      maxPrice: "100000",
    }),
  );
});

test("search date boundaries use Vietnam time independently of device timezone", () => {
  const params = new URLSearchParams(
    eventQuery({ ...emptyEventFilters, from: "2026-11-10", to: "2026-11-10" }),
  );
  assert.equal(params.get("from"), "2026-11-09T17:00:00.000Z");
  assert.equal(params.get("to"), "2026-11-10T16:59:59.999Z");
});

test("event search encodes text/category and keeps zero-based API pagination", () => {
  const params = new URLSearchParams(
    eventQuery(
      {
        ...emptyEventFilters,
        q: "  Âm nhạc & nghệ thuật  ",
        city: "Đà Nẵng",
        category: "music",
      },
      2,
    ),
  );
  assert.equal(params.get("q"), "Âm nhạc & nghệ thuật");
  assert.equal(params.get("city"), "Đà Nẵng");
  assert.equal(params.get("category"), "music");
  assert.equal(params.get("page"), "2");
});

test("date filter rejects impossible days and inverted ranges, accepts leap days", () => {
  for (const from of ["2026-02-30", "2026-13-01", "2026-2-1", "invalid"])
    assert.throws(() => eventQuery({ ...emptyEventFilters, from }));
  assert.throws(() =>
    eventQuery({ ...emptyEventFilters, from: "2026-11-11", to: "2026-11-10" }),
  );
  const params = new URLSearchParams(
    eventQuery({ ...emptyEventFilters, from: "2028-02-29", to: "2028-02-29" }),
  );
  assert.equal(
    new Date(params.get("to")).getTime() -
      new Date(params.get("from")).getTime(),
    86_399_999,
  );
  assert.equal(new Date(params.get("from")).getHours(), 0);
  assert.equal(new Date(params.get("to")).getHours(), 23);
});

test("event cards use Vietnam dates and tolerate invalid timestamps", () => {
  assert.match(eventDate("2026-11-10T18:00:00Z"), /11\/11\/2026/);
  assert.equal(eventDate("invalid"), "Đang cập nhật thời gian");
});
