export interface Category {
  id: string;
  name: string;
  slug: string;
}
export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price_amount: string;
  capacity: number;
  reserved_quantity: number;
  sold_quantity: number;
  sale_starts_at: string;
  sale_ends_at: string;
  archived_at?: string;
}
export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  category_id: string;
  organizer_id: string;
  cover_image_url?: string;
  venue_name: string;
  address: string;
  city_code: string;
  starts_at: string;
  ends_at: string;
  checkin_opens_at: string;
  checkin_closes_at: string;
  status: string;
  sales_paused: boolean;
  priceFrom?: string;
  ticketTypes?: TicketType[];
  organizer?: { name: string };
  reviews?: { decision: string; reason: string; created_at: string }[];
}
export interface Order {
  id: string;
  order_code: string;
  event_id: string;
  event_title_snapshot: string;
  buyer_name_snapshot: string;
  status: string;
  total_amount: string;
  total_quantity: number;
  expires_at: string;
  created_at: string;
  items?: {
    ticket_type_name_snapshot: string;
    quantity: number;
    line_total: string;
  }[];
  payment?: Payment;
}
export interface Payment {
  id: string;
  order_id: string;
  merchant_reference: string;
  status: string;
  amount: string;
  created_at: string;
  requires_review: boolean;
  review_reason?: string;
}
export interface Ticket {
  id: string;
  event_id: string;
  ticket_code: string;
  status: string;
  event_title_snapshot: string;
  ticket_type_name_snapshot: string;
  buyer_name_snapshot?: string;
  buyer_email_snapshot?: string;
  checked_in_at?: string;
}
export interface TicketDetail {
  id: string;
  eventId: string;
  code: string;
  status: string;
  eventTitle: string;
  typeName: string;
  qrImage: string;
}
export interface Application {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  status: string;
  rejection_reason?: string;
}
export interface Account {
  idUser: string;
  name: string;
  email: string;
  status: string;
  locked_at?: string;
}
export type Stats = Record<string, string | number>;
