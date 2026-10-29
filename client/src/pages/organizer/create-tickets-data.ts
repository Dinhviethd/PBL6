import type { Event, TicketType } from '@/features/ticketing/types';
import { eventInstant } from './create-event-data';

export const emptyTicketForm = { name: '', description: '', price: '', capacity: '', saleStartsAt: '', saleEndsAt: '' };
export type TicketForm = typeof emptyTicketForm;
export const vietnamInput = (value: string) => new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
export const ticketTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
export function ticketForm(t: TicketType): TicketForm {
  return { name: t.name, description: t.description ?? '', price: t.price_amount, capacity: String(t.capacity), saleStartsAt: vietnamInput(t.sale_starts_at), saleEndsAt: vietnamInput(t.sale_ends_at) };
}
export function ticketPayload(form: TicketForm, event: Event, edited?: TicketType) {
  const name = form.name.trim();
  if (!name || name.length > 100) throw new Error('Tên loại vé phải có từ 1 đến 100 ký tự.');
  if (!/^[1-9]\d{0,14}$/.test(form.price) || BigInt(form.price) > 900719925474099n) throw new Error('Giá vé phải là số nguyên từ 1 đến 900.719.925.474.099 đồng.');
  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000000) throw new Error('Số lượng phải là số nguyên từ 1 đến 1.000.000.');
  if (edited && capacity < edited.sold_quantity + edited.reserved_quantity) throw new Error('Số lượng không được thấp hơn tổng vé đã bán và đang giữ.');
  const saleStartsAt = eventInstant(form.saleStartsAt), saleEndsAt = eventInstant(form.saleEndsAt);
  if (Date.parse(saleStartsAt) >= Date.parse(saleEndsAt)) throw new Error('Kết thúc mở bán phải sau bắt đầu mở bán.');
  if (Date.parse(saleEndsAt) > Date.parse(event.ends_at)) throw new Error('Kết thúc mở bán không được sau thời gian kết thúc sự kiện.');
  if (form.description.length > 2000) throw new Error('Mô tả tối đa 2.000 ký tự.');
  return { name, description: form.description.trim(), price: form.price, capacity, saleStartsAt, saleEndsAt };
}
export function ticketState(t: TicketType, e: Event, now: number) {
  if (t.archived_at) return 'Đã ngừng dùng';
  if (e.status === 'DRAFT' || e.status === 'REJECTED') return 'Bản nháp';
  if (e.status === 'PENDING_REVIEW') return 'Chờ phê duyệt';
  if (e.status !== 'PUBLISHED') return 'Chưa mở bán';
  if (now >= Date.parse(e.ends_at) || now >= Date.parse(t.sale_ends_at)) return 'Đã kết thúc';
  if (e.sales_paused) return 'Tạm ngừng bán';
  if (now < Date.parse(t.sale_starts_at)) return 'Chưa đến giờ bán';
  if (t.capacity - t.sold_quantity - t.reserved_quantity <= 0) return 'Hết chỗ khả dụng';
  return 'Đang mở bán';
}
