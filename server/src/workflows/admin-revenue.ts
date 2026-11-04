import { ensure, role, type Principal, type Row, type UnitOfWork } from "../contracts/core";
import type { Orders } from "../modules/order/public";
import type { Payments } from "../modules/payment/public";
import { analyticsRange } from "./event-analytics";

export function createAdminRevenue(orders: Orders, payments: Payments, snapshot: UnitOfWork) {
  return {
    async report(principal: Principal, query: { fromDate: string; toDate: string }) {
      role(principal, ["ADMIN"]);
      const range = analyticsRange(query);
      const start = Date.parse(range.start);
      const end = Date.parse(range.end);
      return snapshot.run(async () => {
        const daily = new Map<string, bigint>();
        for (let index = 0; index < range.days; index++) {
          const day = new Date(start + index * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
          daily.set(day, 0n);
        }
        let cursor: string | null = null;
        let total = 0n;
        for (;;) {
          const batch: Row[] = await orders.adminPaidOrderBatch(cursor);
          if (!batch.length) break;
          const ids = batch.map(order => order.paid_payment_id).filter(Boolean);
          const outcomes = new Map<string, Row>(
            (await payments.analyticsOutcomes(ids)).map(payment => [payment.id, payment]),
          );
          for (const order of batch) {
            const payment = outcomes.get(order.paid_payment_id);
            ensure(
              payment && payment.order_id === order.id && payment.status === "SUCCEEDED" && payment.succeeded_at,
              "ANALYTICS_DATA_INCONSISTENT",
              "Đơn đã thanh toán thiếu giao dịch thành công chuẩn. Vui lòng kiểm tra dữ liệu.",
            );
            const time = new Date(payment.succeeded_at).getTime();
            ensure(Number.isFinite(time), "ANALYTICS_DATA_INCONSISTENT", "Ngày thanh toán không hợp lệ.");
            if (time < start || time >= end) continue;
            const day = new Date(time + 7 * 3600000).toISOString().slice(0, 10);
            const amount = BigInt(order.total_amount);
            daily.set(day, daily.get(day)! + amount);
            total += amount;
          }
          cursor = String(batch[batch.length - 1].id);
        }
        return {
          fromDate: range.fromDate,
          toDate: range.toDate,
          timezone: "Asia/Ho_Chi_Minh",
          currency: "VND",
          totalRevenue: total.toString(),
          series: [...daily].map(([date, revenue]) => ({ date, revenue: revenue.toString() })),
        };
      });
    },
  };
}
