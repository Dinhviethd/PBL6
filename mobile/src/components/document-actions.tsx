import { useState } from "react";
import { View } from "react-native";
import { exportTickets } from "../lib/document-export";
import type { PrintableTicket } from "../lib/ticket-document";
import { errorMessage } from "../lib/data";
import { api } from "../lib/api";
import { Button, Notice } from "./ui";
export function TicketDocumentActions({
  load,
}: {
  load: () => Promise<PrintableTicket[]>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(print: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    const generation = api.sessionVersion();
    try {
      await exportTickets(
        await load(),
        print,
        () => generation === api.sessionVersion(),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Notice error text={error} />
      <Button
        title={busy ? "Đang chuẩn bị vé…" : "Lưu / chia sẻ vé PDF"}
        disabled={busy}
        onPress={() => void run(false)}
      />
      <Button
        title="In vé"
        secondary
        disabled={busy}
        onPress={() => void run(true)}
      />
    </View>
  );
}
