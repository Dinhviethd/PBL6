import { StyleSheet } from "react-native";
import { fonts } from "./tokens";

export const homeColors = {
  bg: "#080B1A",
  surface: "#10162B",
  raised: "#141C36",
  border: "#1E293B",
  purple: "#7C3AED",
  cyan: "#22D3EE",
  pink: "#F472B6",
  text: "#F8FAFC",
  muted: "#94A3B8",
};

export const homeStyles = StyleSheet.create({
  body: {
    color: homeColors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 23,
  },
  muted: {
    color: homeColors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 21,
  },
  title: {
    color: homeColors.text,
    fontFamily: fonts.extraBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  eyebrow: {
    color: homeColors.cyan,
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 18,
    letterSpacing: 1,
  },
  section: { gap: 16 },
  card: {
    backgroundColor: homeColors.surface,
    borderWidth: 1,
    borderColor: homeColors.border,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
});
