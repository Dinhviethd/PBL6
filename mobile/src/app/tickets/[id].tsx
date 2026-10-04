import { Image, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { stateLabel, useResource, type TicketDetail } from "../../lib/data";
import { useSession } from "../../lib/session";
import { Loading, Notice, RequireAuth, Screen, ui } from "../../components/ui";
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
                Xuất trình mã QR tại cửa vào. Mỗi vé chỉ check-in một lần.
              </Text>
            </View>
          )
        )}
      </Screen>
    </RequireAuth>
  );
}
