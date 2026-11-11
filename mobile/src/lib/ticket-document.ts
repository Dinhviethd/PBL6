export type PrintableTicket = {
  code: string;
  eventTitle: string;
  typeName: string;
  status: string;
  qrImage?: string | null;
  buyerName?: string;
  venueName?: string;
  startsAt?: string;
};
export const escapeHtml = (text: string) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function ticketDocument(tickets: PrintableTicket[]) {
  if (!tickets.length) throw new Error("Chưa có vé để xuất.");
  if (tickets.some((t) => !["VALID", "CHECKED_IN"].includes(t.status)))
    throw new Error("Chỉ xuất vé hợp lệ hoặc đã check-in.");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vé EventHub</title><style>@page{size:A5;margin:14mm}body{font-family:Arial,sans-serif;color:#10162B}article{break-after:page;text-align:center}article:last-child{break-after:auto}h1{font-size:24px}p{line-height:1.5}img{width:240px;height:240px}.code{font-size:20px;font-weight:bold}</style></head><body>${tickets.map((t) => `<article><p>EVENTHUB · VÉ ĐIỆN TỬ</p><h1>${escapeHtml(t.eventTitle)}</h1><p>${escapeHtml(t.typeName)}</p>${t.buyerName ? `<p>${escapeHtml(t.buyerName)}</p>` : ""}${t.startsAt ? `<p>${escapeHtml(new Date(t.startsAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }))}</p>` : ""}${t.venueName ? `<p>${escapeHtml(t.venueName)}</p>` : ""}${t.qrImage && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(t.qrImage) ? `<img alt="Mã QR vé" src="${t.qrImage}">` : "<p>Mã QR không khả dụng</p>"}<p class="code">${escapeHtml(t.code)}</p><p>${t.status === "CHECKED_IN" ? "Vé đã check-in" : "Xuất trình tại cửa vào. Mỗi vé chỉ sử dụng một lần."}</p><p>Không chia sẻ vé công khai. Trạng thái vé được kiểm tra tại cửa vào.</p></article>`).join("")}</body></html>`;
}
