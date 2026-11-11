import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { apiUrl } from "./api";
type Draft = { version: 1; savedAt: string; values: Record<string, string> };
export async function eventDraftStorage(userId: string, eventId: string) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${apiUrl}:${userId}:${eventId}`,
  );
  const key = `eventhub.draft.${hash}`;
  const parse = (text: string | null): Draft | null => {
    if (!text) return null;
    const d = JSON.parse(text);
    if (
      d.version !== 1 ||
      !d.values ||
      Object.values(d.values).some((v) => typeof v !== "string") ||
      !Number.isFinite(Date.parse(d.savedAt)) ||
      Date.now() - Date.parse(d.savedAt) > 30 * 86400000
    )
      return null;
    return d;
  };
  if (Platform.OS === "web")
    return {
      read: async () => parse(localStorage.getItem(key)),
      write: async (values: Record<string, string>) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            values,
          }),
        ),
      clear: async () => localStorage.removeItem(key),
    };
  const { Directory, File, Paths } = await import("expo-file-system");
  const directory = new Directory(Paths.document, "eventhub-drafts");
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${hash}.json`);
  return {
    read: async () => (file.exists ? parse(await file.text()) : null),
    write: async (values: Record<string, string>) => {
      file.create({ overwrite: true });
      file.write(
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          values,
        }),
      );
    },
    clear: async () => {
      if (file.exists) file.delete();
    },
  };
}
