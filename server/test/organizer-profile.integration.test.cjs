const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DataSource } = require("typeorm");
const { createApplication } = require("../dist/app");
const { createDatabase } = require("../dist/platform/database");
const fs = require("node:fs");
const url = process.env.TEST_DATABASE_URL;

test(
  "B11 reuses applications/staff: base schema, two optional columns, reviews, owner isolation and event grants",
  { skip: !url, timeout: 180000 },
  async () => {
    assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname));
    assert.ok(new URL(url).pathname.endsWith("_test"));
    const names = [
      "InitialMvp1790812800000",
      "EventCheckinStaff1791072000000",
      "Notifications1791331200000",
      "WaitQueue1792627200000",
      "SepayLocalFoundation1793289600000",
    ];
    const migration = new DataSource({
      type: "postgres",
      url,
      migrations: names.map((n) => require("../dist/migrations/" + n)[n]),
    });
    await migration.initialize();
    await migration.runMigrations();
    const fixture = createDatabase(url);
    await fixture.start();
    const app = createApplication({
      databaseUrl: url,
      secret: "b11-test-secret".repeat(4),
      qrSecret: "b11-test-qr-secret".repeat(4),
      demo: true,
      clientUrl: process.env.B11_UI
        ? "http://localhost:5179"
        : "http://localhost:5173",
    });
    const evidence = [];
    let server;
    try {
      const authDb = fixture.owner("auth");
      for (const code of ["USER", "ORGANIZER", "ADMIN"])
        await authDb.query(
          'INSERT INTO roles("idRole",code,name) VALUES($1,$2,$2) ON CONFLICT(code) DO NOTHING',
          [randomUUID(), code],
        );
      await app.start();
      server = app.app.listen(0, "127.0.0.1");
      await new Promise((r) => server.on("listening", r));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      async function call(label, method, path, token, body, status = 200) {
        const r = await fetch(base + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const j = await r.json();
        evidence.push({ label, method, path, status: r.status, code: j.code });
        assert.equal(r.status, status, label + ": " + JSON.stringify(j));
        return j.data;
      }
      async function account(role, email) {
        const a = await app.auth.register({
          name: "B11 Fixture",
          email: email || randomUUID() + "@example.test",
          password: "LocalDemo2026!",
        });
        if (role !== "USER")
          await authDb.query(
            'INSERT INTO users_roles("idUser","idRole") SELECT $1,"idRole" FROM roles WHERE code=$2',
            [a.user.idUser, role],
          );
        return a;
      }
      const admin = await account("ADMIN"),
        owner = await account(
          "USER",
          process.env.B11_UI ? "organizer@example.test" : undefined,
        ),
        staff = await account("USER"),
        other = await account("ORGANIZER");
      const body = {
        organizationName: "B11 Existing Brand",
        contactName: "B11 Contact",
        contactEmail: "b11@example.test",
        contactPhone: "0900000011",
        description: "B11 Bio",
        businessName: "B11 Legal Company",
        taxIdOrBusinessLicense: "TEST-TAX",
        websiteOrSocial: "https://example.test",
        headOfficeAddress: "B11 Address",
        mainEventCategory: "Music",
        expectedEventScale: "100",
      };
      const application = await call(
        "create approved source",
        "POST",
        "/me/organizer-applications",
        owner.accessToken,
        body,
      );
      await call(
        "approve source",
        "POST",
        `/admin/organizer-applications/${application.id}/review`,
        admin.accessToken,
        { approve: true },
      );
      const t = owner.accessToken;
      await call(
        "guest profile",
        "GET",
        "/organizer/profile",
        null,
        undefined,
        401,
      );
      await call(
        "buyer profile forbidden",
        "GET",
        "/organizer/profile",
        staff.accessToken,
        undefined,
        403,
      );
      let profile = await call(
        "read original table",
        "GET",
        "/organizer/profile",
        t,
      );
      assert.equal(profile.businessName, body.businessName);
      assert.equal(profile.sourceApplicationId, application.id);
      assert.equal(profile.initialized, true);
      const optionalPresent = Object.hasOwn(
        (
          await authDb.query(
            "SELECT * FROM organizer_applications WHERE id=$1",
            [application.id],
          )
        )[0],
        "logo_url",
      );
      assert.equal(profile.capabilities.logo, optionalPresent);
      const missing = await call(
        "seed account missing application",
        "GET",
        "/organizer/profile",
        other.accessToken,
      );
      assert.equal(missing.initialized, false);
      await call(
        "missing account cannot create fake application",
        "PATCH",
        "/organizer/profile",
        other.accessToken,
        { version: "0".repeat(64), organizationName: "Fake" },
        409,
      );
      await call(
        "strict legal bypass",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, businessName: "Bypass" },
        400,
      );
      await call(
        "removed representative rejected",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, legalRepresentativeName: "Removed" },
        400,
      );
      await call(
        "removed public setting rejected",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, isPublic: true },
        400,
      );
      await call(
        "contact null rejected",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, contactEmail: null },
        400,
      );
      await call(
        "unsafe URL rejected",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, websiteOrSocial: "javascript:alert(1)" },
        400,
      );
      const stale = profile.version;
      profile = await call(
        "patch existing fields",
        "PATCH",
        "/organizer/profile",
        t,
        {
          version: profile.version,
          organizationName: "Updated Existing Brand",
          description: "Updated Bio",
        },
      );
      assert.equal(profile.contactPhone, body.contactPhone);
      assert.equal(profile.businessName, body.businessName);
      assert.notEqual(profile.version, stale);
      assert.equal(
        (
          await authDb.query(
            "SELECT organization_name FROM organizer_applications WHERE id=$1",
            [application.id],
          )
        )[0].organization_name,
        "Updated Existing Brand",
      );
      await call(
        "stale ETag",
        "PATCH",
        "/organizer/profile",
        t,
        { version: stale, description: "Stale" },
        409,
      );
      const accountProfile = await call(
        "account not overwritten",
        "GET",
        "/auth/me",
        t,
      );
      assert.equal(accountProfile.phone, null);
      assert.equal(accountProfile.avatarUrl, null);
      if (!optionalPresent) {
        await call(
          "logo unavailable before columns",
          "PATCH",
          "/organizer/profile",
          t,
          {
            version: profile.version,
            logoUrl: "https://example.test/logo.png",
          },
          409,
        );
        await call(
          "legal unavailable before columns",
          "POST",
          "/organizer/profile/legal-requests",
          t,
          { version: profile.version, changes: { businessName: "New" } },
          409,
        );
      }
      // Only the two fields approved by the user, on the disposable database.
      const addition =
        require("../dist/migrations/OrganizerApplicationProfile1793437200000").OrganizerApplicationProfile1793437200000;
      if (!optionalPresent) {
        const upgrade = new DataSource({
          type: "postgres",
          url,
          migrations: [
            ...names.map((n) => require("../dist/migrations/" + n)[n]),
            addition,
          ],
        });
        await upgrade.initialize();
        try {
          assert.deepEqual(
            (await upgrade.runMigrations()).map((m) => m.name),
            ["OrganizerApplicationProfile1793437200000"],
          );
          assert.deepEqual(await upgrade.runMigrations(), []);
        } finally {
          await upgrade.destroy();
        }
      }
      const columns = await migration.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2",
        ["public", "organizer_applications"],
      );
      assert.ok(columns.some((c) => c.column_name === "logo_url"));
      assert.ok(columns.some((c) => c.column_name === "pending_legal_changes"));
      assert.ok(
        !columns.some((c) =>
          ["legal_representative_name", "is_profile_public"].includes(
            c.column_name,
          ),
        ),
      );
      const forbidden = await migration.query(
        "SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename=ANY($2::text[])",
        [
          "public",
          [
            "organizer_profiles",
            "organizer_team_members",
            "organizer_profile_change_requests",
          ],
        ],
      );
      assert.deepEqual(forbidden, []);
      profile = await call(
        "capabilities after two fields",
        "GET",
        "/organizer/profile",
        t,
      );
      assert.equal(profile.capabilities.logo, true);
      assert.equal(profile.capabilities.legalReview, true);
      profile = await call(
        "logo stored on application",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, logoUrl: "https://example.test/logo.png" },
      );
      assert.equal(profile.logoUrl, "https://example.test/logo.png");
      let request = await call(
        "request legal change",
        "POST",
        "/organizer/profile/legal-requests",
        t,
        {
          version: profile.version,
          changes: {
            businessName: "New Legal Company",
            taxIdOrBusinessLicense: "NEW-TAX",
          },
        },
      );
      profile = await call(
        "pending retains old legal data",
        "GET",
        "/organizer/profile",
        t,
      );
      assert.equal(profile.businessName, body.businessName);
      await call(
        "duplicate pending rejected",
        "POST",
        "/organizer/profile/legal-requests",
        t,
        { version: profile.version, changes: { businessName: "Other" } },
        409,
      );
      await call(
        "request only own user",
        "GET",
        "/organizer/profile/legal-requests",
        other.accessToken,
      ).then((rows) => assert.deepEqual(rows, []));
      await call(
        "organizer cannot approve",
        "POST",
        `/admin/organizer-profile-requests/${request.id}/review`,
        t,
        { approve: true },
        403,
      );
      // Brand changes while pending do not invalidate or overwrite a legal request.
      profile = await call(
        "edit bio during pending",
        "PATCH",
        "/organizer/profile",
        t,
        { version: profile.version, description: "Changed During Review" },
      );
      await call(
        "reject requires reason",
        "POST",
        `/admin/organizer-profile-requests/${request.id}/review`,
        admin.accessToken,
        { approve: false },
        400,
      );
      await call(
        "approve only requested legal fields",
        "POST",
        `/admin/organizer-profile-requests/${request.id}/review`,
        admin.accessToken,
        { approve: true },
      );
      profile = await call(
        "approved roundtrip",
        "GET",
        "/organizer/profile",
        t,
      );
      assert.equal(profile.businessName, "New Legal Company");
      assert.equal(profile.description, "Changed During Review");
      assert.equal(profile.verification, "NOT_VERIFIED");
      await call(
        "review cannot repeat",
        "POST",
        `/admin/organizer-profile-requests/${request.id}/review`,
        admin.accessToken,
        { approve: true },
        404,
      );
      await call(
        "history from audit",
        "GET",
        "/organizer/profile/legal-requests",
        t,
      ).then((rows) => assert.equal(rows[0].status, "APPROVED"));
      request = await call(
        "another request",
        "POST",
        "/organizer/profile/legal-requests",
        t,
        {
          version: profile.version,
          changes: { businessName: "Rejected Company" },
        },
      );
      await call(
        "reject legal request",
        "POST",
        `/admin/organizer-profile-requests/${request.id}/review`,
        admin.accessToken,
        { approve: false, reason: "Need documents" },
      );
      await call(
        "rejection history",
        "GET",
        "/organizer/profile/legal-requests",
        t,
      ).then((rows) =>
        assert.ok(rows.some((r) => r.reason === "Need documents")),
      );
      await call(
        "admin list and history",
        "GET",
        "/admin/organizer-profile-requests",
        admin.accessToken,
      );
      const cat = await call(
        "fixture category",
        "POST",
        "/admin/categories",
        admin.accessToken,
        { name: "B11 Event", slug: randomUUID() },
      );
      const end = new Date(Date.now() + 86400000).toISOString();
      const eventBody = {
        categoryId: cat.id,
        title: "B11 Test Event",
        description: "Test",
        venueName: "Hall",
        address: "Test",
        cityCode: "DN",
        startsAt: new Date(Date.now() + 3600000).toISOString(),
        endsAt: end,
        checkinOpensAt: new Date(Date.now() - 3600000).toISOString(),
        checkinClosesAt: end,
      };
      const event = await call(
        "fixture owned event",
        "POST",
        "/organizer/events",
        t,
        eventBody,
      );
      const foreign = await call(
        "fixture foreign event",
        "POST",
        "/organizer/events",
        other.accessToken,
        eventBody,
      );
      await call("empty team", "GET", "/organizer/team", t).then((d) =>
        assert.equal(d.items.length, 0),
      );
      await call(
        "team requires event",
        "POST",
        "/organizer/team",
        t,
        { email: staff.user.email },
        400,
      );
      await call(
        "foreign event cannot invite",
        "POST",
        "/organizer/team",
        t,
        { email: staff.user.email, eventId: foreign.id },
        403,
      );
      let grant = await call(
        "reuse event staff invitation",
        "POST",
        "/organizer/team",
        t,
        { email: staff.user.email, eventId: event.id },
      );
      assert.equal(grant.status, "PENDING");
      await call("team aggregate", "GET", "/organizer/team", t).then((d) => {
        assert.equal(d.items[0].id, staff.user.idUser);
        assert.equal(d.items[0].assignment_count, "1");
      });
      await call(
        "duplicate invitation",
        "POST",
        "/organizer/team",
        t,
        { email: staff.user.email, eventId: event.id },
        409,
      );
      await call(
        "existing recipient inbox",
        "GET",
        "/me/checkin-assignments",
        staff.accessToken,
      ).then((rows) => assert.equal(rows[0].id, grant.id));
      await call(
        "accept existing invitation",
        "POST",
        `/me/checkin-invitations/${grant.id}/respond`,
        staff.accessToken,
        { accept: true },
      );
      await call(
        "scan scope active",
        "GET",
        `/checkin/events/${event.id}`,
        staff.accessToken,
      );
      await call(
        "foreign team empty",
        "GET",
        "/organizer/team",
        other.accessToken,
      ).then((d) => assert.deepEqual(d.items, []));
      await call(
        "foreign cannot revoke",
        "DELETE",
        `/organizer/team/${staff.user.idUser}/events/${grant.id}`,
        other.accessToken,
        undefined,
        403,
      );
      await call(
        "revoke event grant",
        "DELETE",
        `/organizer/team/${staff.user.idUser}/events/${grant.id}`,
        t,
      );
      await call(
        "access removed",
        "GET",
        `/checkin/events/${event.id}`,
        staff.accessToken,
        undefined,
        403,
      );
      grant = await call(
        "reinvite via existing logic",
        "POST",
        "/organizer/team",
        t,
        { email: staff.user.email, eventId: event.id },
      );
      await call(
        "revoke all own grants",
        "DELETE",
        `/organizer/team/${staff.user.idUser}`,
        t,
      );
      await call(
        "list revoked assignment",
        "GET",
        `/organizer/team/${staff.user.idUser}/events`,
        t,
      ).then((rows) => assert.equal(rows[0].status, "REVOKED"));
      await call(
        "stats existing schema",
        "GET",
        "/organizer/profile/stats",
        t,
      ).then((d) => assert.equal(d.servedTickets, "0"));
      await call(
        "search scoped empty",
        "GET",
        "/organizer/search?q=empty",
        t,
      ).then((rows) => assert.deepEqual(rows, []));
      console.log(
        `B11 existing tables HTTP PASS: ${evidence.length} requests; ${base}`,
      );
      if (process.env.B11_UI === "1")
        await require("./helpers/b11-browser.cjs")({
          base,
          owner,
          staff,
          other,
          event,
          app,
          call,
        });
    } finally {
      if (process.env.B11_EVIDENCE_FILE)
        fs.writeFileSync(
          process.env.B11_EVIDENCE_FILE,
          JSON.stringify(evidence, null, 2),
        );
      if (server) await new Promise((r) => server.close(r));
      await app.close();
      await fixture.close();
      await migration.destroy();
    }
  },
);
