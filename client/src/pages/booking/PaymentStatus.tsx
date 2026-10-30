import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ReceiptText,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { Loading } from "@/components/ticketing/shared";
import {
  orderDate,
  orderMoney,
  useOrderHistory,
  type HistoryOrder,
} from "@/pages/account/order-history";
import "./payment-status.css";

const providerLabels: Record<string, string> = {
  demo: "Thanh toán demo",
  sepay: "Chuyển khoản ngân hàng",
  vnpay_sandbox: "VNPay Sandbox",
};

export function PaymentStatus() {
  const { orderId = "" } = useParams();
  const order = useOrderHistory<HistoryOrder>(
    `/me/order-history/${encodeURIComponent(orderId)}`,
  );

  useEffect(() => {
    document.title = "Thanh toán thành công | EventHub";
  }, []);

  if (order.loading) {
    return (
      <div className="payment-status-page">
        <div className="payment-status-container">
          <Loading />
        </div>
      </div>
    );
  }

  if (order.error || !order.data) {
    return (
      <div className="payment-status-page">
        <div className="payment-status-container">
          <section className="payment-status-state" role="alert">
            <h1>Không tải được kết quả thanh toán</h1>
            <p>
              {order.error ||
                "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này."}
            </p>
            <button
              className="payment-status-button secondary"
              onClick={order.reload}
            >
              <RefreshCw size={17} aria-hidden="true" />
              Thử tải lại
            </button>
          </section>
        </div>
      </div>
    );
  }

  const data = order.data;

  if (data.status !== "PAID") {
    return (
      <div className="payment-status-page">
        <div className="payment-status-container">
          <section className="payment-status-state" role="status">
            <h1>Chưa xác nhận thanh toán</h1>
            <p>
              Đơn hàng {data.order_code} chưa được máy chủ xác nhận đã thanh
              toán. Hãy kiểm tra lại trạng thái hoặc quay về Checkout.
            </p>
            <div className="payment-status-actions">
              <button
                className="payment-status-button secondary"
                onClick={order.reload}
              >
                <RefreshCw size={17} aria-hidden="true" />
                Kiểm tra lại
              </button>
              <Link
                className="payment-status-button primary"
                to={`/checkout/${encodeURIComponent(orderId)}`}
              >
                Quay lại Checkout
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const payment = data.payment.paid;
  const ticketCount = data.tickets.issued;
  const ticketExpected = data.tickets.expected;
  const paymentMethod = payment
    ? (providerLabels[payment.provider] ?? payment.provider)
    : "Đã xác nhận bởi EventHub";

  return (
    <div className="payment-status-page">
      <div className="payment-status-container">
        <section className="payment-status-hero" aria-labelledby="payment-status-title">
          <span className="payment-status-icon" aria-hidden="true">
            <BadgeCheck size={34} strokeWidth={1.8} />
          </span>
          <p className="payment-status-eyebrow">Giao dịch đã được xác nhận</p>
          <h1 id="payment-status-title">Thanh toán thành công</h1>
          <p className="payment-status-lead">
            Đơn hàng <strong>{data.order_code}</strong> đã được cập nhật từ hệ
            thống. Thông tin vé được hiển thị theo dữ liệu hiện có.
          </p>
        </section>

        <section className="payment-status-card" aria-labelledby="payment-summary-title">
          <div className="payment-status-card-heading">
            <span className="payment-status-card-icon" aria-hidden="true">
              <ReceiptText size={20} />
            </span>
            <div>
              <h2 id="payment-summary-title">Thông tin giao dịch</h2>
              <p>Chi tiết lấy từ lịch sử đơn hàng của tài khoản.</p>
            </div>
            <span className="payment-status-badge">
              <span aria-hidden="true" />
              Đã thanh toán
            </span>
          </div>

          <dl className="payment-status-details">
            <div>
              <dt>Mã đơn hàng</dt>
              <dd>{data.order_code}</dd>
            </div>
            <div>
              <dt>Sự kiện</dt>
              <dd>{data.event_title_snapshot}</dd>
            </div>
            <div>
              <dt>Phương thức</dt>
              <dd>{paymentMethod}</dd>
            </div>
            <div>
              <dt>Thời gian thanh toán</dt>
              <dd>
                {payment?.created_at
                  ? `${orderDate(payment.created_at)} (UTC+7)`
                  : "Đã xác nhận; chưa có thời gian giao dịch trong dữ liệu trả về."}
              </dd>
            </div>
            <div className="payment-status-total">
              <dt>Tổng tiền</dt>
              <dd>{orderMoney(data.total_amount)}</dd>
            </div>
          </dl>
        </section>

        <section className="payment-status-ticket" aria-labelledby="payment-ticket-title">
          <div className="payment-status-ticket-icon" aria-hidden="true">
            <Ticket size={22} />
          </div>
          <div className="payment-status-ticket-copy">
            <h2 id="payment-ticket-title">Vé điện tử</h2>
            {ticketCount > 0 ? (
              <p>
                Đã phát hành {ticketCount}/{ticketExpected} vé cho đơn hàng này.
                Mở mục Vé của tôi để xem mã QR.
              </p>
            ) : (
              <p>
                Đơn hàng đã thanh toán. Chưa có vé được trả về trong dữ liệu
                hiện tại; hãy kiểm tra lại mục Vé của tôi sau ít phút.
              </p>
            )}
          </div>
          <span className="payment-status-ticket-count">
            {ticketCount}/{ticketExpected}
          </span>
        </section>

        <p className="payment-status-date">
          <CalendarDays size={15} aria-hidden="true" />
          Đặt hàng {orderDate(data.created_at)} (UTC+7)
        </p>

        <nav className="payment-status-actions" aria-label="Thao tác tiếp theo">
          <Link className="payment-status-button primary" to="/tickets">
            Xem vé của tôi
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className="payment-status-button secondary" to="/orders">
            Lịch sử đơn hàng
          </Link>
          <Link className="payment-status-link" to="/explore">
            Khám phá sự kiện
          </Link>
        </nav>
      </div>
    </div>
  );
}
