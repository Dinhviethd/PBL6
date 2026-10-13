import type { Payment } from "./data";
export function checkoutUrl(value: string | null | undefined): string {
  const url = new URL(value ?? "");
  if (
    url.origin !== "https://sandbox.vnpayment.vn" ||
    url.pathname !== "/paymentv2/vpcpay.html" ||
    url.username ||
    url.password
  )
    throw new Error("Đường dẫn thanh toán VNPay không hợp lệ.");
  return url.href;
}
export function paymentMessage(payment?: Payment): string {
  if (!payment) return "";
  if (payment.requires_review)
    return "Giao dịch cần đối soát. Vui lòng liên hệ ban tổ chức.";
  if (payment.status === "FAILED")
    return "Thanh toán thất bại hoặc đã hủy. Bạn có thể thử lại nếu đơn còn hạn.";
  if (payment.status === "SUCCEEDED") return "Thanh toán đã được xác nhận.";
  return "Đang chờ xác nhận thanh toán. Bạn có thể cập nhật trạng thái sau khi thanh toán.";
}
