export const LEGACY_DRAFT_KEY = "eventhub.register-organizer.draft.v1";
export const FORM_KEYS = [
  "organizationName", "contactEmail", "contactPhone", "businessName",
  "taxIdOrBusinessLicense", "websiteOrSocial", "headOfficeAddress",
  "mainEventCategory", "expectedEventScale", "description",
] as const;
export type FormState = Record<(typeof FORM_KEYS)[number], string>;
type Draft = { version: 2; ownerId: string; savedAt: string; form: Partial<FormState> };
export const draftKey = (ownerId: string) => `eventhub.register-organizer.draft.v2:${ownerId}`;
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const allowedForm = (value: Record<string, unknown>): Partial<FormState> =>
  Object.fromEntries(FORM_KEYS.filter(k => typeof value[k] === "string").map(k => [k, value[k]]));

export function discardLegacyDraft() {
  try { window.localStorage.removeItem(LEGACY_DRAFT_KEY); } catch { /* Storage may be disabled. */ }
}
export function readDraft(ownerId: string): Draft | null {
  if (!ownerId) return null;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(draftKey(ownerId)) ?? "null");
    if (!record(value) || value.version !== 2 || value.ownerId !== ownerId ||
      typeof value.savedAt !== "string" || !Number.isFinite(Date.parse(value.savedAt)) || !record(value.form)) return null;
    const form = allowedForm(value.form);
    return FORM_KEYS.some(k => form[k]?.trim())
      ? { version: 2, ownerId, savedAt: value.savedAt, form } : null;
  } catch { return null; }
}
export function saveDraft(ownerId: string, form: FormState): string {
  if (!ownerId) throw new Error("Cần đăng nhập để lưu bản nháp.");
  const savedAt = new Date().toISOString();
  window.localStorage.setItem(draftKey(ownerId), JSON.stringify({
    version: 2, ownerId, savedAt, form: allowedForm(form),
  }));
  return savedAt;
}
export function removeDraft(ownerId: string) {
  if (ownerId) window.localStorage.removeItem(draftKey(ownerId));
}
