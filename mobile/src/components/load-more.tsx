import { ActivityIndicator, Text, View } from "react-native";
import { Button, Notice, colors, ui } from "./ui";

export function LoadMore({
  more,
  loading,
  error,
  onLoadMore,
  onRetry,
}: {
  more: boolean;
  loading: boolean;
  error?: string;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <View
        accessibilityLiveRegion="polite"
        style={[ui.row, { justifyContent: "center", padding: 16 }]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={ui.muted}>Đang tải thêm…</Text>
      </View>
    );
  if (error)
    return (
      <View style={{ gap: 12 }}>
        <Notice error text={error} />
        <Button
          title="Thử tải lại"
          icon="refresh-cw"
          secondary
          onPress={onRetry}
        />
      </View>
    );
  return more ? (
    <Button
      title="Tải thêm"
      icon="chevron-down"
      secondary
      onPress={onLoadMore}
    />
  ) : null;
}
