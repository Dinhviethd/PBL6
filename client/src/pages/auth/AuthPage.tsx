import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Apple, Eye, EyeOff, Fingerprint, LockKeyhole, Mail, QrCode, ShieldCheck } from "lucide-react";
import { ActionForm } from "@/components/ticketing/action-form";
import { Field } from "@/components/ticketing/shared";
import authService from "@/features/auth/services/authService";

export function AuthPage({
  register = false,
  reset = false,
}: {
  register?: boolean;
  reset?: boolean;
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    [sent, setSent] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const login = !register && !reset;
  return (
    <main className={`auth-page${login ? " auth-page-login" : ""}`}>
      <header className="auth-topbar">
        <Link className="auth-brand" to="/" aria-label="NOVA Events — Trang chủ">
          <strong>NOVA</strong><span>EVENTS</span>
        </Link>
        <nav className="auth-top-actions" aria-label="Điều hướng">
          <Link to="/"><ArrowLeft size={15} /> Khám phá sự kiện</Link>
          <button type="button" className="auth-language" aria-label="Ngôn ngữ: Tiếng Việt">
            VIE <span>/</span> ENG
          </button>
        </nav>
      </header>
      <div className="auth-layout">
        {login && <section className="auth-showcase" aria-label="Giới thiệu NOVA Events">
          <div className="auth-showcase-art" aria-hidden="true">NOVA•RAW</div>
          <div className="auth-showcase-copy">
            <div className="auth-showcase-meta"><span><i /> SOUND CULTURE // 2025</span><small>EDITION: SGN-HN</small></div>
            <p className="auth-kicker">Tuyên ngôn âm thanh độc bản</p>
            <h2>Đánh thức nhịp đập ngầm của đô thị số.</h2>
            <p className="auth-description">Hạ tầng phân phối vé bảo mật bằng Dynamic QR chống phe vé giả mạo, thiết kế tối giản dành riêng cho cộng đồng âm nhạc độc lập tại Việt Nam.</p>
          </div>
          <article className="auth-event-card">
            <div className="auth-event-heading"><div><small>Sắp diễn ra tại TP. Hồ Chí Minh</small><h3>VŨ TRỤ ĐÊM 04</h3><p>The Warehouse, Thủ Thiêm • 24.11.2025</p></div><b>HOT DROP</b></div>
            <div className="auth-event-footer"><span><QrCode size={17}/> Passcode mã hóa động 0.5s</span><strong>Còn lại 18 vé</strong></div>
          </article>
          <div className="auth-metrics"><div><strong>500.000+ <small>VÉ</small></strong><span>Kết nối an toàn tuyệt đối</span></div><div><strong>0.5s <small>TỐC ĐỘ</small></strong><span>Quét Dynamic QR tại cửa</span></div><div><strong>100% <small>CHÍNH CHỦ</small></strong><span>Xác thực danh tính số</span></div></div>
        </section>}
        <section className={`panel auth-panel${login ? "" : " auth-panel-compact"}`}>
        {login && <div className="auth-form-heading"><span className="auth-identity"><i /> XÁC THỰC DANH TÍNH</span></div>}
        <h2>
          {reset
            ? "Đặt lại mật khẩu"
            : register
              ? "Tạo tài khoản"
          : "Chào mừng trở lại"}
        </h2>
        <p className="muted auth-subtitle">
          {reset
            ? "Mã xác nhận sẽ được gửi đến email của bạn."
            : login ? "Đăng nhập để khám phá kho vé độc quyền hoặc quản trị sự kiện biểu diễn của bạn." : "Bắt đầu hành trình trải nghiệm của bạn."}
        </p>
        <ActionForm
          key={`${register}-${reset}-${sent}`}
          label={
            reset
              ? sent
                ? "Đổi mật khẩu"
                : "Gửi mã xác nhận"
              : register
                ? "Đăng ký"
                : "Đăng nhập"
          }
          onSubmit={async (d) => {
            if (reset) {
              if (!sent) {
                await authService.forgotPassword({ email: d.email });
                setSent(true);
              } else {
                await authService.resetPassword({
                  email: d.email,
                  otp: d.otp,
                  newPassword: d.password,
                  confirmPassword: d.confirmPassword,
                });
                navigate("/auth/login");
              }
              return;
            }
            if (register)
              await authService.register({
                name: d.name,
                email: d.email,
                password: d.password,
                confirmPassword: d.confirmPassword,
              });
            else
              await authService.login({ email: d.email, password: d.password });
            const from = location.state?.from;
            navigate(
              typeof from === "string" &&
                from.startsWith("/") &&
                !from.startsWith("//")
                ? from
                : "/",
            );
          }}
        >
          {register && <Field label="Họ và tên" name="name" />}
          {login ? <label className="field auth-input-field"><span>Email hoặc Số điện thoại <small>Bắt buộc</small></span><div className="auth-input-wrap"><Mail size={16}/><input aria-label="Email" autoComplete="username" name="email" placeholder="name@novaevents.vn hoặc 0909xxxxxx" type="email" required /></div></label> : <Field label="Email" name="email" type="email" />}
          {(!reset || sent) && (
            login ? <label className="field auth-input-field"><span>Mật khẩu <Link to="/auth/reset-password">Quên mật khẩu?</Link></span><div className="auth-input-wrap"><LockKeyhole size={16}/><input autoComplete="current-password" name="password" placeholder="••••••••••••" type={showPassword ? "text" : "password"} required/><button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label> : <Field
              label="Mật khẩu (ít nhất 8 ký tự)"
              name="password"
              type="password"
            />
          )}
          {(register || sent) && (
            <Field
              label="Nhập lại mật khẩu"
              name="confirmPassword"
              type="password"
            />
          )}
          {sent && <Field label="Mã xác nhận 6 số" name="otp" />}
        </ActionForm>
        {login && <div className="auth-login-options"><label><input type="checkbox" defaultChecked/> Ghi nhớ phiên đăng nhập (30 ngày)</label><span><ShieldCheck size={13}/> SSL 256-bit</span></div>}
        {login && <div className="auth-divider"><span>HOẶC TIẾP TỤC VỚI</span></div>}
        {login && <div className="auth-providers" aria-label="Phương thức đăng nhập khác"><button type="button" disabled><b className="google-mark">G</b> Google</button><button type="button" disabled><Apple size={14} fill="currentColor"/> Apple</button><button type="button" disabled><Fingerprint size={15}/> Passkey</button></div>}
        <div className="auth-links">
          <Link to={register ? "/auth/login" : "/auth/register"}>
            {register
              ? "Đã có tài khoản? Đăng nhập"
              : <>{login ? "Chưa có tài khoản? " : ""}<strong>Đăng ký tham gia ngay</strong></>}
          </Link>
          {!login && <Link to="/auth/reset-password">Quên mật khẩu?</Link>}
        </div>
      </section>
      </div>
    </main>
  );
}
