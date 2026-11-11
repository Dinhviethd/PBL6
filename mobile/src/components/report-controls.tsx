import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { HomeSheet } from "./home/primitives";
import { Button, Notice, colors, ui } from "./ui";
import { DayField } from "./day-field";
import {
  recentRange,
  validateRange,
  type DateRange,
} from "../lib/report-filters";
import { money } from "../lib/data";

export function RangeFilter({
  range,
  onChange,
  optional = false,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(range),
    [error, setError] = useState("");
  const label =
    range.fromDate || range.toDate
      ? `${range.fromDate || "Từ đầu"} → ${range.toDate || "Hiện tại"}`
      : "Toàn bộ thời gian";
  return (
    <>
      <Button
        title={`Khoảng ngày: ${label}`}
        icon="calendar"
        secondary
        onPress={() => {
          setDraft(range);
          setError("");
          setOpen(true);
        }}
      />
      <HomeSheet
        visible={open}
        title="Lọc theo ngày"
        onClose={() => setOpen(false)}
      >
        <Text style={ui.muted}>Ngày tính theo giờ Việt Nam (UTC+07).</Text>
        <View style={ui.row}>
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              title={`${days} ngày`}
              secondary
              onPress={() => setDraft(recentRange(days))}
            />
          ))}
        </View>
        <DayField
          label="Từ ngày"
          value={draft.fromDate}
          onChange={(fromDate) => setDraft((d) => ({ ...d, fromDate }))}
        />
        <DayField
          label="Đến ngày"
          value={draft.toDate}
          onChange={(toDate) => setDraft((d) => ({ ...d, toDate }))}
        />
        {optional && (
          <Button
            title="Bỏ giới hạn ngày"
            secondary
            onPress={() => setDraft({ fromDate: "", toDate: "" })}
          />
        )}
        <Notice error text={error} />
        <Button
          title="Áp dụng khoảng ngày"
          onPress={() => {
            try {
              validateRange(draft, optional ? undefined : 366);
              onChange(draft);
              setOpen(false);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </HomeSheet>
    </>
  );
}

export function ChoiceFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        title={`${label}: ${options.find((o) => o.value === value)?.label ?? "Tất cả"}`}
        icon="sliders"
        secondary
        onPress={() => setOpen(true)}
      />
      <HomeSheet title={label} visible={open} onClose={() => setOpen(false)}>
        {options.map((o) => (
          <Button
            key={o.value}
            title={`${o.value === value ? "✓ " : ""}${o.label}`}
            secondary={o.value !== value}
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
          />
        ))}
      </HomeSheet>
    </>
  );
}

export function MetricGrid({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            ui.card,
            { flexGrow: 1, flexBasis: 140, minWidth: 0, padding: 16 },
          ]}
        >
          <Text style={ui.muted}>{item.label}</Text>
          <Text style={ui.h2}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export type DailyPoint = { date: string; revenue: string; sold?: string };
export function RevenueChart({ series }: { series: DailyPoint[] }) {
  const scroll = useRef<ScrollView>(null);
  const [selected, setSelected] = useState("");
  const day =
    series.find((d) => d.date === selected) ?? series[series.length - 1];
  const max = Math.max(1, ...series.map((d) => Number(d.revenue)));
  return (
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.h2}>
        Doanh thu theo ngày
      </Text>
      <Text style={ui.muted}>
        Vuốt ngang để xem các ngày, chạm cột để xem số liệu.
      </Text>
      {day && (
        <View accessibilityLiveRegion="polite">
          <Text style={ui.text}>
            {day.date}: {money(day.revenue)}
          </Text>
          {day.sold !== undefined && (
            <Text style={ui.muted}>{day.sold} vé đã bán</Text>
          )}
        </View>
      )}
      <ScrollView
        ref={scroll}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: false })
        }
        horizontal
        accessibilityRole="radiogroup"
        accessibilityLabel="Chọn ngày xem doanh thu"
        showsHorizontalScrollIndicator
        contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
      >
        {series.map((d) => (
          <Pressable
            key={d.date}
            accessibilityRole="radio"
            accessibilityLabel={`${d.date}: ${money(d.revenue)}${d.sold === undefined ? "" : `, ${d.sold} vé`}`}
            aria-checked={d.date === day?.date}
            accessibilityState={{ checked: d.date === day?.date }}
            onPress={() => setSelected(d.date)}
            style={{
              width: 48,
              minHeight: 160,
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                height: Math.max(3, (Number(d.revenue) / max) * 110),
                width: 28,
                backgroundColor:
                  d.date === day?.date ? colors.primary : colors.action,
                borderRadius: 6,
              }}
            />
            <Text style={ui.muted}>
              {d.date.slice(8)}/{d.date.slice(5, 7)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {!series.length && (
        <Text style={ui.muted}>Chưa có số liệu trong khoảng ngày này.</Text>
      )}
    </View>
  );
}
