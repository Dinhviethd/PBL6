import { useState } from "react";
import { Pressable, type TextInputProps } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors, Field } from "./ui";

export function PasswordField(props: TextInputProps & { label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      icon="lock"
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visible ? "Ẩn" : "Hiện"} ${props.label.toLowerCase()}`}
          accessibilityState={{ disabled: props.editable === false }}
          disabled={props.editable === false}
          onPress={() => setVisible((v) => !v)}
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            opacity: props.editable === false ? 0.45 : pressed ? 0.6 : 1,
          })}
        >
          <Feather
            name={visible ? "eye-off" : "eye"}
            size={20}
            color={colors.muted}
          />
        </Pressable>
      }
    />
  );
}
