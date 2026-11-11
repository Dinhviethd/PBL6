import { Field } from "./ui";
export function DayField({
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
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      autoCapitalize="none"
    />
  );
}
