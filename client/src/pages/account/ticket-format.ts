export const ticketDate = (value?: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(value))
    : "Chưa có thông tin";
