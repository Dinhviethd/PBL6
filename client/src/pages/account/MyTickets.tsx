import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket as TicketIcon,
  RefreshCw,
  ArrowRight,
  CalendarDays,
  MapPin,
  ReceiptText,
} from "lucide-react";
import api from "@/lib/api";
import { Loading } from "@/components/ticketing/shared";
import { message, useLoad } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import type { Ticket, TicketDetail } from "@/features/ticketing/types";
import { AuthToast } from "../auth/AuthShell";
import { TicketBadge, TicketCard, TicketGuide } from "./TicketCard";
import { ticketDate } from "./ticket-format";
import "./my-tickets.css";

function Spotlight({ id }: { id: string }) {
  const r = useLoad<TicketDetail>(`/me/tickets/${id}`);
  if (r.loading) return <Loading />;
  if (r.error || !r.data)
    return (
      <div className="mt-state" role="alert">
        <h2>Không tải được chi tiết vé</h2>
        <p>{r.error}</p>
        <button className="mt-button" onClick={r.reload}>
          Thử lại
        </button>
      </div>
    );
  return <TicketCard key={`${r.data.id}:${r.data.status}`} ticket={r.data} />;
}

export function MyTickets() {
  const revision = useAuth((s) => s.revision);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("VALID");
  const [visible, setVisible] = useState(6);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    document.title = "Vé của tôi | EventHub";
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setTickets([]);
    // Complete pagination before computing totals and status filters.
    async function load() {
      const collected = new Map<string, Ticket>();
      for (let page = 0; ; page++) {
        const response = await api.get<{ data: Ticket[] }>(
          `/me/tickets?page=${page}`,
          { signal: controller.signal },
        );
        for (const ticket of response.data.data)
          collected.set(ticket.id, ticket);
        if (response.data.data.length < 50) break;
      }
      if (!controller.signal.aborted) setTickets([...collected.values()]);
    }
    void load()
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, version]);
  const filtered = tickets.filter((ticket) => ticket.status === status);
  const counts = (value: string) =>
    tickets.filter((ticket) => ticket.status === value).length;
  const changeStatus = (value: string) => {
    setStatus(value);
    setVisible(6);
  };
  const refresh = () => setVersion((v) => v + 1);
  return (
    <div className="my-tickets-page">
      <div className="mt-container">
        <div className="mt-heading mt-no-print">
          <div>
            <span className="mt-eyebrow">
              <TicketIcon size={15} />
              Trạm kiểm soát vé số hóa
            </span>
            <h1>Vé Sự Kiện Của Tôi</h1>
            <p>Quản lý vé điện tử và mã QR check-in của bạn.</p>
          </div>
          <div className="mt-metrics">
            <div className="mt-metric">
              <span className="mt-dot" />
              <div>
                <small>Chưa sử dụng</small>
                <strong>
                  {loading || error ? "—" : counts("VALID")} <span>vé</span>
                </strong>
              </div>
            </div>
            <div className="mt-metric">
              <span className="mt-dot" />
              <div>
                <small>Đã tham dự</small>
                <strong>
                  {loading || error ? "—" : counts("CHECKED_IN")}{" "}
                  <span>vé</span>
                </strong>
              </div>
            </div>
            <button
              className="mt-button mt-icon-button"
              onClick={refresh}
              disabled={loading}
              aria-label="Làm mới danh sách vé"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
        <div
          className="mt-tabs mt-no-print"
          role="group"
          aria-label="Lọc trạng thái vé"
        >
          {[
            ["VALID", "Sắp diễn ra"],
            ["CHECKED_IN", "Đã sử dụng"],
            ["VOID", "Đã hủy"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={status === value}
              onClick={() => changeStatus(value)}
            >
              {label}
              <span>{loading || error ? "—" : counts(value)}</span>
            </button>
          ))}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="mt-state" role="alert">
            <h2>Không tải được danh sách vé</h2>
            <p>{error}</p>
            <button className="mt-button" onClick={refresh}>
              Thử lại
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="mt-state">
            <TicketIcon size={36} />
            <h2>
              {tickets.length
                ? "Chưa có vé ở trạng thái này"
                : "Bạn chưa có vé"}
            </h2>
            <p className="mt-muted">Vé đã thanh toán sẽ xuất hiện tại đây.</p>
            <Link className="mt-button mt-button-primary" to="/explore">
              Khám phá sự kiện
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <Spotlight
              key={`${filtered[0].id}:${version}`}
              id={filtered[0].id}
            />
            <Link
              className="mt-back mt-no-print"
              to={`/tickets/${filtered[0].id}`}
            >
              Mở chi tiết vé
              <ArrowRight size={16} />
            </Link>
            <section className="mt-no-print" aria-labelledby="mt-other-tickets">
              <div className="mt-shelf-title">
                <h2 id="mt-other-tickets">Các Vé Khác Của Bạn</h2>
                <span>{filtered.length - 1} vé cùng trạng thái</span>
              </div>
              {filtered.length === 1 ? (
                <p className="mt-muted">Không có vé khác ở trạng thái này.</p>
              ) : (
                <div className="mt-ticket-grid">
                  {filtered.slice(1, visible + 1).map((ticket) => (
                    <article className="mt-small-ticket" key={ticket.id}>
                      <div className="mt-card-top">
                        <span className="mt-type">
                          {ticket.ticket_type_name_snapshot}
                        </span>
                        <TicketBadge status={ticket.status} />
                      </div>
                      <h3>{ticket.event_title_snapshot}</h3>
                      <p className="mt-code">#{ticket.ticket_code}</p>
                      <div className="mt-small-meta">
                        <p>
                          <CalendarDays size={15} />
                          {ticket.status === "CHECKED_IN"
                            ? `Check-in: ${ticketDate(ticket.checked_in_at)}`
                            : ticketDate(ticket.event?.starts_at)}
                        </p>
                        <p>
                          <MapPin size={15} />
                          {ticket.event?.venue_name || "Chưa có địa điểm"}
                        </p>
                      </div>
                      <div className="mt-card-bottom">
                        <Link
                          className="mt-button"
                          to={`/tickets/${ticket.id}`}
                        >
                          Xem chi tiết
                          <ArrowRight size={15} />
                        </Link>
                        {ticket.status === "CHECKED_IN" && (
                          <button
                            className="mt-button"
                            onClick={() =>
                              setNotice(
                                "Chức năng đang trong quá trình phát triển",
                              )
                            }
                          >
                            <ReceiptText size={15} />
                            Hóa đơn VAT
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {filtered.length - 1 > visible && (
                <div className="mt-pagination">
                  <button
                    className="mt-button"
                    onClick={() => setVisible((v) => v + 6)}
                  >
                    Xem thêm vé
                  </button>
                </div>
              )}
            </section>
          </>
        )}
        <TicketGuide />
        {notice && <AuthToast message={notice} onClose={() => setNotice("")} />}
      </div>
    </div>
  );
}
