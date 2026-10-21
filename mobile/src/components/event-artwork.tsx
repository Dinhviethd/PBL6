import { useState } from "react";
import { Image, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { mediaUrl } from "../lib/api";
import { colors, ui } from "./ui";

export function EventArtwork({
  url,
  title,
  hero = false,
}: {
  url?: string;
  title: string;
  hero?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const style = [ui.image, hero && { height: 240 }];
  return url && failedUrl !== url ? (
    <Image
      source={{ uri: mediaUrl(url) }}
      accessibilityLabel={title}
      style={style}
      resizeMode="cover"
      onError={() => setFailedUrl(url)}
    />
  ) : (
    <View
      accessibilityLabel={`Ảnh minh họa: ${title}`}
      style={[
        ...style,
        {
          backgroundColor: colors.accentSurface,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        },
      ]}
    >
      <Feather name="music" size={42} color={colors.primary} />
      <Text style={ui.eyebrow}>EVENTHUB · LIVE EXPERIENCES</Text>
    </View>
  );
}
