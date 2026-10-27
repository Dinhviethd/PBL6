import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Loading } from "@/components/ticketing/shared";
import { useLoad } from "@/features/ticketing/data";
import type { TicketDetail } from "@/features/ticketing/types";
import { TicketCard, TicketGuide } from "./TicketCard";
import "./my-tickets.css";

export function TicketPage() {
  const { id } = useParams(),
    r = useLoad<TicketDetail>(`/me/tickets/${id}`);
  useEffect(() => {
    document.title = "Vé điện tử | EventHub";
  }, []);
  return (
    <div className="my-tickets-page">
      <div className="mt-container">
        <Link className="mt-back" to="/tickets">
          <ArrowLeft size={16} />
          Vé của tôi
        </Link>
        <div className="mt-heading mt-no-print">
          <div>
            <span className="mt-eyebrow">Vé điện tử EventHub</span>
            <h1>Chi tiết vé</h1>
          </div>
          <button className="mt-button" onClick={r.reload} disabled={r.loading}>
            <RefreshCw size={16} />
            Tải lại vé
          </button>
        </div>
        {r.loading ? (
          <Loading />
        ) : r.error || !r.data ? (
          <div className="mt-state" role="alert">
            <h2>Không tải được vé</h2>
            <p>
              {r.error || "Vé không tồn tại hoặc bạn không có quyền truy cập."}
            </p>
            <button className="mt-button" onClick={r.reload}>
              Thử lại
            </button>
          </div>
        ) : (
          <TicketCard
            key={`${r.data.id}:${r.data.status}:${r.data.qrImage}`}
            ticket={r.data}
          />
        )}
        <TicketGuide />
      </div>
    </div>
  );
}
