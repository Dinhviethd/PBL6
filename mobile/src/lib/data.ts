import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";
import { useSession } from "./session";
export const money = (value: string | number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
export const when = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại.";
export function useResource<T>(path: string | null) {
  const { user } = useSession();
  const identity = `${user?.idUser ?? "guest"}:${path}`;
  const [state, setState] = useState<{
    identity: string;
    data: T | null;
    loading: boolean;
    error: string;
  }>({ identity, data: null, loading: true, error: "" });
  const [version, setVersion] = useState(0),
    generation = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const current = ++generation.current;
      if (!path) {
        setState({ identity, data: null, error: "", loading: false });
        return;
      }
      setState((s) => ({
        identity,
        data: s.identity === identity ? s.data : null,
        error: "",
        loading: true,
      }));
      api
        .request<T>(path)
        .then((data) => {
          if (generation.current === current)
            setState({ identity, data, error: "", loading: false });
        })
        .catch((e) => {
          if (generation.current === current)
            setState({
              identity,
              data: null,
              error: errorMessage(e),
              loading: false,
            });
        });
      return () => {
        generation.current++;
      };
      // The version is an explicit invalidation key for pull-to-refresh/polling.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, identity, version]),
  );
  return {
    ...(state.identity === identity
      ? state
      : { data: null, error: "", loading: true }),
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
export type {
  Category,
  Event,
  Order,
  Ticket,
  TicketDetail,
  Payment,
} from "../../../client/src/features/ticketing/types";
export type Assignment = {
  id: string;
  event_id: string;
  title: string;
  venue_name: string;
  starts_at: string;
  ends_at: string;
  checkin_opens_at: string;
  checkin_closes_at: string;
  event_status: string;
  status: "PENDING" | "ACTIVE" | "DECLINED" | "REVOKED";
  expires_at: string;
};
const stateLabels: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  EXPIRED: "Đã hết hạn",
  CANCELLED: "Đã hủy",
  VALID: "Vé hợp lệ",
  CHECKED_IN: "Đã check-in",
  VOID: "Vé đã hủy",
  ACTIVE: "Đã nhận việc",
  PENDING: "Chờ chấp nhận",
  DECLINED: "Đã từ chối",
  REVOKED: "Đã thu hồi",
  FAILED: "Thất bại",
  SUCCEEDED: "Thành công",
};
export const stateLabel = (status: string) => stateLabels[status] ?? status;
