import { Platform } from "react-native";
import { ticketDocument, type PrintableTicket } from "./ticket-document";

const ensureCurrent = (isCurrent: () => boolean) => {
  if (!isCurrent())
    throw new Error("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.");
};
export async function exportTickets(
  tickets: PrintableTicket[],
  print = false,
  isCurrent = () => true,
) {
  ensureCurrent(isCurrent);
  const html = ticketDocument(tickets);
  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (!win) throw new Error("Cho phép mở cửa sổ in để lưu vé PDF.");
    win.opener = null;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
    return;
  }
  const Print = await import("expo-print");
  ensureCurrent(isCurrent);
  if (print) {
    await Print.printAsync({ html });
    return;
  }
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Thiết bị chưa hỗ trợ chia sẻ tệp. Hãy dùng chức năng in.");
  const { uri } = await Print.printToFileAsync({ html });
  ensureCurrent(isCurrent);
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Lưu hoặc chia sẻ vé EventHub",
  });
}

export async function exportCsv(
  text: string,
  name: string,
  isCurrent = () => true,
) {
  ensureCurrent(isCurrent);
  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-${Date.now()}.csv`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Thiết bị chưa hỗ trợ chia sẻ tệp CSV.");
  const { File, Paths } = await import("expo-file-system");
  ensureCurrent(isCurrent);
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Lưu hoặc chia sẻ báo cáo",
  });
}
