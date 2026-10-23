export const local = (s?: string) => {
  const d = s ? new Date(s) : new Date(Date.now() + 86400000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export const iso = (s: string) => new Date(s).toISOString();
export const eventTime = (value: string, original?: string) =>
  original && value === local(original) ? original : iso(value);
