import { Link } from "react-router-dom";
import {
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

const HOTLINE = "0378531013";
const SUPPORT_EMAIL = "trankhahao7@gmail.com";

export function AuthFooter({
  onNotice,
  a11Reference = false,
}: {
  onNotice: (message: string) => void;
  a11Reference?: boolean;
}) {
  const policy = (label: string) =>
    onNotice(
      `${label} đang được cập nhật. Vui lòng liên hệ hỗ trợ nếu cần thêm thông tin.`,
    );

  return (
    <footer className="auth-footer auth-shared">
      <div className="auth-footer-grid">
        <div className="auth-footer-brand">
          <Link className="auth-logo" to="/" aria-label={a11Reference ? "ENVENT HUB — Trang chủ" : "EVENTHUB — Trang chủ"}>
            <span className="auth-logo-mark">
              <img src="/logo.png" alt="EventHub logo" />
            </span>
            <span>
              {a11Reference ? "ENVENT" : "EVENT"}<span>HUB</span>
            </span>
          </Link>
          <p>
            {a11Reference
              ? "Nền tảng phát hành vé số hóa, phân phối sự kiện âm nhạc và kiểm soát check-in theo phong cách Cyber Nebula đỉnh cao. Trải nghiệm giải trí chuẩn xác, bảo mật và bùng nổ năng lượng."
              : "Nền tảng phát hành vé số hóa, phân phối sự kiện âm nhạc và kiểm soát check-in theo phong cách Cyber Cosmic đỉnh cao. Trải nghiệm giải trí chuẩn xác, bảo mật và bùng nổ năng lượng."}
          </p>
          <span className="auth-footer-tech">
            <ShieldCheck size={14} /> Công nghệ vé QR Độc Bản Thời Gian Thực
          </span>
        </div>

        <div className="auth-footer-col">
          <h2>{a11Reference ? "Tài khoản & khách hàng" : "Liên kết nhanh"}</h2>
          {a11Reference ? (
            <>
              <Link to="/profile">Hồ sơ cá nhân</Link>
              <Link to="/orders">Lịch sử đơn hàng</Link>
              <Link to="/tickets">Vé của tôi</Link>
              <Link to="/auth/reset-password">Khôi phục mật khẩu</Link>
            </>
          ) : (
            <>
              <Link to="/explore?q=l%E1%BB%85%20h%E1%BB%99i">Lễ hội Âm nhạc Hot</Link>
              <Link to="/explore?q=underground">Sự kiện Underground</Link>
              <Link to="/register-organizer">Dành cho Ban tổ chức</Link>
              <Link to="/tickets">Hướng dẫn mua vé QR</Link>
            </>
          )}
        </div>

        <div className="auth-footer-col">
          <h2>Chính sách &amp; Pháp lý</h2>
          <button type="button" onClick={() => policy("Điều khoản sử dụng")}>
            Điều khoản sử dụng
          </button>
          <button type="button" onClick={() => policy("Chính sách bảo mật")}>
            Chính sách bảo mật
          </button>
          <button
            type="button"
            onClick={() => policy(a11Reference ? "Chính sách hủy/đổi vé" : "Chính sách hoàn/đổi vé")}
          >
            {a11Reference ? "Chính sách hủy/đổi vé" : "Chính sách hoàn/đổi vé"}
          </button>
          <button type="button" onClick={() => policy("Bảo mật thông tin POS")}>
            Bảo mật thông tin POS
          </button>
        </div>

        <div className="auth-footer-col auth-footer-support">
          <h2>Hỗ trợ 24/7</h2>
          <a href={`tel:${HOTLINE}`}>
            <Phone size={14} /> <span>{HOTLINE}</span>
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={14} /> <span>{SUPPORT_EMAIL}</span>
          </a>
          <span>
            <MapPin size={14} /> Trung tâm điều phối {a11Reference ? "TicketHub" : "EventHub"}
          </span>
        </div>
      </div>

      <div className="auth-footer-bottom">
        <span>
          {a11Reference
            ? "© 2025 ENVENT HUB. Bản quyền thuộc về nền tảng sự kiện ENVENT HUB."
            : "© 2026 EVENTHUB. Bản quyền thuộc về nền tảng sự kiện EVENTHUB."}
        </span>
        <div>
          <span>VN | VI</span>
          <span>Hạ tầng Cloud Nebula</span>
          <span>Hỗ trợ check-in sự kiện</span>
        </div>
      </div>
    </footer>
  );
}
