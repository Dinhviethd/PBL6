import {
  randomUUID,
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { orderStore } from "./infrastructure/store";
import {
  ensure,
  money,
  type Store,
  type Row,
  type Principal,
} from "../../contracts/core";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function createOrders(db: Store, qrSecret: string) {
  const r = orderStore(db),
    key = createHash("sha256").update(qrSecret).digest();
  const encrypt = (text: string) => {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", key, iv),
      data = Buffer.concat([c.update(text, "utf8"), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64");
  };
  const decrypt = (text: string) => {
    const b = Buffer.from(text, "base64"),
      c = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12));
    c.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([c.update(b.subarray(28)), c.final()]).toString(
      "utf8",
    );
  };
  async function lockInventory(order: Row) {
    const items = await r.items(order.id);
    for (const i of items) await r.type(i.ticket_type_id, true);
    return r.reservations(order.id);
  }
  async function release(order: Row, status = "EXPIRED") {
    if (order.status !== "PENDING_PAYMENT") return;
    const reservations = await lockInventory(order);
    for (const v of reservations)
      if (v.status === "HELD") {
        await r.inventory(v.ticket_type_id, -v.quantity, 0);
        await r.reserveState(v.order_item_id, "RELEASED");
      }
    await r.close(
      order.id,
      status,
      status === "EXPIRED" ? "Hết hạn giữ chỗ" : "Khách hủy đơn",
    );
  }
  return {
    ...r,
    lockInventory,
    release,
    async createOrder(
      p: Principal,
      event: Row,
      buyer: Row,
      items: Row[],
      idempotency: string,
    ) {
      const canonical = [...items].sort((a, b) =>
        a.ticketTypeId.localeCompare(b.ticketTypeId),
      );
      ensure(
        new Set(items.map((i) => i.ticketTypeId)).size === items.length,
        "DUPLICATE_TYPE",
        "Không được lặp loại vé.",
        400,
      );
      const requestHash = hash(
        JSON.stringify({ eventId: event.id, items: canonical }),
      );
      const prior = await r.byKey(p.userId, idempotency);
      if (prior) {
        ensure(
          prior.request_hash === requestHash,
          "IDEMPOTENCY_CONFLICT",
          "Khóa request đã dùng với dữ liệu khác.",
        );
        return prior;
      }
      ensure(
        event.status === "PUBLISHED" &&
          !event.sales_paused &&
          new Date(event.ends_at) > new Date(),
        "SALES_CLOSED",
        "Sự kiện chưa mở hoặc đã ngừng bán.",
      );
      let total = 0n,
        quantity = 0;
      const selected: Row[] = [];
      for (const i of canonical) {
        const t = await r.type(i.ticketTypeId, true);
        ensure(
          t && t.event_id === event.id && !t.archived_at,
          "INVALID_TICKET_TYPE",
          "Loại vé không hợp lệ.",
          400,
        );
        ensure(
          new Date(t.sale_starts_at) <= new Date() &&
            new Date(t.sale_ends_at) > new Date(),
          "SALES_CLOSED",
          "Loại vé chưa mở hoặc đã hết hạn bán.",
        );
        ensure(
          t.capacity - t.reserved_quantity - t.sold_quantity >= i.quantity,
          "SOLD_OUT",
          "Không còn đủ vé.",
        );
        total += money(t.price_amount) * BigInt(i.quantity);
        quantity += i.quantity;
        selected.push({ ...t, quantity: i.quantity });
      }
      ensure(
        quantity > 0 && quantity <= 10,
        "QUANTITY_LIMIT",
        "Mỗi đơn tối đa 10 vé.",
        400,
      );
      const id = randomUUID(),
        expires = new Date(Date.now() + 15 * 60 * 1000);
      const order = await r.create({
        id,
        code: `EH-${randomBytes(8).toString("hex").toUpperCase()}`,
        user: p.userId,
        event: event.id,
        quantity,
        total: total.toString(),
        name: buyer.name,
        email: buyer.email,
        title: event.title,
        key: idempotency,
        hash: requestHash,
        expires,
      });
      for (const t of selected) {
        await r.addItem({
          id: randomUUID(),
          order: id,
          event: event.id,
          type: t.id,
          name: t.name,
          price: t.price_amount,
          quantity: t.quantity,
          expires,
        });
        await r.inventory(t.id, t.quantity, 0);
      }
      return order;
    },
    async prepare(order: Row, p: Principal) {
      ensure(
        order.buyer_id === p.userId,
        "FORBIDDEN",
        "Đơn hàng không thuộc tài khoản này.",
        403,
      );
      ensure(
        order.status === "PENDING_PAYMENT" &&
          new Date(order.expires_at) > new Date(),
        "ORDER_CLOSED",
        "Đơn hàng đã hết hạn hoặc đã thanh toán.",
      );
      const rs = await lockInventory(order);
      ensure(
        rs.every((v) => v.status === "HELD"),
        "ORDER_CLOSED",
        "Vé không còn được giữ chỗ.",
      );
      return order;
    },
    async complete(order: Row, payment: Row) {
      ensure(
        order.total_amount === payment.amount &&
          order.currency === payment.currency &&
          order.id === payment.order_id,
        "PAYMENT_MISMATCH",
        "Thông tin giao dịch không khớp.",
      );
      if (order.status === "PAID")
        return order.paid_payment_id === payment.id
          ? "ALREADY_APPLIED"
          : "DIFFERENT_PAYMENT_ALREADY_APPLIED";
      const rs = await lockInventory(order);
      if (
        order.status !== "PENDING_PAYMENT" ||
        rs.some(
          (v) => v.status !== "HELD" || new Date(v.release_after) <= new Date(),
        )
      ) {
        await release(order);
        return "LATE_PAYMENT";
      }
      await r.paid(order.id, payment.id);
      for (const v of rs) {
        await r.inventory(v.ticket_type_id, -v.quantity, v.quantity);
        await r.reserveState(v.order_item_id, "CONSUMED");
        for (let n = 1; n <= v.quantity; n++) {
          const token = randomBytes(32).toString("base64url");
          await r.newTicket({
            id: randomUUID(),
            item: v.order_item_id,
            event: order.event_id,
            sequence: n,
            code: randomBytes(12).toString("hex").toUpperCase(),
            hash: hash(token),
            cipher: encrypt(token),
          });
        }
      }
      return "APPLIED";
    },
    async qr(p: Principal, id: string) {
      const t = await r.ticket(id);
      ensure(
        t && t.buyer_id === p.userId,
        "NOT_FOUND",
        "Không tìm thấy vé.",
        404,
      );
      return {
        id: t.id,
        eventId: t.event_id,
        code: t.ticket_code,
        status: t.status,
        eventTitle: t.event_title_snapshot,
        typeName: t.ticket_type_name_snapshot,
        token: decrypt(t.qr_token_ciphertext),
      };
    },
    async scan(p: Principal, event: Row, value: string) {
      ensure(
        !event.checkin_paused &&
          !["CANCELLED", "ARCHIVED"].includes(event.status) &&
          new Date(event.checkin_opens_at) <= new Date() &&
          new Date(event.checkin_closes_at) > new Date(),
        "CHECKIN_CLOSED",
        "Chưa đến hoặc đã hết giờ check-in.",
      );
      const t = await r.ticketByCode(value, hash(value), true);
      ensure(
        t && t.event_id === event.id,
        "INVALID_QR",
        "Mã vé không hợp lệ hoặc sai sự kiện.",
        400,
      );
      if (t.status === "CHECKED_IN")
        return { duplicate: true, ...(await r.checkinInfo(t.id)) };
      ensure(t.status === "VALID", "VOID_TICKET", "Vé đã bị hủy.");
      const details = await r.ticket(t.id);
      ensure(
        details.order_status === "PAID",
        "UNPAID_TICKET",
        "Vé chưa được thanh toán.",
      );
      return {
        duplicate: false,
        ...(await r.checkin(
          t.id,
          event.id,
          p.userId,
          t.ticket_code === value ? "MANUAL_CODE" : "QR",
        )),
      };
    },
  };
}
export type Orders = ReturnType<typeof createOrders>;
