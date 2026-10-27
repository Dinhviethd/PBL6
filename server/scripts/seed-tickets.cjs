require("dotenv").config({ quiet: true });
const {
  randomUUID,
  randomBytes,
  createHash,
  createCipheriv,
} = require("node:crypto");
const { createDatabase } = require("../dist/platform/database");

const BUYER_EMAIL = "trankhahao7@gmail.com";
const EVENT_ID = "babd20a3-36d9-406a-bd59-3551e60f1676";
const TICKET_TYPE_NAME = "Phổ thông";
const VOID_REASON = "Vé bị lỗi sẽ phát hành lại sau";
const STATUSES = ["VALID", "CHECKED_IN", "VOID"];

const hash = (s) => createHash("sha256").update(s).digest("hex");

async function seed() {
  if (!process.env.DATABASE_URL)
    throw Error("DATABASE_URL is required to seed tickets.");
  if (!process.env.QR_SECRET)
    throw Error("QR_SECRET is required to encrypt QR tokens.");
  if (process.env.NODE_ENV === "production")
    throw Error("Ticket seed is disabled in production.");

  const db = createDatabase(process.env.DATABASE_URL);
  const key = createHash("sha256").update(process.env.QR_SECRET).digest();
  const encrypt = (text) => {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", key, iv),
      data = Buffer.concat([c.update(text, "utf8"), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64");
  };

  await db.start();
  try {
    const auth = db.owner("auth"),
      event = db.owner("event"),
      order = db.owner("order"),
      payment = db.owner("payment");

    const buyer = (
      await auth.query("SELECT * FROM users WHERE email=$1", [BUYER_EMAIL])
    )[0];
    if (!buyer) throw Error(`User ${BUYER_EMAIL} not found.`);
    if (buyer.status !== "ACTIVE")
      throw Error(`User ${BUYER_EMAIL} is not ACTIVE.`);

    const ev = (
      await event.query("SELECT * FROM events WHERE id=$1", [EVENT_ID])
    )[0];
    if (!ev) throw Error(`Event ${EVENT_ID} not found.`);

    const type = (
      await order.query(
        "SELECT * FROM ticket_types WHERE event_id=$1 AND name=$2 AND archived_at IS NULL",
        [EVENT_ID, TICKET_TYPE_NAME],
      )
    )[0];
    if (!type)
      throw Error(
        `Ticket type "${TICKET_TYPE_NAME}" not found or archived for event.`,
      );

    const existing = await order.query(
      "SELECT t.id FROM tickets t JOIN order_items i ON i.id=t.order_item_id JOIN orders o ON o.id=i.order_id WHERE o.buyer_id=$1 AND o.event_id=$2",
      [buyer.idUser, EVENT_ID],
    );
    if (existing.length)
      throw Error(
        `User ${BUYER_EMAIL} already has ${existing.length} ticket(s) for this event. Aborting to avoid duplicates.`,
      );

    const summary = [];
    await db.uow.run(async () => {
      for (const status of STATUSES) {
        const orderId = randomUUID(),
          orderCode = `EH-${randomBytes(8).toString("hex").toUpperCase()}`,
          idempotencyKey = randomUUID(),
          requestHash = hash(
            JSON.stringify({
              eventId: EVENT_ID,
              items: [{ ticketTypeId: type.id, quantity: 1 }],
            }),
          );

        await order.query(
          "INSERT INTO orders(id,order_code,buyer_id,event_id,status,currency,total_quantity,total_amount,buyer_name_snapshot,buyer_email_snapshot,event_title_snapshot,idempotency_key,request_hash,expires_at) VALUES($1,$2,$3,$4,'PENDING_PAYMENT','VND',1,$5,$6,$7,$8,$9,$10,now()+interval '15 minutes')",
          [
            orderId,
            orderCode,
            buyer.idUser,
            EVENT_ID,
            type.price_amount,
            buyer.name,
            buyer.email,
            ev.title,
            idempotencyKey,
            requestHash,
          ],
        );

        const paymentId = randomUUID(),
          merchantReference = `EH-${randomBytes(8).toString("hex").toUpperCase()}`,
          transactionId = String(
            Math.floor(100000000000 + Math.random() * 899999999999),
          );
        await payment.query(
          "INSERT INTO payments(id,order_id,provider,merchant_account,merchant_reference,provider_transaction_id,status,amount,currency,provider_expires_at,reconcile_until,succeeded_at,last_verified_at) VALUES($1,$2,'vnpay_sandbox',$3,$4,$5,'SUCCEEDED',$6,'VND',now()+interval '15 minutes',now()+interval '15 minutes',now(),now())",
          [
            paymentId,
            orderId,
            process.env.VNPAY_TMN_CODE || "UIUCXRJG",
            merchantReference,
            transactionId,
            type.price_amount,
          ],
        );

        await order.query(
          "UPDATE orders SET status='PAID',paid_payment_id=$2,paid_at=now(),updated_at=now() WHERE id=$1",
          [orderId, paymentId],
        );

        const itemId = randomUUID();
        await order.query(
          "INSERT INTO order_items(id,order_id,event_id,ticket_type_id,ticket_type_name_snapshot,unit_price,quantity) VALUES($1,$2,$3,$4,$5,$6,1)",
          [itemId, orderId, EVENT_ID, type.id, type.name, type.price_amount],
        );

        await order.query(
          "INSERT INTO reservations(order_item_id,status,release_after,consumed_at) VALUES($1,'CONSUMED',now()+interval '15 minutes',now())",
          [itemId],
        );

        const token = randomBytes(32).toString("base64url");
        const ticketId = randomUUID(),
          ticketCode = randomBytes(12).toString("hex").toUpperCase(),
          voided = status === "VOID";
        await order.query(
          `INSERT INTO tickets(id,order_item_id,event_id,sequence_no,ticket_code,qr_token_hash,qr_token_ciphertext,qr_key_version,status,issued_at${
            voided ? ",voided_at,void_reason" : ""
          }) VALUES($1,$2,$3,1,$4,$5,$6,1,$7,now()${
            voided ? ",now(),$8" : ""
          })`,
          [
            ticketId,
            itemId,
            EVENT_ID,
            ticketCode,
            hash(token),
            encrypt(token),
            status,
            ...(voided ? [VOID_REASON] : []),
          ],
        );

        await order.query(
          "UPDATE ticket_types SET sold_quantity=sold_quantity+1,updated_at=now() WHERE id=$1",
          [type.id],
        );

        if (status === "CHECKED_IN")
          await order.query(
            "INSERT INTO checkins(ticket_id,event_id,checked_in_by,method) VALUES($1,$2,$3,'MANUAL_CODE')",
            [ticketId, EVENT_ID, ev.organizer_id],
          );

        summary.push({ orderCode, ticketCode, status });
      }
    });

    console.log(
      `Seeded ${summary.length} tickets for ${BUYER_EMAIL} on event "${ev.title}":`,
    );
    for (const s of summary)
      console.log(`- ${s.ticketCode} (${s.status}) | order ${s.orderCode}`);
  } finally {
    await db.close();
  }
}

seed().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
