export function passwordIssue(password: string) {
  if (password.length < 8) return "Mật khẩu cần ít nhất 8 ký tự.";
  // Match the backend bcrypt boundary, including Vietnamese and emoji.
  let bytes = 0;
  for (const character of password) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  if (password.length > 72 || bytes > 72)
    return "Mật khẩu vượt 72 byte. Hãy rút ngắn nếu dùng ký tự có dấu hoặc emoji.";
  return "";
}
export const normalizedEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail(email));
export function safeNext(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value) ||
    /^\/(auth|reset-password)([/?#]|$)/.test(value)
  )
    return "/";
  return value;
}
