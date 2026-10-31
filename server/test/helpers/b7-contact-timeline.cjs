const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

// Synthetic SePay snapshots only; no bank request or Live database is involved.
module.exports = async ({ ok, call, detailPath, paid, pending, buyer, owner, admin, other, payment, paymentDb, orderDb, fixture }) => {
  await ok("PATCH", "/me", owner.accessToken, { name: "B7 Test", phone: "0900000099" });
  await ok("PATCH", "/me", buyer.accessToken, { name: "B7 Test", phone: "0900000001" });
  let data = await ok("GET", detailPath(), owner.accessToken);
  assert.equal(data.buyer.phone, "0900000001");
  assert.equal(data.buyer.phoneSource, "CURRENT_PROFILE");
  assert.equal((await ok("GET", detailPath(), admin.accessToken)).buyer.phone, "0900000001");
  assert.equal((await call("GET", detailPath(), other.accessToken)).status, 403);
  await ok("PATCH", "/me", buyer.accessToken, { name: "B7 Test", phone: "0900000002" });
  assert.equal((await ok("GET", detailPath(), owner.accessToken)).buyer.phone, "0900000002");
  await fixture.owner("auth").query('UPDATE users SET phone=$2 WHERE "idUser"=$1', [buyer.user.idUser, "   "]);
  data = await ok("GET", detailPath(), owner.accessToken);
  assert.equal(data.buyer.phone, null);
  assert.equal(data.buyer.phoneSource, null);
  await ok("PATCH", "/me", buyer.accessToken, { name: "B7 Test", phone: "0900000001" });
  assert.equal(data.bankAccount, null); // Demo must not invent bank data.
  assert.equal(data.timeline.filter((x) => x.type === "QR_ISSUED").length, 2);
  assert.equal(data.timeline.filter((x) => x.type === "VIETQR_WINDOW").length, 0);
  assert.ok(data.timeline.every((x) => !x.type.includes("EMAIL")));
  const onlyOrder = await ok("GET", detailPath(pending.id), owner.accessToken);
  assert.deepEqual(onlyOrder.timeline.map((x) => x.type), ["ORDER_CREATED"]);
  const oldDeadline = (await orderDb.query("SELECT expires_at FROM orders WHERE id=$1", [paid.id]))[0].expires_at;
  const oldPayment = (await paymentDb.query("SELECT created_at,provider_expires_at,reconcile_until FROM payments WHERE id=$1", [payment.id]))[0];
  const origin = new Date(oldPayment.created_at);
  // Use a fixed Vietnam midnight boundary for deterministic timestamp assertions.
  const start = "2026-10-30T16:55:00.000Z";
  await paymentDb.query(
    "UPDATE payments SET provider='sepay',created_at=$2,provider_expires_at=$3 WHERE id=$1",
    [payment.id, start, "2026-10-30T17:05:00.000Z"],
  );
  data = await ok("GET", detailPath(), owner.accessToken);
  assert.equal(data.bankAccount, null); // Existing payment without a bank snapshot.
  const window = data.timeline.find((x) => x.type === "VIETQR_WINDOW");
  assert.equal(window.occurredAt, null);
  assert.equal(window.paymentCreatedAt, start);
  assert.equal(window.referenceWindowEndsAt, "2026-10-30T17:10:00.000Z");
  assert.equal(window.effectiveWindowEndsAt, "2026-10-30T17:05:00.000Z");
  assert.notEqual(window.paymentCreatedAt, data.createdAt);
  await paymentDb.query("UPDATE payments SET provider_expires_at=$2 WHERE id=$1", [payment.id, "2026-10-30T17:30:00.000Z"]);
  assert.equal((await ok("GET", detailPath(), owner.accessToken)).timeline.find((x) => x.type === "VIETQR_WINDOW").effectiveWindowEndsAt,
    "2026-10-30T17:10:00.000Z");
  await paymentDb.query(
    `INSERT INTO sepay_payment_details(payment_id,environment,bank_code,account_number,account_name,transfer_content)
     VALUES($1,'test','MBBank','000000001234','B7 FIXTURE BENEFICIARY',$2)`,
    [payment.id, `tkh${randomUUID().replaceAll("-", "").slice(0, 8)}`],
  );
  const latestId = randomUUID();
  await paymentDb.query(
    `INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,status,amount,
      created_at,provider_expires_at,reconcile_until)
     VALUES($1,$2,'sepay','test-other',$3,'FAILED',200000,now(),now()+interval '1 day',now()+interval '2 days')`,
    [latestId, paid.id, randomUUID()],
  );
  await paymentDb.query(
    `INSERT INTO sepay_payment_details(payment_id,environment,bank_code,account_number,account_name,transfer_content)
     VALUES($1,'test','MBBank','000000009999','OTHER ATTEMPT',$2)`,
    [latestId, `tkh${randomUUID().replaceAll("-", "").slice(0, 8)}`],
  );
  data = await ok("GET", detailPath(), owner.accessToken);
  assert.equal(data.payment.display.id, payment.id);
  assert.equal(data.bankAccount.paymentId, payment.id);
  assert.equal(data.bankAccount.accountNumber, "000000001234");
  assert.equal(data.bankAccount.accountName, "B7 FIXTURE BENEFICIARY");
  assert.equal(data.bankAccount.source, "PAYMENT_SNAPSHOT");
  assert.ok(!JSON.stringify(data).includes("OTHER ATTEMPT"));
  // Persisted bank snapshot remains independent of current SePay runtime configuration.
  assert.equal((await ok("GET", detailPath(), owner.accessToken)).bankAccount.accountNumber, "000000001234");
  const issued = data.timeline.filter((x) => x.type === "QR_ISSUED");
  const firstIssued = issued[0].occurredAt;
  const secondTime = new Date(new Date(firstIssued).getTime() + 1000).toISOString();
  await orderDb.query("UPDATE tickets SET issued_at=$2 WHERE id=$1", [issued[1].ticketId, secondTime]);
  const refreshed = await ok("GET", detailPath(), owner.accessToken);
  assert.equal(refreshed.timeline.find((x) => x.ticketId === issued[0].ticketId).occurredAt, firstIssued);
  assert.equal(refreshed.timeline.find((x) => x.ticketId === issued[1].ticketId).occurredAt, secondTime);
  await ok("GET", detailPath() + "/tickets", owner.accessToken);
  assert.equal((await ok("GET", detailPath(), owner.accessToken)).timeline.find((x) => x.ticketId === issued[0].ticketId).occurredAt, firstIssued);
  assert.equal(new Date((await orderDb.query("SELECT expires_at FROM orders WHERE id=$1", [paid.id]))[0].expires_at).toISOString(), new Date(oldDeadline).toISOString());
  // Restore realistic payment deadlines for browser/remaining regression checks.
  await paymentDb.query("UPDATE payments SET created_at=$2,provider_expires_at=$3 WHERE id=$1", [payment.id, origin, oldPayment.provider_expires_at]);
  await paymentDb.query("DELETE FROM sepay_payment_details WHERE payment_id=$1", [latestId]);
  await paymentDb.query("DELETE FROM payments WHERE id=$1", [latestId]);
  console.log("B7 contact/timeline/bank HTTP PASS: buyer profile phone/null/update, timestamp sources, 15min/shorter expiry/midnight, no fake scan/email, bank snapshot/canonical attempt, issuance stable on QR reload");
};
