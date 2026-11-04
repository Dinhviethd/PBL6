import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { message, useLoad } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { AdminShell } from "./AdminShell";

type Administrator = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  locked: boolean;
  lockReason: string | null;
  roles: string[];
  permissions: string[];
  manager: boolean;
  version: string;
};

type Catalog = {
  canManage: boolean;
  roles: {
    code: string;
    name: string;
    permissions: { code: string; name: string }[];
  }[];
};

type Administrators = {
  items: Administrator[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type PaymentInformation = {
  sepay: {
    configured: boolean;
    enabled: boolean;
    environment: "test" | "live" | null;
    bankCode: string | null;
    accountNumber: string | null;
    accountName: string | null;
    transferContent: string | null;
    webhookUrl: string | null;
  };
  vnpay: {
    configured: boolean;
    enabled: boolean;
    environment: "sandbox";
    merchantCode: string | null;
    checkoutUrl: string;
    returnUrl: string | null;
    ipnUrl: string | null;
  };
};

function DataField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="c12-data-field">
      <dt>{label}</dt>
      <dd>{value || "Chưa cấu hình"}</dd>
    </div>
  );
}

function GatewayCard({
  title,
  icon,
  configured,
  enabled,
  children,
}: {
  title: string;
  icon: ReactNode;
  configured: boolean;
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <article className="c12-gateway">
      <div className="c12-gateway-heading">
        <span className="c12-gateway-icon">{icon}</span>
        <div>
          <h3>{title}</h3>
          <span className={`c12-badge${enabled ? " is-active" : ""}`}>
            {enabled
              ? "ĐANG KÍCH HOẠT"
              : configured
                ? "ĐÃ CẤU HÌNH · CHƯA KÍCH HOẠT"
                : "CHƯA CẤU HÌNH"}
          </span>
        </div>
      </div>
      <dl>{children}</dl>
    </article>
  );
}

export function C12Setting() {
  const userId = useAuth((state) => state.user?.idUser);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [success, setSuccess] = useState("");
  const payment = useLoad<PaymentInformation>(
    "/admin/settings/payment-information",
  );
  const catalog = useLoad<Catalog>("/admin/administrators/catalog");
  const list = useLoad<Administrators>(
    `/admin/administrators?${new URLSearchParams({ q: search, page: String(page), limit: "10" })}`,
  );
  const canManage =
    catalog.data?.canManage === true && !catalog.loading && !catalog.error;
  const loading = payment.loading || catalog.loading || list.loading;
  const pagination = list.data?.pagination;

  function reload() {
    setSuccess("");
    payment.reload();
    catalog.reload();
    list.reload();
  }

  function searchAdmins(event: FormEvent) {
    event.preventDefault();
    setSearch(query.trim());
    setPage(0);
    setSuccess("");
  }

  return (
    <AdminShell title="Cấu hình hệ thống">
      <div className="c12-page">
        <header className="c12-page-heading">
          <div>
            <p className="c12-eyebrow">
              TÀI CHÍNH & VẬN HÀNH <span>/ CẤU HÌNH HỆ THỐNG</span>
            </p>
            <h1>Cấu hình hệ thống & cổng thanh toán</h1>
            <p>
              Thông tin kết nối thanh toán và phân quyền quản trị viên EventHub.
            </p>
          </div>
          <button className="c12-button" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "c12-spin" : ""} />
            Làm mới
          </button>
        </header>

        {success && (
          <div className="c12-success" role="status">
            {success}
          </div>
        )}

        <section aria-labelledby="c12-payment-title">
          <div className="c12-section-heading">
            <div>
              <h2 id="c12-payment-title">
                <span className="c12-dot" />
                Cổng thanh toán
              </h2>
              <p>
                Thông tin cấu hình hiện tại. Trạng thái kích hoạt không biểu thị
                kết quả kiểm tra kết nối ngân hàng.
              </p>
            </div>
            <span className="c12-readonly">CHỈ ĐỌC</span>
          </div>
          {payment.loading ? (
            <p role="status">Đang tải thông tin thanh toán…</p>
          ) : payment.error ? (
            <div className="c12-error" role="alert">
              {payment.error}
              <button className="c12-button" onClick={payment.reload}>
                Thử lại
              </button>
            </div>
          ) : (
            payment.data && (
              <div className="c12-gateway-grid">
                <GatewayCard
                  title="VietQR / SePay (MBBank)"
                  icon={<QrCode size={26} />}
                  configured={payment.data.sepay.configured}
                  enabled={payment.data.sepay.enabled}
                >
                  <DataField
                    label="Môi trường"
                    value={
                      payment.data.sepay.environment === "live"
                        ? "Live"
                        : payment.data.sepay.environment === "test"
                          ? "Test"
                          : null
                    }
                  />
                  <DataField
                    label="Ngân hàng"
                    value={payment.data.sepay.bankCode}
                  />
                  <DataField
                    label="Tài khoản thu hộ"
                    value={payment.data.sepay.accountNumber}
                  />
                  <DataField
                    label="Tên tài khoản"
                    value={payment.data.sepay.accountName}
                  />
                  <DataField
                    label="Nội dung chuyển khoản"
                    value={payment.data.sepay.transferContent}
                  />
                  <DataField
                    label="Webhook URL"
                    value={payment.data.sepay.webhookUrl}
                  />
                </GatewayCard>
                <GatewayCard
                  title="VNPay Sandbox"
                  icon={<CreditCard size={26} />}
                  configured={payment.data.vnpay.configured}
                  enabled={payment.data.vnpay.enabled}
                >
                  <DataField
                    label="Môi trường"
                    value="Sandbox · Thanh toán thử nghiệm"
                  />
                  <DataField
                    label="Mã merchant (TMN)"
                    value={payment.data.vnpay.merchantCode}
                  />
                  <DataField
                    label="URL thanh toán Sandbox"
                    value={payment.data.vnpay.checkoutUrl}
                  />
                  <DataField
                    label="Return URL"
                    value={payment.data.vnpay.returnUrl}
                  />
                  <DataField
                    label="IPN URL"
                    value={payment.data.vnpay.ipnUrl}
                  />
                </GatewayCard>
              </div>
            )
          )}
        </section>

        <section className="c12-admin-card" aria-labelledby="c12-admin-title">
          <div className="c12-section-heading">
            <div>
              <h2 id="c12-admin-title">
                <span className="c12-dot" />
                Quản trị viên & phân quyền
              </h2>
              <p>
                ADMIN truy cập khu quản trị. Quản lý quản trị viên được phép
                cấp, thu hồi quyền và khóa tài khoản.
              </p>
            </div>
            {canManage && (
              <button
                className="c12-button c12-primary"
                onClick={() => setEditor({ id: null })}
              >
                <UserPlus size={16} />
                Thêm quản trị viên
              </button>
            )}
          </div>
          {catalog.error && (
            <div className="c12-error" role="alert">
              {catalog.error}
              <button className="c12-button" onClick={catalog.reload}>
                Tải lại quyền
              </button>
            </div>
          )}
          <form className="c12-search" onSubmit={searchAdmins}>
            <label htmlFor="c12-search">Tìm quản trị viên</label>
            <div>
              <input
                id="c12-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={200}
                placeholder="Tên hoặc email"
              />
              <button className="c12-button" type="submit">
                <Search size={16} />
                Tìm kiếm
              </button>
            </div>
          </form>
          {list.loading ? (
            <p role="status">Đang tải quản trị viên…</p>
          ) : list.error ? (
            <div className="c12-error" role="alert">
              {list.error}
              <button className="c12-button" onClick={list.reload}>
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <div
                className="c12-table-scroll"
                role="region"
                aria-label="Danh sách quản trị viên"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>QUẢN TRỊ VIÊN / THÔNG TIN</th>
                      <th>VAI TRÒ</th>
                      <th>QUYỀN QUẢN LÝ ADMIN</th>
                      <th>TRẠNG THÁI</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data?.items.map((admin) => (
                      <tr key={admin.id}>
                        <td>
                          <div className="c12-identity">
                            <span className="c12-avatar" aria-hidden="true">
                              {admin.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <strong>
                                {admin.name}
                                {admin.id === userId && <small> (Bạn)</small>}
                              </strong>
                              <span>{admin.email}</span>
                              <span>
                                {admin.phone || "Chưa có số điện thoại"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="c12-roles">
                            {admin.roles.map((role) => (
                              <span className="c12-badge" key={role}>
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={admin.manager ? "c12-accent" : ""}>
                            {admin.manager
                              ? "Có quyền quản lý"
                              : "Không có quyền quản lý"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`c12-badge${!admin.locked && admin.status === "ACTIVE" ? " is-active" : ""}`}
                          >
                            {admin.locked
                              ? "ĐÃ KHÓA"
                              : admin.status === "ACTIVE"
                                ? "HOẠT ĐỘNG"
                                : "NGỪNG HOẠT ĐỘNG"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="c12-button"
                            onClick={() => setEditor({ id: admin.id })}
                          >
                            {canManage && admin.id !== userId
                              ? "Chỉnh sửa"
                              : "Xem chi tiết"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!list.data?.items.length && (
                      <tr>
                        <td colSpan={5} className="c12-empty">
                          Không tìm thấy quản trị viên phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="c12-pagination">
                <span>
                  {pagination?.total ?? 0} quản trị viên · Trang {page + 1}/
                  {Math.max(1, pagination?.totalPages ?? 0)}
                </span>
                <div>
                  <button
                    className="c12-button"
                    aria-label="Trang trước"
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="c12-button"
                    aria-label="Trang tiếp"
                    disabled={!pagination || page + 1 >= pagination.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
        {editor && (
          <AdministratorEditor
            key={editor.id ?? "grant"}
            id={editor.id}
            userId={userId}
            canManage={canManage}
            catalog={catalog.data}
            onClose={() => setEditor(null)}
            onSaved={() => {
              setEditor(null);
              setSuccess(
                "Đã cập nhật quyền quản trị viên. Tài khoản được thay đổi cần đăng nhập lại.",
              );
              setPage(0);
              list.reload();
              catalog.reload();
            }}
          />
        )}
      </div>
      <style>{styles}</style>
    </AdminShell>
  );
}

function AdministratorEditor({
  id,
  userId,
  canManage,
  catalog,
  onClose,
  onSaved,
}: {
  id: string | null;
  userId: string | undefined;
  canManage: boolean;
  catalog: Catalog | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [record, setRecord] = useState<Administrator | null>(null);
  const [email, setEmail] = useState("");
  const [admin, setAdmin] = useState(true);
  const [manager, setManager] = useState(false);
  const [locked, setLocked] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [version, setVersion] = useState(0);
  const busy = useRef(false);
  const readOnly = !canManage || id === userId;

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError("");
    api
      .get<{ data: Administrator }>(`/admin/administrators/${id}`)
      .then((response) => {
        if (!active) return;
        const value = response.data.data;
        setRecord(value);
        setAdmin(true);
        setManager(value.manager);
        setLocked(value.locked || value.status !== "ACTIVE");
        setReason("");
        setConflict(false);
      })
      .catch((error) => {
        if (active) setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, version]);

  const dirty =
    !id ||
    Boolean(
      record &&
      (!admin ||
        manager !== record.manager ||
        locked !== (record.locked || record.status !== "ACTIVE")),
    );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || readOnly || conflict || (id && !record)) return;
    if (
      id &&
      !window.confirm(
        `Lưu thay đổi quyền/trạng thái của ${record!.email}? Tài khoản sẽ phải đăng nhập lại.`,
      )
    )
      return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      if (id) {
        await api.patch(`/admin/administrators/${id}`, {
          version: record!.version,
          admin,
          manager: admin && manager,
          locked,
          reason: reason.trim(),
        });
      } else {
        await api.post("/admin/administrators", {
          email: email.trim(),
          manager,
        });
      }
      onSaved();
    } catch (error) {
      setError(message(error));
      // Re-read before retrying edits, including lost/ambiguous responses.
      if (id) setConflict(true);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy.current) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="c12-overlay" />
        <Dialog.Content
          className="c12-dialog"
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <Dialog.Title>
            <ShieldCheck size={21} />
            {id ? "Quyền quản trị viên" : "Thêm quản trị viên"}
          </Dialog.Title>
          <Dialog.Description>
            {id
              ? "Xem và cập nhật quyền của tài khoản quản trị."
              : "Cấp quyền cho tài khoản đã đăng ký bằng email."}
          </Dialog.Description>
          <Dialog.Close
            className="c12-dialog-close c12-button"
            aria-label="Đóng"
            disabled={pending}
          >
            <X size={18} />
          </Dialog.Close>
          {error && (
            <div className="c12-error" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <p role="status">Đang tải chi tiết…</p>
          ) : id && !record ? (
            <button
              className="c12-button"
              onClick={() => setVersion((value) => value + 1)}
            >
              Tải lại chi tiết
            </button>
          ) : (
            <form onSubmit={save} className="c12-editor-form">
              {record ? (
                <div className="c12-editor-identity">
                  <strong>{record.name}</strong>
                  <span>{record.email}</span>
                  <span>{record.phone || "Chưa có số điện thoại"}</span>
                  {record.lockReason && (
                    <span>Lý do khóa: {record.lockReason}</span>
                  )}
                </div>
              ) : (
                <label>
                  Email tài khoản
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={pending}
                    autoComplete="off"
                  />
                </label>
              )}
              <fieldset disabled={readOnly || pending || conflict}>
                <legend>Vai trò và quyền</legend>
                <label className="c12-checkbox">
                  <input
                    type="checkbox"
                    checked={admin}
                    disabled={!id}
                    onChange={(event) => {
                      setAdmin(event.target.checked);
                      if (!event.target.checked) setManager(false);
                    }}
                  />
                  ADMIN — Truy cập khu quản trị
                </label>
                <label className="c12-checkbox">
                  <input
                    type="checkbox"
                    checked={manager}
                    disabled={!admin}
                    onChange={(event) => setManager(event.target.checked)}
                  />
                  {catalog?.roles.find((role) => role.code === "ADMIN_MANAGER")
                    ?.name ?? "Quản lý quản trị viên"}
                </label>
                <p className="c12-help">
                  {catalog?.roles
                    .find((role) => role.code === "ADMIN_MANAGER")
                    ?.permissions.map((permission) => permission.name)
                    .join(", ") ||
                    "Quyền cấp, thu hồi ADMIN và khóa/mở tài khoản quản trị."}
                </p>
                {id && (
                  <label className="c12-checkbox">
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={(event) => setLocked(event.target.checked)}
                    />
                    Khóa tài khoản
                  </label>
                )}
                {id && (
                  <label>
                    Lý do thay đổi
                    <textarea
                      required
                      minLength={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                    />
                  </label>
                )}
              </fieldset>
              {readOnly && (
                <p className="c12-help">
                  {id === userId
                    ? "Bạn không thể thay đổi quyền hoặc khóa chính mình."
                    : "Tài khoản của bạn chỉ được xem thông tin quản trị viên."}
                </p>
              )}
              {record && (
                <p className="c12-help">
                  Vai trò hiện tại: {record.roles.join(", ")}.{" "}
                  {record.permissions.length
                    ? `Quyền: ${record.permissions.join(", ")}.`
                    : ""}{" "}
                  Các vai trò khác được giữ khi thu hồi ADMIN.
                </p>
              )}
              <div className="c12-editor-actions">
                {conflict && (
                  <button
                    className="c12-button"
                    type="button"
                    onClick={() => setVersion((value) => value + 1)}
                  >
                    Tải lại trước khi thử lại
                  </button>
                )}
                <button
                  className="c12-button"
                  type="button"
                  disabled={pending}
                  onClick={onClose}
                >
                  Đóng
                </button>
                {!readOnly && (
                  <button
                    className="c12-button c12-primary"
                    type="submit"
                    disabled={
                      pending ||
                      loading ||
                      conflict ||
                      !dirty ||
                      Boolean(id && reason.trim().length < 3)
                    }
                  >
                    {pending
                      ? "Đang lưu…"
                      : id
                        ? "Lưu thay đổi"
                        : "Cấp quyền ADMIN"}
                  </button>
                )}
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const styles = `
.c12-page {
  min-width: 0;
  padding: 28px 24px 48px;
  color: #e0e1f7;
  font: 14px/1.6 'Be Vietnam Pro', sans-serif;
}
.c12-page-heading, .c12-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.c12-page-heading {
  padding-bottom: 20px;
  border-bottom: 1px solid #262939;
}
.c12-eyebrow {
  color: #958da1;
  font: 600 10px/1.7 'Space Grotesk', sans-serif;
  letter-spacing: .08em;
}
.c12-eyebrow span, .c12-accent {
  color: #5de6ff;
}
.c12-page h1 {
  margin: 8px 0;
  font: 700 28px/1.35 Be Vietnam Pro, 'Be Vietnam Pro', sans-serif;
}
.c12-page p, .c12-dialog p {
  color: #ccc3d8;
  margin: 6px 0 14px;
}
.c12-page h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font: 700 22px/1.4 Be Vietnam Pro, 'Be Vietnam Pro', sans-serif;
}
.c12-dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #5de6ff;
  box-shadow: 0 0 10px #5de6ff88;
}
.c12-readonly {
  color: #958da1;
  white-space: nowrap;
  font: 600 11px 'Space Grotesk', sans-serif;
}
.c12-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid #313445;
  border-radius: 8px;
  background: #262939;
  color: #e0e1f7;
  font: 600 12px/1.4 'Be Vietnam Pro', sans-serif;
  cursor: pointer;
  flex-shrink: 0;
}
.c12-button:hover:not(:disabled) {
  background: #313445;
  border-color: #5de6ff;
}
.c12-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.c12-primary {
  background: #7c3aed;
  border-color: #7c3aed;
  color: #fff;
}
.c12-button.c12-primary:hover:not(:disabled) {
  background: #6d28d9;
}
.c12-gateway-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.c12-gateway {
  min-width: 0;
  padding: 20px;
  border: 1px solid #262939;
  border-radius: 12px;
  background: #181b2a;
}
.c12-gateway-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.c12-gateway-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #262939;
  color: #5de6ff;
}
.c12-gateway h3 {
  margin: 0 0 6px;
  font: 700 18px/1.4 Be Vietnam Pro, 'Be Vietnam Pro', sans-serif;
}
.c12-badge {
  display: inline-block;
  padding: 3px 7px;
  border: 1px solid #4a4455;
  border-radius: 5px;
  color: #ccc3d8;
  font: 600 10px/1.5 'Space Grotesk', sans-serif;
}
.c12-badge.is-active {
  color: #5de6ff;
  border-color: #5de6ff44;
  background: #00cbe615;
}
.c12-gateway dl {
  display: grid;
  gap: 8px;
  margin: 0;
}
.c12-data-field {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #1c1f2f;
}
.c12-data-field dt {
  flex: 0 0 36%;
  color: #b3aabd;
  font-size: 11px;
}
.c12-data-field dd {
  min-width: 0;
  margin: 0;
  text-align: right;
  overflow-wrap: anywhere;
  font: 500 12px/1.6 'Space Grotesk', sans-serif;
}
.c12-admin-card {
  min-width: 0;
  margin-top: 28px;
  padding: 24px;
  border-radius: 12px;
  background: #181b2a;
}
.c12-search {
  margin: 0 0 18px;
}
.c12-search label, .c12-editor-form label {
  display: block;
  margin-bottom: 6px;
  color: #e0e1f7;
  font-size: 12px;
}
.c12-search>div {
  display: flex;
  gap: 8px;
  max-width: 460px;
}
.c12-search input, .c12-editor-form input:not([type=checkbox]), .c12-editor-form textarea {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #4a4455;
  border-radius: 8px;
  background: #0f1222;
  color: #e0e1f7;
  font: inherit;
}
.c12-editor-form input:not([type=checkbox]), .c12-editor-form textarea {
  display: block;
  margin-top: 6px;
}
.c12-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}
.c12-page table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  text-align: left;
}
.c12-page th {
  padding: 14px 12px;
  background: #262939;
  color: #b3aabd;
  font: 600 10px/1.6 'Space Grotesk', sans-serif;
}
.c12-page td {
  padding: 18px 12px;
  border-bottom: 1px solid #313445;
  font-size: 12px;
}
.c12-page tbody tr:hover {
  background: #1c1f2f;
}
.c12-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}
.c12-identity>div, .c12-editor-identity {
  display: grid;
  gap: 3px;
  overflow-wrap: anywhere;
}
.c12-identity span:not(.c12-avatar) {
  color: #b3aabd;
  font-size: 11px;
}
.c12-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #7c3aed;
  color: #fff;
  font: 700 18px Be Vietnam Pro, sans-serif;
}
.c12-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.c12-pagination, .c12-pagination>div, .c12-editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.c12-pagination {
  padding-top: 18px;
  color: #b3aabd;
  font-size: 12px;
}
.c12-empty {
  padding: 32px !important;
  text-align: center;
}
.c12-error, .c12-success {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid #ffb4ab44;
  border-radius: 8px;
  color: #ffb4ab;
  background: #93000a20;
}
.c12-success {
  color: #5de6ff;
  border-color: #5de6ff44;
  background: #00cbe612;
}
.c12-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #03040bd9;
}
.c12-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 101;
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100dvh - 40px);
  overflow: auto;
  transform: translate(-50%, -50%);
  padding: 24px;
  border: 1px solid #4a4455;
  border-radius: 12px;
  background: #181b2a;
  color: #e0e1f7;
  font: 14px/1.6 'Be Vietnam Pro', sans-serif;
}
.c12-dialog h2 {
  display: flex;
  gap: 10px;
  margin: 0 36px 8px 0;
  font: 700 22px/1.4 Be Vietnam Pro, 'Be Vietnam Pro', sans-serif;
}
.c12-dialog-close {
  position: absolute;
  top: 14px;
  right: 14px;
}
.c12-editor-form fieldset {
  display: grid;
  gap: 12px;
  margin: 18px 0;
  padding: 16px;
  border: 1px solid #4a4455;
  border-radius: 8px;
}
.c12-editor-form legend {
  padding: 0 6px;
  color: #5de6ff;
}
.c12-editor-form .c12-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}
.c12-checkbox input {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  accent-color: #7c3aed;
}
.c12-dialog .c12-help {
  margin: 0 0 8px;
  color: #b3aabd;
  font-size: 12px;
}
.c12-editor-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 20px;
}
.c12-page :focus-visible, .c12-dialog :focus-visible {
  outline: 2px solid #5de6ff;
  outline-offset: 3px;
}
.c12-spin {
  animation: c12-spin 1s linear infinite;
}
@keyframes c12-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .c12-spin { animation: none; }
}
@media (max-width: 1100px) {
  .c12-gateway-grid { grid-template-columns: minmax(0, 1fr); }
  .c12-section-heading { align-items: flex-start; flex-wrap: wrap; }
}
@media (max-width: 600px) {
  .c12-page { padding: 20px 16px 32px; }
  .c12-page-heading { align-items: flex-start; flex-wrap: wrap; }
  .c12-page h1 { font-size: 24px; }
  .c12-page h2 { font-size: 20px; }
  .c12-gateway, .c12-admin-card { padding: 16px; }
  .c12-data-field { flex-direction: column; gap: 4px; }
  .c12-data-field dd { text-align: left; }
  .c12-pagination { align-items: flex-start; flex-wrap: wrap; }
  .c12-dialog { padding: 20px 16px; }
}
`;
