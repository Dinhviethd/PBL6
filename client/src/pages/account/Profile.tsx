import { Link } from "react-router-dom";
import { ActionForm } from "@/components/ticketing/action-form";
import { Field, ImageField, PageHead, Status } from "@/components/ticketing/shared";
import api from "@/lib/api";
import authService from "@/features/auth/services/authService";
import { useAuth } from "@/features/auth/stores/authStore";
import { useLoad } from "@/features/ticketing/data";
import type { Application } from "@/features/ticketing/types";

export function Profile() {
  const user = useAuth((s) => s.user),
    r = useLoad<Application[]>("/me/organizer-applications");
  return (
    <>
      <PageHead eyebrow="TÀI KHOẢN" title="Thông tin của bạn" />
      <div className="two-cols">
        <section className="panel">
          <h2>Hồ sơ cá nhân</h2>
          <ActionForm
            onSubmit={async (d) => {
              await api.patch("/me", {
                ...d,
                avatarUrl: d.avatarUrl || undefined,
              });
              await authService.getCurrentUser();
            }}
          >
            <Field label="Họ tên" name="name" value={user?.name} />
            <Field
              label="Số điện thoại"
              name="phone"
              value={user?.phone}
              required={false}
            />
            <ImageField
              label="Ảnh đại diện"
              name="avatarUrl"
              value={user?.avatarUrl}
            />
          </ActionForm>
          <h2 className="section-gap">Đổi mật khẩu</h2>
          <ActionForm
            label="Đổi mật khẩu và đăng xuất"
            onSubmit={async (d) => {
              await api.post("/me/password", d);
              useAuth.getState().clearAuth();
            }}
          >
            <Field
              label="Mật khẩu hiện tại"
              name="currentPassword"
              type="password"
            />
            <Field label="Mật khẩu mới" name="newPassword" type="password" />
          </ActionForm>
        </section>
        <section className="panel">
          <h2>Trở thành Organizer</h2>
          <p className="muted">
            Chia sẻ ý tưởng của bạn và tạo nên những cuộc gặp ý nghĩa.
          </p>
          {r.data?.map((a) => (
            <div className="application" key={a.id}>
              <strong>{a.organization_name}</strong>
              <Status value={a.status} />
              {a.rejection_reason && <p>{a.rejection_reason}</p>}
            </div>
          ))}
          {!user?.roles.includes("ORGANIZER") &&
            !r.data?.some((a) => a.status === "PENDING") && (
              <ActionForm
                label="Gửi yêu cầu"
                onSubmit={async (d) => {
                  await api.post("/me/organizer-applications", d);
                  r.reload();
                }}
              >
                <Field label="Tên tổ chức" name="organizationName" />
                <Field
                  label="Người liên hệ"
                  name="contactName"
                  value={user?.name}
                />
                <Field
                  label="Email liên hệ"
                  name="contactEmail"
                  type="email"
                  value={user?.email}
                />
                <Field label="Số điện thoại" name="contactPhone" />
                <Field
                  label="Giới thiệu tổ chức"
                  name="description"
                  type="textarea"
                />
              </ActionForm>
            )}
          {user?.roles.includes("ORGANIZER") && (
            <Link className="btn primary" to="/organizer">
              Đến trang quản lý sự kiện →
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
