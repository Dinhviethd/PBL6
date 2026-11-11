// DTO returned by GET /me/order-history. No web runtime imports in native code.
export type HistoryData = {
  items: {
    id: string;
    order_code: string;
    event_title_snapshot: string;
    status: string;
    total_amount: string;
    created_at: string;
    items: { quantity: number }[];
    payment: { unresolvedReview: boolean };
    tickets: { issued: number; expected: number; checkedIn: number };
    actions: { canViewTickets: boolean };
  }[];
  pagination: { total: number; totalPages: number };
  summary: { totalAmount: string; processing: number };
  counts: { all: number; paid: number; processing: number; closed: number };
};
