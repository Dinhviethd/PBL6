import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { type Event, money } from "../../lib/data";
import { mediaUrl } from "../../lib/api";
import { eventDate } from "../../lib/event-search";
import { homeColors as c, homeStyles as s } from "../../theme/home";
import { fonts } from "../../theme/tokens";
import { HomeButton } from "./primitives";

export function HomeEventCard({ event }: { event: Event }) {
  const [failed, setFailed] = useState<string>();
  const open = () =>
    router.push({ pathname: "/events/[slug]", params: { slug: event.slug } });
  const price =
    event.priceFrom == null || !Number.isFinite(Number(event.priceFrom))
      ? "Xem chi tiết"
      : Number(event.priceFrom) === 0
        ? "Miễn phí"
        : money(event.priceFrom);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 16,
        backgroundColor: c.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem sự kiện: ${event.title}`}
        onPress={open}
      >
        {event.cover_image_url && failed !== event.cover_image_url ? (
          <Image
            source={{ uri: mediaUrl(event.cover_image_url) }}
            accessibilityLabel={event.title}
            resizeMode="cover"
            onError={() => setFailed(event.cover_image_url)}
            style={{
              width: "100%",
              aspectRatio: 1.6,
              backgroundColor: c.raised,
            }}
          />
        ) : (
          <View
            accessibilityLabel={`Ảnh minh họa: ${event.title}`}
            style={{
              width: "100%",
              aspectRatio: 1.6,
              backgroundColor: c.raised,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <Feather name="zap" size={40} color={c.cyan} />
            <Text style={s.eyebrow}>EVENTHUB</Text>
          </View>
        )}
        <Text
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            backgroundColor: "#080B1ADD",
            color: c.cyan,
            padding: 8,
            borderRadius: 6,
            fontFamily: fonts.bold,
            fontSize: 11,
          }}
        >
          SỰ KIỆN
        </Text>
      </Pressable>
      <View style={{ padding: 17, gap: 10 }}>
        <View style={s.row}>
          <Feather name="calendar" color={c.cyan} size={14} />
          <Text style={s.muted}>{eventDate(event.starts_at)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={event.title}
          onPress={open}
          style={{ minHeight: 48, justifyContent: "center" }}
        >
          <Text style={[s.title, { fontSize: 19, lineHeight: 28 }]}>
            {event.title}
          </Text>
        </Pressable>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}
        >
          <Feather
            name="map-pin"
            color={c.muted}
            size={15}
            style={{ marginTop: 3 }}
          />
          <Text style={[s.muted, { flex: 1 }]}>
            {[event.venue_name, event.city_code].filter(Boolean).join(" · ") ||
              "Đang cập nhật địa điểm"}
          </Text>
        </View>
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.border,
            paddingTop: 13,
            gap: 12,
          }}
        >
          <View>
            <Text style={s.muted}>Giá vé từ</Text>
            <Text
              style={{
                color: c.cyan,
                fontFamily: fonts.bold,
                fontSize: 20,
                lineHeight: 30,
              }}
            >
              {price}
            </Text>
          </View>
          <HomeButton
            title="Xem vé"
            label={`Xem vé: ${event.title}`}
            icon="arrow-right"
            onPress={open}
            secondary
          />
        </View>
      </View>
    </View>
  );
}
