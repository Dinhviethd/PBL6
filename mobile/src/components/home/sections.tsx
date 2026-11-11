import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { Category } from "../../lib/data";
import { homeColors as c, homeStyles as s } from "../../theme/home";
import { fonts } from "../../theme/tokens";
import { HomeButton, SectionTitle } from "./primitives";
import { AppIcon } from "../app-icon";

export function HomeBrand() {
  return (
    <View
      accessibilityLabel="EventHub"
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <Image
        source={require("../../../assets/logo.png")}
        resizeMode="contain"
        style={{ width: 40, height: 26 }}
      />
      <Text
        style={{
          color: c.text,
          fontFamily: fonts.extraBold,
          fontSize: 21,
          letterSpacing: -0.8,
        }}
      >
        EVENT<Text style={{ color: c.cyan }}>HUB</Text>
      </Text>
    </View>
  );
}

export function HomeHero({ onOrganizer }: { onOrganizer: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 600;
  return (
    <LinearGradient
      colors={["#241444", "#101A30", c.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 22,
        paddingHorizontal: width < 360 ? 12 : 20,
        paddingTop: compact ? 16 : 30,
        paddingBottom: compact ? 16 : 24,
        gap: compact ? 10 : 20,
        borderCurve: "continuous",
      }}
    >
      <View
        style={{
          alignSelf: compact ? "flex-start" : "center",
          maxWidth: "100%",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderWidth: 1,
          borderColor: "#22D3EE33",
          borderRadius: 30,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: c.surface,
        }}
      >
        <AppIcon name="radio" size={13} color={c.cyan} />
        <Text
          style={[
            s.eyebrow,
            { textAlign: "center", fontSize: 10, letterSpacing: 0.6, flexShrink: 1 },
          ]}
        >
          SỰ KIỆN & VÉ ĐIỆN TỬ
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        style={{
          color: c.text,
          fontFamily: fonts.extraBold,
          fontSize: compact ? 24 : 44,
          lineHeight: compact ? 32 : 54,
          letterSpacing: -1.2,
          textAlign: compact ? "left" : "center",
        }}
      >
        LỄ HỘI ÂM NHẠC{"\n"}
        <Text style={{ color: c.cyan }}>& SỰ KIỆN</Text>
        {compact ? " " : "\n"}
        <Text style={{ color: "#C4A6FF" }}>VŨ TRỤ</Text>
      </Text>
      <Text
        style={[
          s.body,
          { textAlign: compact ? "left" : "center", color: "#C1CCDD" },
        ]}
      >
        {compact
          ? "Tìm trải nghiệm hợp gu, đặt vé và giữ QR ngay trên điện thoại."
          : "Khám phá những sự kiện đáng nhớ, tìm trải nghiệm hợp gu và giữ chỗ cho cuộc hẹn tiếp theo cùng EventHub."}
      </Text>
      <View
        style={{
          flexDirection: fontScale > 1.3 ? "column" : "row",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <View style={{ flex: 1, minWidth: 120 }}>
          <HomeButton
            title="Khám phá sự kiện"
            icon="arrow-right"
            onPress={() => router.push("/explore")}
          />
        </View>
        <View style={{ flex: 1, minWidth: 120 }}>
          <HomeButton
            title="Dành cho Ban tổ chức"
            icon="briefcase"
            secondary
            onPress={onOrganizer}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const categoryIcons: Record<string, keyof typeof Feather.glyphMap> = {
  "am-nhac": "music",
  "cong-nghe": "cpu",
  "the-thao": "award",
  "kinh-doanh": "briefcase",
  "nghe-thuat": "pen-tool",
  "giao-duc": "book-open",
};
const tones = ["#B89AFF", c.cyan, c.pink, "#60A5FA"];
export function HomeCategoryGrid({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (id: string) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const horizontal = width < 600 && fontScale <= 1.3;
  return (
    <ScrollView
      horizontal={horizontal}
      scrollEnabled={horizontal}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: "row",
        flexWrap: horizontal ? "nowrap" : "wrap",
        gap: 10,
        paddingBottom: 4,
      }}
    >
      {categories.map((category, i) => (
        <Pressable
          key={category.id}
          accessibilityRole="button"
          accessibilityLabel={`Danh mục ${category.name}`}
          onPress={() => onSelect(category.id)}
          style={({ pressed }) => ({
            width: horizontal ? 148 : fontScale > 1.3 ? "100%" : "48%",
            flexGrow: horizontal ? 0 : 1,
            minHeight: horizontal ? 116 : 140,
            padding: horizontal ? 12 : 16,
            borderWidth: 1,
            borderColor: `${tones[i % 4]}44`,
            borderRadius: 14,
            backgroundColor: pressed ? c.raised : c.surface,
            gap: 10,
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: `${tones[i % 4]}18`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather
              name={categoryIcons[category.slug] || "tag"}
              size={23}
              color={tones[i % 4]}
            />
          </View>
          <Text
            style={{
              color: c.text,
              fontFamily: fonts.bold,
              fontSize: 15,
              lineHeight: 23,
            }}
          >
            {category.name}
          </Text>
          {!horizontal && <Text style={s.muted}>Khám phá sự kiện ↗</Text>}
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function HomeBenefits() {
  return (
    <View style={[s.card, { padding: 20, gap: 20 }]}>
      <SectionTitle
        eyebrow="TRẢI NGHIỆM EVENTHUB"
        icon="shield"
        title="Sẵn sàng cho khoảnh khắc đáng nhớ?"
      >
        <Text style={s.muted}>
          Từ tìm sự kiện đến lưu vé, mọi bước được thiết kế gọn gàng để bạn tập
          trung tận hưởng.
        </Text>
      </SectionTitle>
      {(
        [
          [
            "maximize",
            "VÉ ĐIỆN TỬ",
            "Check-in bằng mã QR",
            "Giữ vé điện tử thuận tiện và sẵn sàng xuất trình tại sự kiện.",
          ],
          [
            "shield",
            "THANH TOÁN",
            "Quy trình rõ ràng",
            "Theo dõi đơn hàng và trạng thái thanh toán trong tài khoản của bạn.",
          ],
          [
            "credit-card",
            "TÀI KHOẢN",
            "Quản lý vé tập trung",
            "Xem vé và thông tin đơn hàng đã đặt tại cùng một nơi.",
          ],
        ] as const
      ).map(([icon, tag, title, body], i) => (
        <View key={title} style={[s.card, { backgroundColor: c.bg }]}>
          <Feather name={icon} size={27} color={tones[i]} />
          <Text style={[s.eyebrow, { color: tones[i] }]}>{tag}</Text>
          <Text style={[s.title, { fontSize: 19, lineHeight: 27 }]}>
            {title}
          </Text>
          <Text style={s.muted}>{body}</Text>
        </View>
      ))}
    </View>
  );
}

export function HomeOrganizerCTA({ onPress }: { onPress: () => void }) {
  return (
    <LinearGradient
      colors={["#21123F", c.surface]}
      style={[s.card, { padding: 22, gap: 18, borderColor: "#7C3AED55" }]}
    >
      <SectionTitle
        eyebrow="DÀNH CHO BAN TỔ CHỨC"
        icon="briefcase"
        title="Đưa sự kiện của bạn đến gần khán giả hơn."
      />
      <Text style={s.muted}>
        Tạo sự kiện, quản lý vé và theo dõi hoạt động bán vé trên EventHub.
      </Text>
      {[
        "Quản lý thông tin sự kiện",
        "Theo dõi đơn hàng và vé",
        "Hỗ trợ quy trình check-in",
      ].map((text) => (
        <View key={text} style={{ flexDirection: "row", gap: 10 }}>
          <Feather name="check-circle" color={c.cyan} size={18} />
          <Text style={[s.body, { flex: 1 }]}>{text}</Text>
        </View>
      ))}
      <HomeButton
        title="Bắt đầu tổ chức"
        icon="arrow-right"
        onPress={onPress}
      />
      <HomeButton title="Tìm hiểu thêm" secondary onPress={onPress} />
    </LinearGradient>
  );
}

export function HomeFooter({
  onDevelopment,
}: {
  onDevelopment: (title: string) => void;
}) {
  const [policies, setPolicies] = useState(false);
  return (
    <View
      style={{
        paddingTop: 25,
        borderTopWidth: 1,
        borderColor: c.border,
        gap: 18,
      }}
    >
      <HomeBrand />
      <Text style={s.muted}>
        Nền tảng phát hành vé số hóa, phân phối sự kiện âm nhạc và kiểm soát
        check-in theo phong cách Cyber Cosmic đỉnh cao.
      </Text>
      <Text style={s.eyebrow}>LIÊN KẾT NHANH</Text>
      <HomeButton
        title="Khám phá sự kiện"
        secondary
        onPress={() => router.push("/explore")}
      />
      <HomeButton
        title="Vé của tôi"
        secondary
        onPress={() => router.push("/(tabs)/tickets")}
      />
      <HomeButton
        title="Dành cho Ban tổ chức"
        secondary
        onPress={() => onDevelopment("Đăng ký Ban tổ chức")}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chính sách & Pháp lý"
        accessibilityState={{ expanded: policies }}
        onPress={() => setPolicies(!policies)}
        style={{
          minHeight: 48,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={s.body}>Chính sách & Pháp lý</Text>
        <Feather
          name={policies ? "chevron-up" : "chevron-down"}
          color={c.muted}
          size={20}
        />
      </Pressable>
      {policies &&
        [
          "Điều khoản sử dụng",
          "Chính sách bảo mật",
          "Chính sách hoàn/đổi vé",
        ].map((title) => (
          <HomeButton
            key={title}
            title={title}
            secondary
            onPress={() => onDevelopment(title)}
          />
        ))}
      <HomeButton
        title="Liên hệ hỗ trợ"
        icon="help-circle"
        secondary
        onPress={() => onDevelopment("Hỗ trợ")}
      />
      <Text style={[s.muted, { textAlign: "center", fontSize: 12 }]}>
        © {new Date().getFullYear()} EVENTHUB. Bản quyền thuộc về EventHub.
      </Text>
    </View>
  );
}
