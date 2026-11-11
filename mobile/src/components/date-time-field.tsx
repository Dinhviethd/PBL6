import { Field } from "./ui";
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field
      label={`${label} (ISO, có múi giờ)`}
      value={value}
      onChangeText={onChange}
      placeholder="2026-12-20T19:00:00+07:00"
      autoCapitalize="none"
    />
  );
}
