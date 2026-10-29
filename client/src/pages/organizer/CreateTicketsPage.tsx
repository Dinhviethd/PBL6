import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, CalendarDays, ChevronDown, Download, Layers, Pencil, Plus, Search, Send, Shield, Ticket, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { get, message, money } from '@/features/ticketing/data';
import { useAuth } from '@/features/auth/stores/authStore';
import type { Event, TicketType } from '@/features/ticketing/types';
import { Status } from '@/components/ticketing/shared';
import { OrganizerSidebar } from './OrganizerSidebar';
import { emptyTicketForm, ticketForm, ticketPayload, ticketState, ticketTime, type TicketForm } from './create-tickets-data';
import './create-tickets.css';

export function CreateTicketsPage() {
  const { id = '' } = useParams();
  const userId = useAuth(s => s.user?.idUser);
  return <TicketEditor key={`${userId}:${id}`} id={id} />;
}

function TicketEditor({ id }: { id: string }) {
  const user = useAuth(s => s.user);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [form, setForm] = useState<TicketForm>({ ...emptyTicketForm });
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState('active');
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState(0);
  const alive = useRef(false), locked = useRef(false), generation = useRef(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const url = `/organizer/events/${id}`;
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setLoadError('');
    try {
      const data = await get<Event>(url);
      if (alive.current && request === generation.current) setEvent(data);
    } catch (failure) {
      if (alive.current && request === generation.current) setLoadError(message(failure));
    } finally {
      if (alive.current && request === generation.current) setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    alive.current = true;
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { alive.current = false; window.clearInterval(timer); };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(0), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const developing = () => setToast(Date.now());
  const editable = Boolean(event && ['DRAFT', 'REJECTED'].includes(event.status));
  const disabled = busy || loading || Boolean(loadError) || !editable;
  const types = event?.ticketTypes ?? [];
  const active = types.filter(t => !t.archived_at);
  const visible = filter === 'all' ? types : types.filter(t => filter === 'archived' ? Boolean(t.archived_at) : !t.archived_at);
  const dirty = Object.values(form).some(Boolean);
  function reset() { setForm({ ...emptyTicketForm }); setEditing(null); setError(''); }
  function start(t?: TicketType) {
    if (disabled || (dirty && !window.confirm('Bỏ các thay đổi chưa lưu trong biểu mẫu?'))) return;
    setForm(t ? ticketForm(t) : { ...emptyTicketForm }); setEditing(t?.id ?? null); setError('');
    nameInput.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nameInput.current?.focus({ preventScroll: true });
  }
  async function mutate(action: () => Promise<unknown>, success: string, clearForm = false) {
    if (locked.current || disabled) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await action();
      if (!alive.current) return;
      if (clearForm) reset();
      setNotice(success);
      await load();
    } catch (failure) {
      if (alive.current) { setError(message(failure)); await load(); }
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event || disabled) return;
    try {
      const payload = ticketPayload(form, event, types.find(t => t.id === editing));
      void mutate(() => editing ? api.patch(`${url}/ticket-types/${editing}`, payload) : api.post(`${url}/ticket-types`, payload), editing ? 'Đã cập nhật loại vé.' : 'Đã thêm loại vé.', true);
    } catch (failure) { setError(message(failure)); }
  }
  function archive(t: TicketType) {
    if (!window.confirm(`Ngừng dùng loại vé “${t.name}”? Loại vé được lưu trữ và không có thao tác bật lại.`)) return;
    void mutate(() => api.delete(`${url}/ticket-types/${t.id}`), 'Đã ngừng dùng loại vé.', editing === t.id);
  }
  function submit() {
    if (!active.length || dirty || !window.confirm('Gửi sự kiện cho Admin phê duyệt? Bạn sẽ không thể chỉnh sửa loại vé khi đang chờ duyệt.')) return;
    void mutate(() => api.post(`${url}/submit`, {}), 'Đã gửi sự kiện cho Admin phê duyệt.');
  }
  const update = (name: keyof TicketForm, value: string) => { setForm(f => ({ ...f, [name]: value })); setError(''); };
  return <div className="ct-page">
    <OrganizerSidebar active="Quản lý loại vé" />
    <div className="ct-body">
      <header className="ct-header">
        <nav aria-label="Đường dẫn"><Link to="/organizer"><ArrowLeft size={16} /> Ban Tổ Chức</Link><span>/</span><span>Quản lý loại vé</span></nav>
        <button className="ct-search" onClick={developing}><Search size={17} />Tìm vé, đơn hàng, khách…</button>
        <div className="ct-account"><Link className="ct-button" to="/organizer/new"><Plus size={16} />Tạo sự kiện</Link><Link to="/notifications" aria-label="Thông báo"><Bell size={20} /></Link><Link to="/profile">{user?.name}</Link></div>
      </header>
      <div className="ct-content">
        <div className="ct-heading"><div><span className="ct-kicker">PHÂN KHÚC & ĐIỀU PHỐI</span><h1>Quản lý loại vé & Sức chứa</h1><p>Cấu hình các hạng vé, số lượng và thời gian mở bán.</p></div><button className="ct-button ct-gradient" disabled={disabled} onClick={() => start()}><Plus size={18} />Thêm loại vé mới</button></div>
        {loading && <p role="status">Đang tải dữ liệu sự kiện…</p>}
        {loadError && <div className="ct-error" role="alert">{loadError}<p>Bảng chưa được đồng bộ. Hãy tải lại trước khi tiếp tục.</p><button className="ct-button" disabled={busy} onClick={() => void load()}>Thử tải lại</button></div>}
        {error && <p className="ct-error" role="alert">{error}</p>}
        {notice && <p className="ct-notice" role="status">{notice}</p>}
        {event && <>
          <div className="ct-event"><button className="ct-event-selector" onClick={developing} aria-label="Chọn sự kiện"><span><small>SỰ KIỆN ĐANG CẤU HÌNH</small><strong>{event.title}</strong></span><ChevronDown size={18} /></button><button className="ct-button" onClick={developing} aria-label="Xuất báo cáo vé"><Download size={18} /></button><Status value={event.status} /></div>
          {!editable && <p className="ct-notice">Chỉ được chỉnh sửa loại vé khi sự kiện ở bản nháp hoặc bị từ chối.</p>}
          <div className="ct-grid">
            <section className="ct-card">
              <div className="ct-card-title"><Ticket size={24} /><div><h2>{editing ? 'Chỉnh sửa loại vé' : 'Thêm loại vé mới cho sự kiện'}</h2><p>Thông tin và hạn mức phát hành · Giờ Việt Nam (GMT+7)</p></div></div>
              <form onSubmit={save} aria-label="Thông tin loại vé" aria-busy={busy}>
                <fieldset disabled={disabled}>
                  <div className="ct-fields"><label>Tên loại vé <b>*</b><input ref={nameInput} name="name" value={form.name} onChange={e => update('name', e.target.value)} maxLength={100} required placeholder="Nhập tên loại vé…" /></label>
                  <label>Đơn giá (VNĐ) <b>*</b><input name="price" type="text" inputMode="numeric" pattern="[1-9][0-9]{0,14}" value={form.price} onChange={e => update('price', e.target.value)} required placeholder="250000" /></label>
                  <label>Tổng số lượng phát hành <b>*</b><input name="capacity" type="number" min={1} max={1000000} step={1} value={form.capacity} onChange={e => update('capacity', e.target.value)} required placeholder="100" /></label></div>
                  <div className="ct-fields"><label>Bắt đầu mở bán <b>*</b><input name="saleStartsAt" type="datetime-local" value={form.saleStartsAt} onChange={e => update('saleStartsAt', e.target.value)} required /></label>
                  <label>Kết thúc mở bán <b>*</b><input name="saleEndsAt" type="datetime-local" value={form.saleEndsAt} onChange={e => update('saleEndsAt', e.target.value)} required /></label></div>
                  <label>Mô tả loại vé <span>(không bắt buộc)</span><textarea name="description" rows={3} maxLength={2000} value={form.description} onChange={e => update('description', e.target.value)} /></label>
                  <div className="ct-actions"><button type="button" className="ct-button" onClick={() => { if (!dirty || window.confirm('Bỏ nội dung chưa lưu?')) reset(); }}>Hủy bỏ</button><button className="ct-button ct-primary" type="submit">{busy ? 'Đang lưu…' : editing ? 'Lưu loại vé' : 'Thêm loại vé'}</button></div>
                </fieldset>
              </form>
            </section>
            <aside className="ct-side">
            <section className="ct-card ct-policy"><h2><Shield size={22} />Chính sách bảo vệ & Chống phe vé</h2><p className="ct-coming">Đang phát triển</p><button onClick={developing}>Giới hạn danh tính <span aria-hidden="true">›</span></button><button onClick={developing}>Quy định hoàn tiền <span aria-hidden="true">›</span></button><button onClick={developing}>Chính sách chuyển nhượng <span aria-hidden="true">›</span></button></section>
            <section className="ct-card ct-preview" aria-label="Xem trước loại vé">
              <div className="ct-preview-label">XEM TRƯỚC LOẠI VÉ</div>
              <div className="ct-pass">{event.cover_image_url && <img src={event.cover_image_url} alt="Ảnh bìa sự kiện" />}<div><span className="ct-badge">{form.name || 'Tên loại vé'}</span><h2>{event.title}</h2><p><CalendarDays size={14} />{ticketTime(event.starts_at)}</p><p>{event.venue_name}</p><strong>{/^[1-9]\d{0,14}$/.test(form.price) ? money(form.price) : 'Chưa nhập giá'}</strong><p className="ct-description">{form.description}</p></div></div>
              <p>Hình xem trước theo thông tin đang nhập. Lưu loại vé để cập nhật bảng bên dưới.</p>
            </section></aside>
          </div>
          <section className="ct-table-card" aria-label="Danh sách loại vé" aria-busy={loading}>
            <div className="ct-table-heading"><div><h2><Layers size={21} />Các loại vé của sự kiện</h2><p>Đã lưu {active.length} loại vé đang sử dụng.</p><button className="ct-text-button" onClick={developing}>Đồng bộ sau 5 giây</button></div><div className="ct-filters"><button className="ct-button" onClick={() => setFilter('all')}>Tất cả ({types.length})</button><button className="ct-text-button" onClick={developing}>Đang mở bán</button><button className="ct-text-button" onClick={developing}>Sắp hết</button><label>Hiển thị<select aria-label="Hiển thị" value={filter} onChange={e => setFilter(e.target.value)}><option value="active">Đang sử dụng</option><option value="archived">Đã ngừng dùng</option><option value="all">Tất cả</option></select></label></div></div>
            <div className="ct-table-scroll" tabIndex={0} role="region" aria-label="Bảng loại vé, có thể cuộn ngang"><table><thead><tr>{['Loại vé', 'Đơn giá', 'Phát hành & Đã bán', 'Khung giờ mở bán (GMT+7)', 'Trạng thái', 'Thao tác'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
              {visible.map(t => <tr key={t.id}><td><strong>{t.name}</strong><p className="ct-description">{t.description}</p><button className="ct-text-button" onClick={developing}>Vùng vé & Đặc quyền</button></td><td className="ct-price">{money(t.price_amount)}</td><td><span>{t.sold_quantity} / {t.capacity} vé</span><progress max={t.capacity} value={t.sold_quantity} aria-label={`Đã bán ${t.name}`} /><small>Đang giữ: {t.reserved_quantity}<br />Khả dụng: {Math.max(0, t.capacity - t.sold_quantity - t.reserved_quantity)}</small></td><td>{ticketTime(t.sale_starts_at)}<small>đến {ticketTime(t.sale_ends_at)}</small></td><td><span className="ct-badge">{ticketState(t, event, now)}</span></td><td><div className="ct-row-actions"><button className="ct-button" disabled={disabled || Boolean(t.archived_at)} onClick={() => start(t)} aria-label={`Sửa ${t.name}`} title="Chỉnh sửa"><Pencil size={16} /></button><button className="ct-button" disabled={disabled || Boolean(t.archived_at) || t.sold_quantity + t.reserved_quantity > 0} onClick={() => archive(t)} aria-label={`Ngừng dùng ${t.name}`} title={t.sold_quantity + t.reserved_quantity > 0 ? 'Không thể ngừng dùng loại vé đã bán hoặc đang giữ' : 'Ngừng dùng'}><Trash2 size={16} /></button></div></td></tr>)}
              {!visible.length && <tr><td colSpan={6} className="ct-empty">{types.length ? 'Không có loại vé phù hợp bộ lọc.' : 'Chưa có loại vé. Thêm loại vé đầu tiên ở biểu mẫu bên trên.'}</td></tr>}
            </tbody></table></div>
          </section>
          <footer className="ct-submit"><p>{dirty ? 'Lưu hoặc hủy nội dung biểu mẫu trước khi gửi duyệt.' : active.length ? 'Gửi thông tin sự kiện và các loại vé đã lưu cho Admin phê duyệt.' : 'Cần ít nhất một loại vé đang sử dụng để gửi duyệt.'}</p><button className="ct-button ct-gradient" disabled={disabled || !active.length || dirty} onClick={submit}><Send size={18} />Gửi Admin phê duyệt</button></footer>
        </>}
      </div>
    </div>
    {toast > 0 && <div className="ct-toast" role="status">Chức năng đang được phát triển<button onClick={() => setToast(0)} aria-label="Đóng thông báo"><X size={18} /></button></div>}
  </div>;
}
