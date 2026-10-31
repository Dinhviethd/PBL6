import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  KeyRound,
  Mail,
  Menu,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { get, message, useLoad } from "@/features/ticketing/data";
import { useAuth } from "@/features/auth/stores/authStore";
import { OrganizerSidebar } from "./OrganizerSidebar";
import { OrganizerHeader } from "./OrganizerHeader";

const textKeys = [
  "organizationName",
  "businessName",
  "taxIdOrBusinessLicense",
  "contactName",
  "contactEmail",
  "contactPhone",
  "headOfficeAddress",
  "description",
  "websiteOrSocial",
  "logoUrl",
] as const;
type TextKey = (typeof textKeys)[number];
type Profile = Record<TextKey, string | null> & {
  ownerId: string;
  version: string | null;
  capabilities: { logo: boolean; legalReview: boolean };
  applicationStatus: string | null;
  initialized: boolean;
};
type Draft = Record<TextKey, string>;
type LegalRequest = {
  id: string;
  status: string;
  reason: string | null;
  created_at: string;
  requested_changes: Record<string, string>;
};
type Member = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  assignment_count: string;
};
type Team = {
  owner: { id: string; name: string; email: string; avatarUrl: string | null };
  items: Member[];
  hasNext: boolean;
};
type Assignment = {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  status: string;
  expires_at: string;
};
type EventChoice = {
  id: string;
  title: string;
  status: string;
  total_results: string;
};
const legalKeys: TextKey[] = ["businessName", "taxIdOrBusinessLicense"];
const draftOf = (p: Profile): Draft => ({
  ...(Object.fromEntries(textKeys.map((key) => [key, p[key] ?? ""])) as Record<
    TextKey,
    string
  >),
});
const stateLabel = (state: string) =>
  ({
    PENDING: "Chờ chấp nhận",
    ACTIVE: "Đã tham gia",
    DECLINED: "Đã từ chối",
    REVOKED: "Đã thu hồi",
    APPROVED: "Đã duyệt",
    REJECTED: "Bị từ chối",
  })[state] ?? state;
const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
  }).format(new Date(value));

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="b11-modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label="Đóng hộp thoại" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}

function EventPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [page, setPage] = useState(0);
  const events = useLoad<EventChoice[]>(
    `/organizer/events?page=${page}&limit=6`,
  );
  return (
    <>
      <label htmlFor="b11-event-choice">
        Chọn sự kiện để gửi lời mời check-in
      </label>
      {events.error && (
        <p role="alert">
          {events.error}
          <button type="button" onClick={events.reload}>
            Thử lại
          </button>
        </p>
      )}
      <select
        id="b11-event-choice"
        value={value}
        required
        disabled={disabled || events.loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Chọn sự kiện</option>
        {events.data
          ?.filter((e) => !["CANCELLED", "ARCHIVED"].includes(e.status))
          .map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
      </select>
      <div className="b11-pages">
        <button
          type="button"
          disabled={page === 0 || disabled}
          onClick={() => {
            setPage(page - 1);
            onChange("");
          }}
        >
          Trước
        </button>
        <span>Trang {page + 1}</span>
        <button
          type="button"
          disabled={
            disabled ||
            (page + 1) * 6 >= Number(events.data?.[0]?.total_results ?? 0)
          }
          onClick={() => {
            setPage(page + 1);
            onChange("");
          }}
        >
          Sau
        </button>
      </div>
    </>
  );
}
function TeamPanel() {
  const [page, setPage] = useState(0);
  const team = useLoad<Team>(`/organizer/team?page=${page}`);
  const [inviteOpen, setInviteOpen] = useState(false),
    [member, setMember] = useState<Member | null>(null),
    [email, setEmail] = useState(""),
    [eventId, setEventId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function invite(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/organizer/team", { email, eventId });
      setInviteOpen(false);
      setEmail("");
      setEventId("");
      team.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="b11-card" id="section-team">
      <div className="b11-section-heading">
        <div className="b11-section-title">
          <span className="b11-icon pink">
            <Users />
          </span>
          <div>
            <h2>2. Đội ngũ vận hành sự kiện</h2>
            <p>Nhân sự và lời mời check-in từ các sự kiện thuộc BTC.</p>
          </div>
        </div>
        <button
          className="b11-purple"
          onClick={() => {
            setError("");
            setInviteOpen(true);
          }}
        >
          <Plus size={16} />
          Thêm nhân sự kiểm soát vé
        </button>
      </div>
      {team.loading && <p role="status">Đang tải đội ngũ…</p>}
      {team.error && (
        <p role="alert" className="b11-error">
          {team.error}
          <button onClick={team.reload}>Thử lại</button>
        </p>
      )}
      {team.data && (
        <>
          <div className="b11-member">
            <span className="b11-avatar">
              <UserRound />
            </span>
            <div className="b11-member-info">
              <strong>{team.data.owner.name}</strong>
              <span className="b11-tag purple">Chủ tổ chức</span>
              <p>{team.data.owner.email}</p>
            </div>
          </div>
          {team.data.items.map((item) => (
            <div className="b11-member" key={item.id}>
              <span className="b11-avatar">
                <UserRound />
              </span>
              <div className="b11-member-info">
                <strong>{item.name}</strong>
                <span className="b11-tag">Nhân viên check-in</span>
                <p>
                  {item.email} · {item.assignment_count} phân công
                </p>
              </div>
              <button
                aria-label={`Phân công ${item.email}`}
                onClick={() => setMember(item)}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          ))}
          {!team.data.items.length && (
            <p>
              Chưa có phân công nhân sự. Chọn sự kiện và mời bằng email đã đăng
              ký.
            </p>
          )}
          <div className="b11-pages">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              Trang trước
            </button>
            <span>Trang {page + 1}</span>
            <button
              disabled={!team.data.hasNext}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
      <p className="b11-hint">
        Người nhận trả lời lời mời theo từng sự kiện tại{" "}
        <Link to="/organizer/team-invitations">Phân công check-in</Link>.
      </p>
      {inviteOpen && (
        <Modal
          title="Mời nhân sự check-in"
          onClose={() => !busy && setInviteOpen(false)}
        >
          <form onSubmit={invite}>
            <label htmlFor="b11-invite-email">Email tài khoản đã đăng ký</label>
            <input
              id="b11-invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <EventPicker
              value={eventId}
              onChange={setEventId}
              disabled={busy}
            />
            <p>
              Lời mời sử dụng luồng check-in hiện có của sự kiện, có hiệu lực 7
              ngày.
            </p>
            {error && (
              <p role="alert" className="b11-error">
                {error}
              </p>
            )}
            <button className="b11-primary" disabled={busy || !eventId}>
              Gửi lời mời
            </button>
          </form>
        </Modal>
      )}
      {member && (
        <AssignmentModal
          member={member}
          onClose={() => {
            setMember(null);
            team.reload();
          }}
        />
      )}
    </section>
  );
}
function AssignmentModal({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const assignments = useLoad<Assignment[]>(
    `/organizer/team/${member.id}/events`,
  );
  const [eventId, setEventId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(work: () => Promise<unknown>, close = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
      if (close) onClose();
      else assignments.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Phân công: ${member.name}`}
      onClose={() => !busy && onClose()}
    >
      <p>{member.email}</p>
      {error && (
        <p role="alert" className="b11-error">
          {error}
        </p>
      )}
      {assignments.error && (
        <p role="alert">
          {assignments.error}
          <button onClick={assignments.reload}>Thử lại</button>
        </p>
      )}
      {assignments.data?.map((a) => (
        <div className="b11-assignment" key={a.id}>
          <div>
            <strong>{a.title}</strong>
            <p>
              {a.status === "PENDING" && new Date(a.expires_at) <= new Date()
                ? "Lời mời hết hạn"
                : stateLabel(a.status)}
            </p>
          </div>
          {["PENDING", "ACTIVE"].includes(a.status) && (
            <button
              disabled={busy}
              onClick={() =>
                void act(() =>
                  api.delete(`/organizer/team/${member.id}/events/${a.id}`),
                )
              }
            >
              Thu hồi phân công
            </button>
          )}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void act(() =>
            api.post("/organizer/team", { eventId, email: member.email }),
          );
        }}
      >
        <EventPicker value={eventId} onChange={setEventId} disabled={busy} />
        <button className="b11-primary" disabled={busy || !eventId}>
          Mời check-in sự kiện
        </button>
      </form>
      <button
        className="b11-danger"
        disabled={busy}
        onClick={() => {
          if (
            window.confirm(
              "Thu hồi mọi phân công check-in của người này trong các sự kiện thuộc BTC?",
            )
          )
            void act(() => api.delete(`/organizer/team/${member.id}`), true);
        }}
      >
        Thu hồi tất cả phân công
      </button>
    </Modal>
  );
}

export function OrganizerProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null),
    [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [menu, setMenu] = useState(false),
    [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      id: string;
      event_id: string;
      order_code: string;
      buyer_name_snapshot: string;
    }[]
  >([]);
  const [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const requests = useLoad<LegalRequest[]>(
    "/organizer/profile/legal-requests?page=0",
  );
  const stats = useLoad<{ publishedEvents: number; servedTickets: string }>(
    "/organizer/profile/stats",
  );
  const notifications = useLoad<{ unreadCount: number }>(
    "/me/notifications/count",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const pending = requests.data?.find(
    (request) => request.status === "PENDING",
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    get<Profile>("/organizer/profile")
      .then((data) => {
        if (active) {
          setProfile(data);
          setDraft(draftOf(data));
        }
      })
      .catch((e) => {
        if (active) setLoadError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (!menu) return;
    const toggle = menuToggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const links = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(".b11-page .osb-sidebar a"),
      );
    links()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key === "Tab") {
        const targets = [...links(), toggle].filter(
          (item): item is HTMLElement => !!item,
        );
        const index = targets.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        targets[
          (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length
        ]?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      toggle?.focus();
    };
  }, [menu]);
  const locked = busy || uploading;
  const dirty =
    !!profile &&
    !!draft &&
    textKeys.some((key) => (profile[key] ?? "") !== draft[key]);
  const passwordDraft = !!(
    password.current ||
    password.next ||
    password.confirm
  );
  useEffect(() => {
    if (!dirty && !passwordDraft) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, passwordDraft]);
  function setField(key: TextKey, value: string) {
    setDraft((old) => (old ? { ...old, [key]: value } : old));
    setNotice("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (locked || !profile || !draft) return;
    setError("");
    setNotice("");
    const legalChanges = Object.fromEntries(
      legalKeys
        .filter((key) => draft[key].trim() !== (profile[key] ?? ""))
        .map((key) => [key, draft[key].trim()]),
    );
    const passwordChange = !!(
      password.current ||
      password.next ||
      password.confirm
    );
    if (Object.values(legalChanges).some((value) => !value)) {
      setError("Thông tin pháp nhân thay đổi không được để trống.");
      return;
    }
    if (Object.keys(legalChanges).length && pending) {
      setError(
        "Đã có yêu cầu pháp nhân chờ duyệt. Vui lòng chờ kết quả trước khi gửi thay đổi khác.",
      );
      return;
    }
    if (
      passwordChange &&
      (!password.current ||
        password.next !== password.confirm ||
        password.next.length < 8 ||
        new TextEncoder().encode(password.next).length > 72)
    ) {
      setError(
        "Nhập mật khẩu hiện tại, mật khẩu mới ít nhất 8 ký tự/tối đa 72 byte và xác nhận trùng khớp.",
      );
      return;
    }
    setBusy(true);
    let savedBrand = false,
      legalSent = false;
    try {
      let current = profile;
      const normalChanges = Object.fromEntries(
        textKeys
          .filter(
            (key) =>
              !legalKeys.includes(key) && draft[key] !== (profile[key] ?? ""),
          )
          .map((key) => [key, draft[key].trim() || null]),
      );
      if (Object.keys(normalChanges).length) {
        current = (
          await api.patch<{ data: Profile }>("/organizer/profile", {
            ...normalChanges,
            version: profile.version,
          })
        ).data.data;
        savedBrand = true;
        setProfile(current);
        // Preserve unsent legal draft if a later request fails.
        setDraft((previous) =>
          previous
            ? {
                ...draftOf(current),
                ...Object.fromEntries(
                  legalKeys.map((key) => [key, previous[key]]),
                ),
              }
            : draftOf(current),
        );
      }
      if (Object.keys(legalChanges).length) {
        await api.post("/organizer/profile/legal-requests", {
          version: current.version,
          changes: legalChanges,
        });
        legalSent = true;
        requests.reload();
        current = await get<Profile>("/organizer/profile");
        setProfile(current);
        setDraft(draftOf(current));
      } else setDraft(draftOf(current));
      if (passwordChange) {
        await api.post("/me/password", {
          currentPassword: password.current,
          newPassword: password.next,
        });
        setPassword({ current: "", next: "", confirm: "" });
        useAuth
          .getState()
          .clearAuth("Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.");
        navigate("/auth/login", { replace: true });
        return;
      }
      setNotice(
        legalSent
          ? "Đã lưu thông tin thương hiệu và gửi thay đổi pháp nhân để xét duyệt."
          : savedBrand
            ? "Thông tin hồ sơ đã được lưu."
            : "Không có thay đổi để lưu.",
      );
    } catch (e) {
      setError(
        `${savedBrand ? "Thông tin thương hiệu đã lưu. " : ""}${legalSent ? "Yêu cầu pháp nhân đã gửi. " : ""}${message(e)}`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (locked) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo tối đa 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const data = await api.post<{ data: { url: string } }>("/media", form);
      setField("logoUrl", data.data.data.url);
      setNotice("Logo đã tải lên. Bấm Lưu thay đổi để cập nhật hồ sơ BTC.");
    } catch (e) {
      setError(message(e));
    } finally {
      setUploading(false);
    }
  }
  function field(
    key: TextKey,
    label: string,
    maxLength: number,
    type = "text",
  ) {
    return (
      <div className="b11-field">
        <label htmlFor={`b11-${key}`}>{label}</label>
        <input
          id={`b11-${key}`}
          type={type}
          value={draft?.[key] ?? ""}
          maxLength={maxLength}
          disabled={
            locked ||
            !profile?.initialized ||
            (legalKeys.includes(key) &&
              (!profile?.capabilities.legalReview ||
                !!pending ||
                requests.loading ||
                !!requests.error))
          }
          onChange={(e) => setField(key, e.target.value)}
          autoComplete={type === "email" ? "email" : "off"}
        />
      </div>
    );
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    setSearchError("");
    setResults([]);
    setSearching(true);
    setSearched(false);
    try {
      setResults(
        await get(`/organizer/search?q=${encodeURIComponent(query.trim())}`),
      );
    } catch (e) {
      setSearchError(message(e));
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }
  const approvedLegal =
    profile?.applicationStatus === "APPROVED" ||
    requests.data?.some((request) => request.status === "APPROVED");
  return (
    <div className={`b11-page${menu ? " b11-menu-open" : ""}`}>
      <style>{styles}</style>
      <OrganizerSidebar active="Hồ sơ BTC" hideLiveSync />
      {menu && (
        <button
          className="b11-shade"
          aria-label="Đóng điều hướng"
          onClick={() => setMenu(false)}
        />
      )}
      <OrganizerHeader
        title="Hồ sơ BTC"
        menuButton={
          <button
            ref={menuToggleRef}
            className="b11-menu-toggle"
            aria-expanded={menu}
            aria-label={menu ? "Đóng menu" : "Mở menu"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        }
        searchSlot={
          <form className="b11-search" onSubmit={search}>
            <Search size={17} />
            <input
              aria-label="Tìm vé, đơn hàng, khách"
              placeholder="Tìm vé, đơn hàng, khách…"
              minLength={2}
              maxLength={100}
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="Tìm kiếm" disabled={searching}>
              <ChevronRight size={16} />
            </button>
            {searched && (
              <div className="b11-search-results">
                {searchError && <p role="alert">{searchError}</p>}
                {!searchError && results.length === 0 && (
                  <p role="status">
                    Không tìm thấy vé, đơn hàng hoặc khách phù hợp.
                  </p>
                )}
                {results.map((result) => (
                  <Link
                    key={result.id}
                    to={`/organizer/events/${result.event_id}/orders/${result.id}`}
                  >
                    {result.order_code}
                    <small>{result.buyer_name_snapshot}</small>
                  </Link>
                ))}
              </div>
            )}
          </form>
        }
        notificationSlot={
          <Link
            className="org-bell"
            to="/notifications"
            aria-label={`Thông báo${notifications.data?.unreadCount ? `, ${notifications.data.unreadCount} chưa đọc` : ""}`}
          >
            <Bell size={20} />
            {!!notifications.data?.unreadCount && (
              <span className="org-bell-dot" aria-hidden="true" />
            )}
          </Link>
        }
      />
      <main className="b11-main">
        <section className="b11-hero">
          <div>
            <div className="b11-badges">
              <span className="b11-tag">
                <BadgeCheck size={14} />
                {pending
                  ? "Thông tin pháp nhân chờ duyệt"
                  : approvedLegal
                    ? "Thông tin pháp nhân đã được duyệt"
                    : "Hồ sơ tổ chức chưa hoàn thiện"}
              </span>
              <span className="b11-muted">Quản lý thông tin tổ chức</span>
            </div>
            <h1>Hồ sơ Ban Tổ Chức &amp; Cài đặt Tài khoản</h1>
            <p>
              Quản lý pháp nhân, thương hiệu, đội ngũ check-in và bảo mật tài
              khoản.
            </p>
          </div>
          <div className="b11-hero-actions">
            <button
              className="b11-primary"
              disabled={locked || !draft}
              onClick={() => formRef.current?.requestSubmit()}
            >
              <Save size={17} />
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </section>
        {loading && (
          <p role="status" className="b11-card">
            Đang tải hồ sơ tổ chức…
          </p>
        )}
        {loadError && (
          <div role="alert" className="b11-card b11-error">
            {loadError}
            <button onClick={() => setAttempt(attempt + 1)}>Thử lại</button>
          </div>
        )}
        {profile && draft && !loading && (
          <div className="b11-grid">
            {!profile.initialized && (
              <div className="b11-card b11-error b11-span-all" role="status">
                Tài khoản chưa có hồ sơ tổ chức đã duyệt. Hồ sơ sẽ hiển thị khi được liên kết đúng
                tài khoản; phần nhân sự check-in và bảo mật vẫn sử dụng bình
                thường.
              </div>
            )}
            {profile.initialized &&
              Object.values(profile.capabilities).some((value) => !value) && (
                <p className="b11-card b11-span-all" role="status">
                  Logo tổ chức và tái duyệt chỉ được bật khi có trường dữ liệu
                  tương ứng được kích hoạt. Bạn vẫn có thể chỉnh sửa thông tin hiện có và quản lý nhân sự.
                </p>
              )}
            <aside className="b11-summary">
              <section className="b11-card b11-identity-card">
                <div className="b11-logo-wrap">
                  {draft.logoUrl ? (
                    <img
                      className="b11-org-logo"
                      src={draft.logoUrl}
                      alt="Logo tổ chức"
                    />
                  ) : (
                    <span className="b11-org-logo b11-logo-empty">
                      <Building2 size={42} />
                    </span>
                  )}
                  <label className="b11-logo-picker" title="Thay đổi logo BTC">
                    <Camera size={17} />
                    <input
                      aria-label="Thay đổi logo BTC"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={
                        locked ||
                        !profile.capabilities.logo ||
                        !profile.initialized
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <span className="b11-org-code">
                  BTC · {profile.ownerId.slice(0, 8).toUpperCase()}
                </span>
                <h2>
                  {profile.organizationName || "Tên tổ chức chưa cập nhật"}
                </h2>
                <p>
                  {profile.businessName ||
                    "Chưa có thông tin pháp nhân được duyệt"}
                </p>
                <div className="b11-contact">
                  <p>
                    <Mail size={15} />
                    {profile.contactEmail || "Chưa có email liên hệ"}
                  </p>
                  <p>
                    <Phone size={15} />
                    {profile.contactPhone || "Chưa có hotline"}
                  </p>
                </div>
                <div className="b11-kpis">
                  <div>
                    <strong>{stats.data?.publishedEvents ?? "—"}</strong>
                    <span>Sự kiện đã mở bán</span>
                  </div>
                  <div>
                    <strong>
                      {stats.data
                        ? BigInt(stats.data.servedTickets).toLocaleString(
                            "vi-VN",
                          )
                        : "—"}
                    </strong>
                    <span>Lượt vé phục vụ</span>
                  </div>
                </div>
                {stats.error && (
                  <p className="b11-error" role="alert">
                    {stats.error}
                    <button onClick={stats.reload}>Tải lại số liệu</button>
                  </p>
                )}
              </section>
              <section className="b11-card b11-index">
                <span className="b11-eyebrow">Điều hướng thiết lập</span>
                <a href="#section-identity">
                  <Building2 size={17} />
                  1. Thông tin pháp nhân &amp; Bio
                  <ChevronRight size={16} />
                </a>
                <a href="#section-team">
                  <Users size={17} />
                  2. Đội ngũ kiểm soát vé
                  <ChevronRight size={16} />
                </a>
                <a href="#section-security">
                  <KeyRound size={17} />
                  3. Bảo mật &amp; Mật khẩu
                  <ChevronRight size={16} />
                </a>
              </section>
            </aside>
            <div className="b11-content">
              <form id="b11-profile-form" ref={formRef} onSubmit={save}>
                <section className="b11-card" id="section-identity">
                  <div className="b11-section-heading">
                    <div className="b11-section-title">
                      <span className="b11-icon">
                        <Building2 />
                      </span>
                      <div>
                        <h2>1. Thông tin pháp nhân &amp; Thương hiệu</h2>
                        <p>
                          Thay đổi pháp nhân được gửi xét duyệt trước khi áp
                          dụng.
                        </p>
                      </div>
                    </div>
                    <ShieldCheck size={22} />
                  </div>
                  <div className="b11-form-grid">
                    {field(
                      "organizationName",
                      "Tên thương hiệu / Đơn vị tổ chức",
                      200,
                    )}
                    {field("businessName", "Tên doanh nghiệp / Pháp nhân", 200)}
                    {field(
                      "taxIdOrBusinessLicense",
                      "Mã số thuế / Giấy phép ĐKKD",
                      100,
                    )}
                    {field("contactName", "Người liên hệ", 150)}
                    {field(
                      "contactPhone",
                      "Số điện thoại điều hành (Hotline)",
                      30,
                      "tel",
                    )}
                    {field(
                      "contactEmail",
                      "Email liên hệ tổ chức",
                      254,
                      "email",
                    )}
                    <div className="b11-span-all">
                      {field(
                        "headOfficeAddress",
                        "Địa chỉ trụ sở / Văn phòng điều hành",
                        500,
                      )}
                    </div>
                  </div>
                  <div className="b11-field">
                    <label htmlFor="b11-description">
                      Giới thiệu tổ chức (Bio/About BTC)
                    </label>
                    <textarea
                      id="b11-description"
                      rows={4}
                      maxLength={4000}
                      disabled={locked || !profile.initialized}
                      value={draft.description}
                      onChange={(e) => setField("description", e.target.value)}
                    />
                    <div className="b11-field-meta">
                      <span>Thông tin giới thiệu của tổ chức</span>
                      <span>{draft.description.length}/4000 ký tự</span>
                    </div>
                  </div>
                  <div className="b11-field">
                    {field(
                      "websiteOrSocial",
                      "Kênh truyền thông · Website",
                      500,
                      "url",
                    )}
                  </div>
                  {requests.loading && (
                    <p role="status">Đang tải trạng thái xét duyệt…</p>
                  )}
                  {requests.error && (
                    <p role="alert" className="b11-error">
                      {requests.error}
                      <button type="button" onClick={requests.reload}>
                        Thử lại xét duyệt
                      </button>
                    </p>
                  )}
                  {pending && (
                    <p className="b11-hint">
                      Yêu cầu ngày {date(pending.created_at)} đang chờ duyệt.
                      Thông tin pháp nhân hiện tại giữ nguyên đến khi được chấp
                      thuận.
                    </p>
                  )}
                  {requests.data?.slice(0, 3).map((request) => (
                    <div className="b11-review" key={request.id}>
                      <span>
                        {date(request.created_at)} ·{" "}
                        {request.status === "PENDING"
                          ? "Chờ duyệt"
                          : stateLabel(request.status)}
                      </span>
                      {request.reason && <p>{request.reason}</p>}
                    </div>
                  ))}
                </section>
              </form>
              <TeamPanel />
              <section className="b11-card" id="section-security">
                <div className="b11-section-heading">
                  <div className="b11-section-title">
                    <span className="b11-icon">
                      <KeyRound />
                    </span>
                    <div>
                      <h2>3. Bảo mật &amp; Đổi mật khẩu tài khoản BTC</h2>
                      <p>
                        Đổi mật khẩu thành công sẽ đăng xuất các phiên hiện có.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="b11-passwords">
                  {(
                    [
                      ["current", "Mật khẩu hiện tại", "current-password"],
                      ["next", "Mật khẩu mới", "new-password"],
                      ["confirm", "Xác nhận mật khẩu", "new-password"],
                    ] as const
                  ).map(([key, label, auto]) => (
                    <div className="b11-field" key={key}>
                      <label htmlFor={`b11-password-${key}`}>{label}</label>
                      <input
                        id={`b11-password-${key}`}
                        form="b11-profile-form"
                        type="password"
                        autoComplete={auto}
                        disabled={locked}
                        value={password[key]}
                        onChange={(e) =>
                          setPassword({ ...password, [key]: e.target.value })
                        }
                        placeholder={key === "next" ? "Ít nhất 8 ký tự…" : ""}
                      />
                    </div>
                  ))}
                </div>
                <Link className="b11-hint" to="/organizer/team-invitations">
                  Xem lời mời tham gia đội ngũ BTC
                </Link>
              </section>
              {(error || notice) && (
                <div
                  className={`b11-feedback ${error ? "b11-error" : ""}`}
                  role={error ? "alert" : "status"}
                >
                  {error || notice}
                </div>
              )}
              <div className="b11-dock">
                <span>
                  <i />
                  {uploading
                    ? "Đang tải logo…"
                    : dirty
                      ? "Có thông tin chưa được lưu."
                      : "Thông tin hồ sơ đã sẵn sàng."}
                </span>
                <div>
                  <button
                    type="button"
                    className="b11-secondary"
                    disabled={locked}
                    onClick={() => {
                      setDraft(draftOf(profile));
                      setPassword({ current: "", next: "", confirm: "" });
                      setError("");
                      setNotice("");
                    }}
                  >
                    Hủy thay đổi
                  </button>
                  <button
                    form="b11-profile-form"
                    className="b11-primary"
                    disabled={locked}
                  >
                    <Check size={17} />
                    {busy ? "Đang lưu…" : "Lưu tất cả thiết lập"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function OrganizerTeamInvitationsPage() {
  const [page, setPage] = useState(0);
  const data = useLoad<
    {
      id: string;
      event_id: string;
      title: string;
      status: string;
      expires_at: string;
    }[]
  >(`/me/checkin-assignments?page=${page}`);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function respond(id: string, accept: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/me/checkin-invitations/${id}/respond`, { accept });
      data.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="b11-page b11-standalone">
      <style>{styles}</style>
      <main className="b11-main">
        <Link to="/">EventHub</Link>
        <section className="b11-card">
          <h1>Phân công check-in</h1>
          <p>Lời mời theo từng sự kiện, sử dụng luồng phân công hiện có.</p>
          {data.loading && <p role="status">Đang tải phân công…</p>}
          {(error || data.error) && <p role="alert">{error || data.error}</p>}
          {data.data?.map((item) => (
            <div className="b11-assignment" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{stateLabel(item.status)}</p>
              </div>
              {item.status === "PENDING" &&
                new Date(item.expires_at) > new Date() && (
                  <div className="b11-row-actions">
                    <button
                      disabled={busy}
                      onClick={() => void respond(item.id, false)}
                    >
                      Từ chối
                    </button>
                    <button
                      className="b11-primary"
                      disabled={busy}
                      onClick={() => void respond(item.id, true)}
                    >
                      Chấp nhận
                    </button>
                  </div>
                )}
              {item.status === "ACTIVE" && (
                <Link to={`/checkin/events/${item.event_id}`}>Mở check-in</Link>
              )}
            </div>
          ))}
          {data.data?.length === 0 && <p>Chưa có phân công.</p>}
          <div className="b11-pages">
            <button
              disabled={page === 0 || busy}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page + 1}</span>
            <button
              disabled={busy || (data.data?.length ?? 0) < 50}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
const styles = `
.b11-page {
  --b11-bg: #0f1222;
  --b11-card: #181b2a;
  --b11-low: #0a0d1c;
  --b11-high: #262939;
  --b11-cyan: #5de6ff;
  --b11-text: #e0e1f7;
  --b11-muted: #ccc3d8;
  min-height: 100vh;
  background: var(--b11-bg);
  color: var(--b11-text);
  font: 14px/1.6 'Be Vietnam Pro', sans-serif;
}
.b11-page *, .b11-modal * { box-sizing: border-box; }
.b11-page h1, .b11-page h2, .b11-modal h2 { font-family: Be Vietnam Pro, sans-serif; }
.b11-page h1 { margin: 12px 0 8px; font-size: clamp(25px, 2.3vw, 34px); line-height: 1.3; }
.b11-page h2 { margin: 0; font-size: 20px; line-height: 1.4; }
.b11-page p { margin: 6px 0; }
.b11-page a:not(.org-header a), .b11-modal a { color: var(--b11-cyan, #5de6ff); text-decoration: none; }
.b11-page .osb-sidebar a.osb-item { color: var(--osb-on-surface-variant); }
.b11-page .osb-sidebar a.osb-item:hover { color: var(--osb-on-surface); }
.b11-page .osb-sidebar a.osb-item.is-active { color: var(--osb-on-primary); }
.b11-page button, .b11-modal button, .b11-page .b11-primary, .b11-page .b11-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  border: 0; border-radius: 8px; background: #262939; color: #e0e1f7;
  padding: 10px 14px; font: 600 13px/1.4 'Space Grotesk', sans-serif; cursor: pointer;
}
.b11-page button:disabled, .b11-modal button:disabled { opacity: .48; cursor: not-allowed; }
.b11-page :focus-visible, .b11-modal :focus-visible { outline: 2px solid #5de6ff; outline-offset: 3px; }
.b11-page .b11-primary, .b11-modal .b11-primary { background: #5de6ff; color: #00363e; }
.b11-page .b11-purple { background: #7c3aed; color: #ede0ff; }
.b11-page .b11-primary:hover:not(:disabled), .b11-modal .b11-primary:hover:not(:disabled) { box-shadow: 0 0 18px #22d3ee40; }
.b11-page .org-header .org-create-btn { color: #00363e; }
.b11-page .org-header .org-identity {
  display: flex; align-items: center; gap: 8px; padding: 0 0 0 12px;
  border: 0; border-left: 1px solid #4a445566; border-radius: 0;
  background: transparent; color: #e0e1f7; box-shadow: none;
  font: inherit; text-align: left;
}
.b11-page .org-header .org-identity-dropdown a { color: #ccc3d8; }
.b11-page .org-header .org-identity-dropdown button {
  display: block; width: 100%; padding: 0.6rem 0.7rem; border-radius: 0.35rem;
  background: transparent; color: #ccc3d8; font: 500 12px/1.5 'Be Vietnam Pro', sans-serif;
  text-align: left;
}
.b11-page .org-header .org-identity-dropdown a:hover,
.b11-page .org-header .org-identity-dropdown button:hover { background: #262939; color: #f8fafc; }
.b11-search { position: relative; display: flex; align-items: center; gap: 8px; min-width: 100px; max-width: 300px; padding-left: 12px; border: 1px solid #4a445566; border-radius: 8px; background: #181b2a; }
.b11-page .b11-search input { border: 0; background: transparent; padding: 6px 0; width: 100%; min-width: 0; font-size: 12px; }
.b11-search-results { position: absolute; top: 100%; left: 0; width: 320px; max-width: 80vw; max-height: 360px; overflow: auto; padding: 12px; background: #262939; border: 1px solid #4a4455; box-shadow: 0 12px 30px #0008; }
.b11-search-results a { display: block; padding: 8px; }
.b11-search-results small { display: block; color: #ccc3d8; }
.b11-main { margin-left: 256px; padding: 88px 24px 32px; }
.b11-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px; margin-bottom: 24px; border-radius: 12px; background: radial-gradient(ellipse at 0 100%, #7c3aed26, transparent 55%), radial-gradient(ellipse at 100% 0, #5de6ff18, transparent 50%), #181b2a; }
.b11-hero > div:first-child { min-width: 0; }
.b11-hero p, .b11-section-title p { color: #b4adbf; font-size: 13px; }
.b11-badges { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; font-size: 11px; }
.b11-hero-actions { display: flex; gap: 12px; flex-wrap: wrap; flex-shrink: 0; justify-content: flex-end; max-width: 290px; }
.b11-grid { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr); gap: 24px; }
.b11-card { padding: 24px; border-radius: 12px; background: #181b2a; box-shadow: 0 2px 14px #0002; }
.b11-content, .b11-summary { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.b11-content form { margin: 0; }
.b11-identity-card { text-align: center; background: linear-gradient(130deg, #7c3aed14, transparent 45%, #5de6ff0c), #181b2a; }
.b11-identity-card h2 { overflow-wrap: anywhere; font-size: 24px; text-transform: uppercase; margin-top: 8px; }
.b11-identity-card > p { color: #ccc3d8; }
.b11-logo-wrap { position: relative; display: inline-flex; margin: 0 0 12px; }
.b11-org-logo { width: 96px; height: 96px; object-fit: cover; border-radius: 16px; border: 2px solid #d2bbff66; box-shadow: 0 0 22px #7c3aed40; }
.b11-logo-empty { display: flex; align-items: center; justify-content: center; color: #5de6ff; background: #0a0d1c; }
.b11-logo-picker { position: absolute; right: -7px; bottom: -5px; display: flex; padding: 8px; border-radius: 8px; background: #5de6ff; color: #00363e; cursor: pointer; }
.b11-logo-picker input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.b11-logo-picker:focus-within { outline: 2px solid #5de6ff; outline-offset: 4px; }
.b11-org-code { display: block; font: 11px 'Space Grotesk', sans-serif; color: #d2bbff; }
.b11-contact { display: flex; flex-direction: column; gap: 7px; text-align: left; margin-top: 20px; padding: 16px; border-radius: 8px; background: #0a0d1c; overflow-wrap: anywhere; }
.b11-contact p { display: flex; align-items: flex-start; gap: 9px; margin: 0; }
.b11-contact p svg { flex-shrink: 0; margin-top: 4px; color: #5de6ff; }
.b11-eyebrow { display: block; font: 11px 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: .04em; color: #aaa3b4; }
.b11-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; text-align: left; }
.b11-kpis > div { padding: 12px; background: #1c1f2f; border-radius: 8px; }
.b11-kpis strong { display: block; color: #5de6ff; font: 700 24px Be Vietnam Pro, sans-serif; overflow-wrap: anywhere; }
.b11-kpis > div:last-child strong { color: #d2bbff; }
.b11-kpis span { display: block; font-size: 11px; margin-top: 5px; color: #b4adbf; }
.b11-index { padding: 16px; }
.b11-index a { display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; color: #ccc3d8; font: 12px 'Space Grotesk', sans-serif; margin-top: 6px; }
.b11-index a:first-of-type { background: #262939; color: #5de6ff; }
.b11-index a svg:last-child { margin-left: auto; flex-shrink: 0; }
.b11-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.b11-section-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
.b11-icon { display: inline-flex; padding: 10px; border-radius: 8px; color: #d2bbff; background: #7c3aed26; flex-shrink: 0; }
.b11-icon.pink { color: #ffafd3; background: #ae397b40; }
.b11-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.b11-span-all { grid-column: 1 / -1; }
.b11-field { margin-bottom: 16px; min-width: 0; }
.b11-form-grid .b11-field { margin-bottom: 0; }
.b11-form-grid { margin-bottom: 16px; }
.b11-page label:not(.b11-logo-picker), .b11-modal label { display: block; margin-bottom: 6px; font: 500 12px/1.6 'Space Grotesk', sans-serif; }
.b11-page input, .b11-page textarea, .b11-modal input, .b11-modal select {
  display: block; width: 100%; min-width: 0; padding: 11px 12px; border-radius: 8px;
  border: 1px solid transparent; background: #0a0d1c; color: #e0e1f7; font: 13px/1.5 'Be Vietnam Pro', sans-serif;
}
.b11-page textarea { resize: vertical; min-height: 120px; }
.b11-page input:disabled { opacity: .55; }
.b11-field-meta { display: flex; justify-content: space-between; gap: 16px; font-size: 10px; color: #aaa3b4; margin-top: 5px; }
.b11-member { display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #1c1f2f; }
.b11-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #5de6ff; }
.b11-member-info { flex: 1; min-width: 0; }
.b11-member-info strong { font-size: 12px; margin-right: 8px; }
.b11-member-info p { font-size: 11px; overflow-wrap: anywhere; color: #aaa3b4; }
.b11-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 7px; border-radius: 5px; color: #5de6ff; background: #5de6ff15; font: 600 10px/1.5 'Space Grotesk', sans-serif; }
.b11-tag.purple { color: #d2bbff; background: #7c3aed40; }
.b11-muted, .b11-hint { color: #aaa3b4; font-size: 12px; }
.b11-hint { margin-top: 14px !important; }
.b11-passwords { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.b11-review { font-size: 11px; border-top: 1px solid #4a445544; padding: 8px 0; }
.b11-review p { color: #ffb4ab; }
.b11-dock { position: sticky; bottom: 16px; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-radius: 12px; background: #1c1f2ff5; backdrop-filter: blur(16px); box-shadow: 0 6px 25px #0005; }
.b11-dock > span { display: flex; align-items: center; gap: 9px; font-size: 12px; }
.b11-dock i { width: 7px; height: 7px; border-radius: 50%; background: #5de6ff; flex-shrink: 0; }
.b11-dock > div, .b11-pages, .b11-row-actions { display: flex; align-items: center; gap: 8px; }
.b11-pages { justify-content: flex-end; margin: 12px 0; font-size: 11px; }
.b11-feedback { border: 1px solid #5de6ff55; border-radius: 8px; padding: 14px; background: #181b2a; }
.b11-error { color: #ffb4ab !important; overflow-wrap: anywhere; }
.b11-error button { margin-left: 8px; }
.b11-modal { width: 580px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow-y: auto; padding: 24px; border: 1px solid #4a4455; border-radius: 12px; background: #181b2a; color: #e0e1f7; font: 14px/1.6 'Be Vietnam Pro', sans-serif; }
.b11-modal::backdrop { background: #080b1acc; backdrop-filter: blur(4px); }
.b11-modal header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.b11-modal h2 { font-size: 20px; margin: 0; }
.b11-modal p { font-size: 12px; color: #ccc3d8; }
.b11-modal form { margin-top: 20px; }
.b11-modal select { margin-bottom: 12px; }
.b11-modal .b11-danger { margin-top: 24px; color: #ffb4ab; border: 1px solid #ffb4ab55; }
.b11-assignment { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #4a445555; }
.b11-assignment strong { overflow-wrap: anywhere; }
.b11-page .b11-menu-toggle, .b11-shade { display: none; }
.b11-standalone .b11-main { margin: 0 auto; max-width: 1000px; padding-top: 32px; }
.b11-standalone .b11-card { margin-top: 20px; }
.b11-page section[id] { scroll-margin-top: 85px; }
@media (max-width: 1280px) {
  .b11-page .org-breadcrumb { display: none; }
  .b11-section-heading { flex-wrap: wrap; }
  .b11-hero { align-items: flex-start; }
  .b11-grid { grid-template-columns: minmax(210px, 1fr) minmax(0, 2fr); gap: 16px; }
  .b11-card { padding: 18px; }
  .b11-member { flex-wrap: wrap; }
  .b11-passwords { grid-template-columns: 1fr; }
}
@media (max-width: 1050px) {
  .b11-grid { grid-template-columns: 1fr; }
  .b11-summary { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: 16px; }
  .b11-hero { flex-direction: column; gap: 16px; }
  .b11-hero-actions { max-width: none; justify-content: flex-start; }
}
@media (max-width: 900px) {
  .b11-main { margin-left: 0; }
  .b11-page .b11-menu-toggle { display: inline-flex; padding: 6px; }
  .b11-menu-open .osb-sidebar { display: flex; top: 64px; z-index: 40; }
  .b11-page .b11-shade { display: block; position: fixed; inset: 64px 0 0; border-radius: 0; background: #0009; z-index: 39; }
}
@media (max-width: 600px) {
  .b11-main { padding: 80px 16px 24px; }
  .b11-page .org-header { padding: 0 12px; gap: 6px; }
  .b11-page .org-header-left, .b11-page .org-header-right { gap: 6px; }
  .b11-page .org-identity-menu { display: none; }
  .b11-search { max-width: 230px; }
  .b11-page .b11-search input { font-size: 11px; }
  .b11-hero { padding: 18px; }
  .b11-hero-actions { width: 100%; }
  .b11-hero-actions > * { flex: 1; font-size: 11px !important; }
  .b11-summary { display: flex; }
  .b11-grid { gap: 16px; }
  .b11-content { gap: 16px; }
  .b11-form-grid { grid-template-columns: 1fr; }
  .b11-section-title { align-items: flex-start; }
  .b11-section-title h2 { font-size: 18px; }
  .b11-member-info { min-width: 140px; }
  .b11-dock { flex-direction: column; align-items: stretch; bottom: 8px; padding: 12px; gap: 10px; }
  .b11-dock > div { justify-content: flex-end; }
  .b11-dock button { font-size: 11px; }
  .b11-assignment { flex-wrap: wrap; }
}
`;
