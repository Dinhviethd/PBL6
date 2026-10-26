import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  KeyRound,
  Mail,
  Phone,
  Ticket,
  UserRound,
} from "lucide-react";
import { ActionForm } from "@/components/ticketing/action-form";
import {
  Field,
  Loading,
  Notice,
} from "@/components/ticketing/shared";
import api from "@/lib/api";
import authService from "@/features/auth/services/authService";
import { useLoad } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import type { Ticket as TicketRecord } from "@/features/ticketing/types";
import {
  AuthFooter,
  AuthHeader,
  AuthToast,
} from "@/pages/auth/AuthShell";
import "../auth/auth.css";
import "./profile.css";

function formatDate(value: Date | string | undefined) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function AvatarUploadField({
  onUploaded,
}: {
  onUploaded: (url: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await api.post("/media", form);
      await onUploaded(response.data.data.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không thể tải ảnh đại diện.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-avatar-picker compact">
      <label className="profile-avatar-picker-button" title="Thay đổi ảnh đại diện">
        <Camera size={15} />
        <input
          aria-label="Thay đổi ảnh đại diện"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {error && <span className="profile-upload-error" role="alert">{error}</span>}
    </div>
  );
}

export function Profile() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const tickets = useLoad<TicketRecord[]>("/me/tickets?page=0");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? "");
  }, [user?.avatarUrl]);
  const initials = useMemo(
    () =>
      user?.name
        ?.split(/\s+/)
        .filter(Boolean)
        .slice(-2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "EH",
    [user?.name],
  );

  async function updateAvatar(url: string) {
    if (!user) {
      throw new Error("Không tìm thấy thông tin tài khoản.");
    }
    await api.patch("/me", {
      name: user.name,
      phone: user.phone,
      avatarUrl: url,
    });
    setAvatarUrl(url);
    await authService.getCurrentUser();
    setNotice("Ảnh đại diện đã được cập nhật.");
  }

  async function updateProfile(data: Record<string, string>) {
    await api.patch("/me", {
      name: data.name,
      phone: data.phone || undefined,
      avatarUrl: avatarUrl || user?.avatarUrl || null,
    });
    await authService.getCurrentUser();
    setNotice("Thông tin cá nhân đã được cập nhật.");
  }

  async function changePassword(data: Record<string, string>) {
    if (data.newPassword !== data.confirmPassword) {
      throw new Error("Mật khẩu mới và mật khẩu nhập lại không khớp.");
    }
    const passwordData = { ...data };
    delete passwordData.confirmPassword;
    await api.post("/me/password", passwordData);
    useAuth.getState().clearAuth();
  }

  return (
    <div className="profile-page">
      <AuthHeader
        mode="login"
        user={user}
        search={search}
        onSearchChange={setSearch}
        onSearch={(event) => {
          event.preventDefault();
          const query = search.trim();
          navigate(query ? `/?q=${encodeURIComponent(query)}` : "/");
        }}
      />
      <header className="profile-hero">
        <div>
          <div className="profile-brand" aria-label="EventHub">
            {/* <span className="profile-brand-mark">✦</span> */}
            {/* <strong>EVENT<span>HUB</span></strong> */}
          </div>
          <span className="profile-kicker">
            <span className="profile-kicker-dot" />
            TRANG CHỦ / HỒ SƠ CÁ NHÂN
          </span>
          <h1>HỒ SƠ CÁ NHÂN <em>&amp; BẢO MẬT CYBER</em></h1>
          <p>Quản lý thông tin không gian số, quyền hạn lễ hội và ví vé điện tử của bạn.</p>
        </div>
        <div className="profile-hero-badge" aria-label="Tài khoản đã xác thực">
          <strong>HỒ SƠ CÔNG KHAI</strong>
        </div>
      </header>

      <section className="profile-layout" aria-label="Thông tin hồ sơ">
        <aside className="profile-card profile-summary">
          <div className="profile-avatar-wrap">
            {avatarUrl ? (
              <img className="profile-avatar" src={avatarUrl} alt="" />
            ) : (
              <span className="profile-avatar profile-avatar-fallback">{initials}</span>
            )}
            <AvatarUploadField
              onUploaded={updateAvatar}
            />
          </div>
          <h2>{user?.name || "Người dùng EventHub"}</h2>
          <p className="profile-summary-email">{user?.email}</p>
          <span className="profile-role">
            <UserRound size={14} />
            {user?.roles.includes("ORGANIZER") ? "Ban tổ chức" : "Khán giả"}
          </span>
          <div className="profile-summary-divider" />
          <dl className="profile-meta">
            <div>
              <dt><CalendarDays size={15} /> Ngày tham gia</dt>
              <dd>{formatDate(user?.createdAt)}</dd>
            </div>
            <div>
              <dt><Ticket size={15} /> Sự kiện đã dự</dt>
              <dd>{tickets.loading ? "—" : tickets.data?.length ?? 0}</dd>
            </div>
          </dl>
        </aside>

        <div className="profile-content">
          <section className="profile-card profile-section">
            <div className="profile-section-heading">
              <div>
                <span className="profile-section-index">01 / IDENTITY</span>
                <h2>Thông tin cá nhân</h2>
              </div>
              <UserRound size={22} aria-hidden="true" />
            </div>
            <p className="profile-help">
              Cập nhật thông tin để trải nghiệm mua vé và check-in luôn chính xác.
            </p>
            <ActionForm
              className="profile-form"
              label="Lưu thay đổi"
              onSubmit={updateProfile}
            >
              <div className="profile-form-grid">
                <Field
                  label="Họ và tên"
                  name="name"
                  value={user?.name}
                  icon={<UserRound size={16} />}
                />
                <Field
                  label="Số điện thoại"
                  name="phone"
                  value={user?.phone}
                  required={false}
                  placeholder="Nhập số điện thoại"
                  icon={<Phone size={16} />}
                />
                <Field
                  label="Email"
                  name="email"
                  value={user?.email}
                  required={false}
                  placeholder="Nhập email"
                  icon={<Mail size={16} />}
                  disabled
                />
              </div>
            </ActionForm>
          </section>

          <section className="profile-card profile-section">
            <div className="profile-section-heading">
              <div>
                <span className="profile-section-index">02 / SECURITY</span>
                <h2>Bảo mật tài khoản</h2>
              </div>
              <KeyRound size={22} aria-hidden="true" />
            </div>
            <p className="profile-help">
              Đổi mật khẩu định kỳ để bảo vệ ví vé và dữ liệu cá nhân.
            </p>
            <ActionForm
              className="profile-form"
              label="Cập nhật mật khẩu"
              onSubmit={changePassword}
            >
              <div className="profile-form-grid">
                <Field
                  label="Mật khẩu hiện tại"
                  name="currentPassword"
                  type="password"
                  icon={<KeyRound size={16} />}
                />
                <Field
                  label="Mật khẩu mới"
                  name="newPassword"
                  type="password"
                  icon={<KeyRound size={16} />}
                />
                <Field
                  label="Nhập lại mật khẩu mới"
                  name="confirmPassword"
                  type="password"
                  icon={<KeyRound size={16} />}
                />
              </div>
            </ActionForm>
          </section>
        </div>
      </section>

      <Notice error={tickets.error} />
      {tickets.loading && <Loading />}
      <AuthFooter onNotice={setNotice} />
      {notice && <AuthToast message={notice} onClose={() => setNotice("")} />}
    </div>
  );
}
