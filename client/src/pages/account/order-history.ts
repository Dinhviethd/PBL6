import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/stores/authStore";
import { message } from "@/features/ticketing/data";

type Payment = {
  id: string;
  status: string;
  provider: string;
  created_at: string;
};
export type HistoryOrder = {
  id: string;
  order_code: string;
  event_title_snapshot: string;
  status: string;
  total_amount: string;
  currency: string;
  created_at: string;
  expires_at: string;
  group: "paid" | "processing" | "closed";
  items: {
    ticket_type_name_snapshot: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
  payment: {
    paid: Payment | null;
    active: Payment | null;
    latest: Payment | null;
    unresolvedReview: boolean;
  };
  tickets: {
    expected: number;
    issued: number;
    valid: number;
    checkedIn: number;
    void: number;
  };
  actions: {
    canCancel: boolean;
    canViewTickets: boolean;
    canContinueCheckout: boolean;
  };
  ticketList?: {
    id: string;
    status: string;
    ticket_type_name_snapshot: string;
    checked_in_at: string | null;
  }[];
};
export type HistoryData = {
  items: HistoryOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: string;
    paid: number;
    processing: number;
    closed: number;
  };
  counts: { all: number; paid: number; processing: number; closed: number };
  asOf: string;
};
export function periodQuery(period: string, now = new Date()) {
  const vn = new Date(now.getTime() + 7 * 3600000),
    year = vn.getUTCFullYear(),
    month = vn.getUTCMonth();
  const start = (y: number, m: number) =>
    new Date(Date.UTC(y, m, 1) - 7 * 3600000).toISOString();
  if (period === "all") return {};
  return {
    from: start(
      year,
      period === "year" ? 0 : period === "three" ? month - 2 : month,
    ),
    toExclusive: start(
      period === "year" ? year + 1 : year,
      period === "year" ? 0 : month + 1,
    ),
  };
}
export const orderMoney = (amount: string) =>
  `${new Intl.NumberFormat("vi-VN").format(BigInt(amount))} ₫`;
export const orderDate = (date: string) =>
  new Date(date).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  });
export function paymentLabel(o: HistoryOrder) {
  if (o.payment.unresolvedReview) return "Cần tra soát";
  if (o.status === "PAID") return "Đã thanh toán";
  if (o.payment.active)
    return o.payment.active.status === "UNKNOWN"
      ? "Chờ xác minh"
      : "Đang xử lý";
  if (o.status === "EXPIRED") return "Đã hết hạn";
  if (o.status === "CANCELLED") return "Đã hủy";
  if (o.payment.latest?.status === "FAILED") return "Thanh toán thất bại";
  return "Chờ thanh toán";
}
export function ticketLabel(o: HistoryOrder) {
  const t = o.tickets;
  if (!t.issued)
    return o.status === "PAID" ? "Chưa phát hành vé" : "Chưa có vé";
  if (t.void === t.issued) return "Đã hủy vé";
  if (t.checkedIn === t.issued) return "Đã sử dụng";
  if (t.valid === t.issued && t.issued === t.expected) return "Đã phát hành";
  return `${t.valid} hợp lệ · ${t.checkedIn} đã dùng · ${t.void} đã hủy`;
}
export function useOrderHistory<T>(
  path: string,
  shouldPoll?: (data: T) => boolean,
) {
  const revision = useAuth((s) => s.revision);
  const [state, setState] = useState<{
    key: string;
    revision: number;
    data?: T;
    error: string;
    loading: boolean;
  }>({ key: "", revision, error: "", loading: true });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>,
      failures = 0;
    const run = async () => {
      if (document.hidden) {
        timer = setTimeout(run, 30000);
        return;
      }
      try {
        const response = await api.get<{ data: T }>(path, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        failures = 0;
        setState({
          key: path,
          revision,
          data: response.data.data,
          error: "",
          loading: false,
        });
        if (shouldPoll?.(response.data.data)) timer = setTimeout(run, 30000);
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ key: path, revision, error: message(e), loading: false });
        if (shouldPoll && ++failures < 3)
          timer = setTimeout(run, 30000 * failures);
      }
    };
    setState({ key: path, revision, error: "", loading: true });
    void run();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [path, revision, version, shouldPoll]);
  return {
    ...(state.key === path && state.revision === revision
      ? state
      : { error: "", loading: true, data: undefined }),
    reload,
  };
}
