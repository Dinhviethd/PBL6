import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "./api";
export async function pickAndUploadImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
    throw new Error("Chọn ảnh tối đa 5 MB.");
  const body = new FormData();
  if (Platform.OS === "web")
    body.append(
      "image",
      asset.file ?? (await (await fetch(asset.uri)).blob()),
      asset.fileName ?? "event.jpg",
    );
  else
    body.append("image", {
      uri: asset.uri,
      name: asset.fileName ?? "event.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob);
  return (await api.request<{ url: string }>("/media", "POST", body)).url;
}
