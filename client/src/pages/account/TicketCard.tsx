import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  UserRound,
  Ticket,
  Download,
  Wallet,
  Mail,
  ArrowLeftRight,
  ReceiptText,
  ShieldCheck,
  QrCode,
  CircleCheck,
  CircleX,
  Headset,
} from "lucide-react";
import { AuthToast } from "../auth/AuthShell";
import type { TicketDetail } from "@/features/ticketing/types";

import { ticketDate } from "./ticket-format";

export function TicketBadge({ status }: { status: string }) {
  const used = status === "CHECKED_IN",
    voided = status === "VOID";
  const Icon = used ? CircleCheck : voided ? CircleX : ShieldCheck;
  return (
    <span
      className={`mt-badge${used ? " mt-badge-used" : voided ? " mt-badge-void" : ""}`}
    >
      <Icon size={13} />
      {used
        ? "Đã check-in"
        : voided
          ? "Đã hủy"
          : status === "VALID"
            ? "Hợp lệ • Chưa check-in"
            : status}
    </span>
  );
}

export function TicketCard({ ticket }: { ticket: TicketDetail }) {
  const [notice, setNotice] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const valid = ticket.status === "VALID";
  const developing = () =>
    setNotice("Chức năng đang trong quá trình phát triển");
  return (
    <>
      <article
        className="mt-spotlight"
        aria-label="Thông tin vé"
        data-ticket-status={ticket.status}
      >
        <div className="mt-ticket-info">
          <div className="mt-card-top">
            <span className="mt-type">
              <Ticket size={13} />
              {ticket.typeName}
            </span>
            <TicketBadge status={ticket.status} />
          </div>
          <h2 className="mt-event-title">
            <span>{ticket.eventTitle}</span>
          </h2>
          <p className="mt-code">#{ticket.code}</p>
          <dl className="mt-meta-grid">
            <div className="mt-meta">
              <dt>
                <CalendarDays size={15} />
                Thời gian sự kiện
              </dt>
              <dd>
                <strong>{ticketDate(ticket.event?.starts_at)}</strong>
                <small>Giờ Việt Nam (UTC+7)</small>
              </dd>
            </div>
            <div className="mt-meta">
              <dt>
                <MapPin size={15} />
                Địa điểm
              </dt>
              <dd>
                <strong>
                  {ticket.event?.venue_name || "Chưa có thông tin"}
                </strong>
                {ticket.event?.address && <small>{ticket.event.address}</small>}
              </dd>
            </div>
            <div className="mt-meta">
              <dt>
                <UserRound size={15} />
                Chủ sở hữu vé
              </dt>
              <dd>
                <strong>{ticket.buyerName || "Chưa có thông tin"}</strong>
                {ticket.buyerEmail && <small>{ticket.buyerEmail}</small>}
              </dd>
            </div>
            <div className="mt-meta">
              <dt>
                <Ticket size={15} />
                Thông tin sử dụng
              </dt>
              <dd>
                {ticket.status === "CHECKED_IN" ? (
                  <>
                    Đã check-in<small>{ticketDate(ticket.checkedInAt)}</small>
                  </>
                ) : ticket.status === "VOID" ? (
                  <>
                    Vé không còn hợp lệ
                    {ticket.voidReason && <small>{ticket.voidReason}</small>}
                  </>
                ) : (
                  <>
                    Mỗi vé check-in một lần
                    <small>Xuất trình mã QR tại cổng sự kiện.</small>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-actions mt-no-print">
            <button
              type="button"
              className="mt-button mt-button-primary"
              onClick={() => window.print()}
              disabled={valid && !imageReady}
            >
              <Download size={16} />
              Tải vé PDF
            </button>
            <button type="button" className="mt-button" onClick={developing}>
              <Wallet size={16} />
              Thêm vào Apple Wallet
            </button>
            <button type="button" className="mt-button" onClick={developing}>
              <Mail size={16} />
              Gửi Email
            </button>
            <button type="button" className="mt-button" onClick={developing}>
              <ArrowLeftRight size={16} />
              Chuyển nhượng
            </button>
            {ticket.status === "CHECKED_IN" && (
              <button type="button" className="mt-button" onClick={developing}>
                <ReceiptText size={16} />
                Hóa đơn VAT
              </button>
            )}
          </div>
          <p className="mt-print-hint mt-no-print">
            Tải vé PDF: chọn “Lưu dưới dạng PDF” trong hộp thoại in.
          </p>
        </div>
        <div className="mt-qr-panel">
          <div className="mt-qr-heading">
            <span>GATE SCAN PASS</span>
            <ShieldCheck size={16} />
          </div>
          {valid ? (
            <>
              {!imageError ? (
                <div className="mt-qr-frame">
                  <img
                    key={ticket.qrImage}
                    src={ticket.qrImage}
                    alt={`Mã QR vé ${ticket.code}`}
                    width={320}
                    height={320}
                    onLoad={() => setImageReady(true)}
                    onError={() => {
                      setImageReady(false);
                      setImageError(true);
                    }}
                  />
                </div>
              ) : (
                <p role="alert">Không tải được mã QR. Vui lòng tải lại vé.</p>
              )}
              <p className="mt-qr-caption">
                Sẵn sàng quét để check-in tại cổng
              </p>
              <p className="mt-muted">
                Xuất trình mã này cho nhân viên kiểm soát vé.
              </p>
            </>
          ) : (
            <div className="mt-unavailable">
              <QrCode size={72} />
              <strong>
                {ticket.status === "CHECKED_IN"
                  ? "Vé đã được sử dụng"
                  : "Vé không thể dùng để check-in"}
              </strong>
              <p>Mã QR không hiển thị cho trạng thái vé này.</p>
            </div>
          )}
          <span className="mt-code">{ticket.code}</span>
        </div>
      </article>
      {notice && <AuthToast message={notice} onClose={() => setNotice("")} />}
    </>
  );
}

export function TicketGuide() {
  return (
    <section className="mt-guide mt-no-print" aria-labelledby="mt-guide-title">
      <span className="mt-eyebrow">
        <ShieldCheck size={16} />
        Hướng dẫn sử dụng vé
      </span>
      <h2 id="mt-guide-title">3 Bước Check-in Tại Sự Kiện</h2>
      <div className="mt-guide-grid">
        {[
          [
            "Mở Vé Điện Tử QR",
            "Mở vé hợp lệ và tăng độ sáng màn hình để nhân viên dễ dàng quét mã.",
          ],
          [
            "Xuất Trình Mã QR",
            "Đưa mã QR cho nhân viên kiểm soát tại cổng vào của sự kiện.",
          ],
          [
            "Xác Nhận Check-in",
            "Chờ nhân viên xác nhận vé hợp lệ và làm theo hướng dẫn vào khu vực sự kiện.",
          ],
        ].map(([title, body], index) => (
          <div className="mt-guide-step" key={title}>
            <span>0{index + 1}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <p className="mt-guide-support">
        <Headset size={19} />
        Gặp sự cố quét mã? Liên hệ nhân viên hỗ trợ của ban tổ chức tại sự kiện.
      </p>
    </section>
  );
}
