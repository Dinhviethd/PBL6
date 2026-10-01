export type Row = Record<string, any>;
export type Owner = "auth" | "event" | "order" | "payment" | "audit";
export interface Store {
  query<T extends Row = Row>(sql: string, args?: unknown[]): Promise<T[]>;
}
export interface Principal {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
}
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}
export class Fault extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  code: string,
  message: string,
  status = 409,
): asserts condition {
  if (!condition) throw new Fault(status, code, message);
}
export function role(p: Principal, allowed: string[]) {
  ensure(
    p.roles.some((r) => allowed.includes(r)),
    "FORBIDDEN",
    "Bạn không có quyền thực hiện thao tác này.",
    403,
  );
}
export const money = (n: unknown) => BigInt(String(n));
