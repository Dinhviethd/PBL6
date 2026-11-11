import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { Category } from "../../lib/data";
import {
  emptyEventFilters,
  eventQuery,
  type EventFilters,
} from "../../lib/event-search";
import { homeColors as c, homeStyles as s } from "../../theme/home";
import { fonts } from "../../theme/tokens";
import { HomeButton, HomeSheet } from "./primitives";
import { Field } from "../ui";

function DateCalendar({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date();
  const [month, setMonth] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1),
  );
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <View style={[s.card, { padding: 10 }]}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <HomeButton
          title="‹"
          label="Tháng trước"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          secondary
        />
        <Text style={s.body}>
          {month.toLocaleDateString("vi-VN", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <HomeButton
          title="›"
          label="Tháng sau"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          secondary
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <Text
            key={day}
            style={[
              s.muted,
              { width: "14.2857%", textAlign: "center", paddingVertical: 7 },
            ]}
          >
            {day}
          </Text>
        ))}
        {Array.from({ length: offset + days }, (_, i) => {
          const day = i - offset + 1;
          const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          return day <= 0 ? (
            <View key={i} style={{ width: "14.2857%" }} />
          ) : (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Chọn ngày ${key}`}
              accessibilityState={{ selected: key === value }}
              onPress={() => onSelect(key)}
              style={{
                width: "14.2857%",
                minHeight: 48,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: key === value ? c.purple : "transparent",
                borderRadius: 8,
              }}
            >
              <Text style={s.body}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function HomeSearchPanel({
  filters,
  onChange,
  onSearch,
  categories,
}: {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  onSearch: (filters: EventFilters) => void;
  categories: Category[];
}) {
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [dateField, setDateField] = useState<"from" | "to" | null>(null);
  const [error, setError] = useState("");
  const { fontScale } = useWindowDimensions();
  const count = [
    filters.city,
    filters.from,
    filters.to,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length;
  const openFilters = () => {
    Keyboard.dismiss();
    setDraft(filters);
    setError("");
    setDateField(null);
    setSheet(true);
  };
  const submit = () => {
    Keyboard.dismiss();
    onSearch(filters);
  };
  return (
    <View style={[s.card, { gap: 12, padding: 14 }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bg,
          borderRadius: 10,
          paddingHorizontal: 12,
        }}
      >
        <Feather name="search" size={19} color={c.cyan} />
        <TextInput
          accessibilityLabel="Tìm sự kiện"
          value={filters.q}
          onChangeText={(q) => onChange({ ...filters, q })}
          placeholder="Tên sự kiện, nghệ sĩ, chủ đề..."
          placeholderTextColor={c.muted}
          returnKeyType="search"
          onSubmitEditing={submit}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 50,
            color: c.text,
            fontSize: 14,
            fontFamily: fonts.regular,
            paddingVertical: 12,
          }}
        />
      </View>
      <View
        style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 8 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Thành phố: ${filters.city || "Toàn quốc"}`}
          onPress={openFilters}
          style={{
            flex: 1,
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            padding: 10,
            backgroundColor: c.raised,
            borderRadius: 10,
          }}
        >
          <Feather name="map-pin" color={c.muted} size={16} />
          <Text style={[s.body, { flex: 1 }]}>
            {filters.city || "Toàn quốc"}
          </Text>
          <Feather name="chevron-down" color={c.muted} size={14} />
        </Pressable>
        <HomeButton
          title={`Bộ lọc${count ? ` (${count})` : ""}`}
          icon="sliders"
          onPress={openFilters}
          secondary
        />
      </View>
      <HomeButton title="Tìm kiếm" icon="search" onPress={submit} />
      {(filters.from || filters.to) && (
        <Text style={s.muted}>
          {filters.from || "Bất kỳ ngày nào"} → {filters.to || "Không giới hạn"}
        </Text>
      )}
      {!!categories.length && (
        <>
          <Text style={s.muted}>Chủ đề nổi bật</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {categories.slice(0, 6).map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`Khám phá ${category.name}`}
                onPress={() => onSearch({ ...filters, category: category.id })}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 24,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  minHeight: 48,
                  justifyContent: "center",
                }}
              >
                <Text style={s.muted}>{category.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      <HomeSheet
        visible={sheet}
        title="Lọc sự kiện"
        onClose={() => setSheet(false)}
      >
        <Text style={s.body}>Thành phố</Text>
        <View style={s.row}>
          {["", "Hồ Chí Minh", "Hà Nội", "Đà Nẵng"].map((city) => (
            <Pressable
              key={city}
              accessibilityRole="button"
              accessibilityLabel={city || "Toàn quốc"}
              accessibilityState={{ selected: draft.city === city }}
              onPress={() => setDraft({ ...draft, city })}
              style={{
                minHeight: 48,
                padding: 12,
                borderRadius: 10,
                backgroundColor: draft.city === city ? c.purple : c.raised,
              }}
            >
              <Text style={s.body}>{city || "Toàn quốc"}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel="Thành phố khác"
          placeholder="Hoặc nhập thành phố khác"
          placeholderTextColor={c.muted}
          value={draft.city}
          onChangeText={(city) => setDraft({ ...draft, city })}
          style={[
            s.body,
            {
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              padding: 14,
              minHeight: 48,
            },
          ]}
        />
        <Field
          label="Giá vé tối thiểu (VND)"
          value={draft.minPrice ?? ""}
          onChangeText={(minPrice) => setDraft({ ...draft, minPrice })}
          keyboardType="number-pad"
          placeholder="Không giới hạn"
        />
        <Field
          label="Giá vé tối đa (VND)"
          value={draft.maxPrice ?? ""}
          onChangeText={(maxPrice) => setDraft({ ...draft, maxPrice })}
          keyboardType="number-pad"
          placeholder="Không giới hạn"
        />
        {(
          [
            ["from", "Từ ngày"],
            ["to", "Đến ngày"],
          ] as const
        ).map(([key, label]) => (
          <View key={key} style={{ gap: 8 }}>
            <Text style={s.body}>{label}</Text>
            <HomeButton
              title={`${label}: ${draft[key] || "Chọn ngày"}`}
              icon="calendar"
              secondary
              onPress={() => {
                setDateField(dateField === key ? null : key);
                setError("");
              }}
            />
            {dateField === key && (
              <DateCalendar
                key={key}
                value={draft[key]}
                onSelect={(value) => {
                  setDraft({ ...draft, [key]: value });
                  setDateField(null);
                  setError("");
                }}
              />
            )}
          </View>
        ))}
        {!!error && (
          <Text accessibilityRole="alert" style={[s.body, { color: c.pink }]}>
            {error}
          </Text>
        )}
        <HomeButton
          title="Áp dụng"
          onPress={() => {
            try {
              eventQuery(draft);
              onChange(draft);
              setSheet(false);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        <HomeButton
          title="Xóa bộ lọc"
          secondary
          onPress={() => {
            setDraft({
              ...emptyEventFilters,
              q: filters.q,
              category: filters.category,
            });
            setDateField(null);
            setError("");
          }}
        />
      </HomeSheet>
    </View>
  );
}
