import { Image, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  stateLabel,
  useResource,
  when,
  type TicketDetail,
} from "../../lib/data";
import { useSession } from "../../lib/session";
import { api } from "../../lib/api";
import { TicketDocumentActions } from "../../components/document-actions";
import {
  Loading,
  Notice,
  RequireAuth,
  Screen,
  ui,
  colors,
} from "../../components/ui";
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user } = useSession(),
    r = useResource<TicketDetail>(user ? `/me/tickets/${id}` : null);
  return (
    <RequireAuth>
      <Screen refresh={r.reload} loading={r.loading}>
        <Notice error text={r.error} />
        {r.loading ? (
          <Loading />
        ) : (
          r.data && (
            <View style={ui.card}>
              <Text style={ui.badge}>{stateLabel(r.data.status)}</Text>
              <Text style={ui.title}>{r.data.eventTitle}</Text>
              <Text style={ui.text}>{r.data.typeName}</Text>
              {r.data.event && (
                <>
                  <Text style={ui.text}>{when(r.data.event.starts_at)}</Text>
                  <Text style={ui.muted}>
                    {r.data.event.venue_name} · {r.data.event.address}
                  </Text>
                </>
              )}
              {r.data.checkedInAt && (
                <Notice
                  text={`Vé đã được sử dụng lúc ${when(r.data.checkedInAt)}.`}
                />
              )}
              {r.data.status === "VOID" && (
                <Notice
                  error
                  text={`Vé đã hủy và không thể sử dụng.${r.data.voidReason ? ` ${r.data.voidReason}` : ""}`}
                />
              )}
              {r.data.status !== "VOID" && (
                <View
                  testID="ticket-qr-panel"
                  style={{
                    padding: 18,
                    backgroundColor: colors.white,
                    borderRadius: 18,
                    width: "100%",
                    maxWidth: 356,
                    alignSelf: "center",
                  }}
                >
                  <Image
                    accessibilityLabel="Mã QR của vé"
                    source={{ uri: r.data.qrImage }}
                    style={{
                      width: "100%",
                      aspectRatio: 1,
                      maxWidth: 320,
                      alignSelf: "center",
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}
              <Text
                selectable
                accessibilityLabel="Mã vé"
                style={{
                  ...ui.h2,
                  fontSize: 15,
                  textAlign: "center",
                  letterSpacing: 1,
                }}
              >
                {r.data.code}
              </Text>
              <Text style={ui.muted}>
                {r.data.status === "VALID"
                  ? "Xuất trình mã QR tại cửa vào. Mỗi vé chỉ check-in một lần."
                  : "Trạng thái vé được máy chủ kiểm tra tại cửa vào."}
              </Text>
              {["VALID", "CHECKED_IN"].includes(r.data.status) && (
                <TicketDocumentActions
                  load={async () => {
                    const ticket = await api.request<TicketDetail>(
                      `/me/tickets/${id}`,
                    );
                    return [
                      {
                        ...ticket,
                        startsAt: ticket.event?.starts_at,
                        venueName: ticket.event?.venue_name,
                      },
                    ];
                  }}
                />
              )}
            </View>
          )
        )}
      </Screen>
    </RequireAuth>
  );
}
