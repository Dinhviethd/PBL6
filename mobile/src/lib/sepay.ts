export type PaymentConfig = { paymentMode: string; sepayEnabled: boolean };
export type SepayPayment = {
  paymentId: string;
  orderId: string;
  orderStatus: string;
  status: string;
  environment: "test" | "live";
  amount: string;
  currency: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  transferContent: string;
  qrUrl: string | null;
  canTransfer: boolean;
  expiresAt: string;
  holdUntil: string;
  requiresReview: boolean;
  updatedAt: string;
  lastVerifiedAt: string | null;
};
export function canTransfer(p: SepayPayment | null, now: number) {
  return (
    !!p &&
    p.canTransfer &&
    !p.requiresReview &&
    p.orderStatus === "PENDING_PAYMENT" &&
    p.status === "PENDING" &&
    Date.parse(p.expiresAt) > now
  );
}
export function shouldPoll(p: SepayPayment | null, now: number) {
  return (
    !!p &&
    !p.requiresReview &&
    p.orderStatus === "PENDING_PAYMENT" &&
    p.status === "PENDING" &&
    Date.parse(p.holdUntil) > now
  );
}
export function retryDelay(value: string | null | undefined, now: number) {
  if (!value) return 60000;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(1000, delay) : 60000;
}
type Failure = { status?: number; code?: string; retryAfter?: string | null };
type Snapshot = {
  payment: SepayPayment | null;
  busy: boolean;
  error: string;
  checked: boolean;
  availableAt: number;
};
// One controller per mounted order/session. GET precedes every explicit creation attempt,
// including recovery after a lost POST response. No timer or retry ever creates a payment.
export function createSepayController(options: {
  request: (method: "GET" | "POST") => Promise<SepayPayment>;
  changed: (state: Snapshot) => void;
  paid: () => void;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  let state: Snapshot = {
    payment: null,
    busy: false,
    error: "",
    checked: false,
    availableAt: 0,
  };
  let active = false,
    disposed = false,
    inFlight = false,
    next = 0,
    nextPoll = 0,
    blockedUntil = 0;
  let fatal = false;
  const emit = () => {
    if (!disposed && active)
      options.changed({ ...state, availableAt: Math.max(next, blockedUntil) });
  };
  async function run(create = false, automatic = false) {
    if (disposed || !active || inFlight || now() < blockedUntil || now() < next)
      return;
    if (
      automatic &&
      (now() < nextPoll ||
        fatal ||
        (state.checked && !shouldPoll(state.payment, now())))
    )
      return;
    inFlight = true;
    state = { ...state, busy: true, error: "" };
    emit();
    next = now() + 3000;
    try {
      let payment: SepayPayment | null;
      try {
        payment = await options.request("GET");
      } catch (e) {
        if ((e as Failure).code !== "SEPAY_NOT_FOUND") throw e;
        payment = null;
        if (create && active && !disposed) {
          try {
            payment = await options.request("POST");
          } catch (postError) {
            if ((postError as Failure).status !== 0) throw postError;
            // An ambiguous write must be reconciled, never repeated automatically.
            payment = await options.request("GET");
          }
        }
      }
      if (disposed) return;
      state = { ...state, payment, busy: false, error: "", checked: true };
      fatal = false;
      if (active && payment?.orderStatus === "PAID") options.paid();
    } catch (e) {
      if (disposed) return;
      const failure = e as Failure;
      if (failure.status === 429)
        blockedUntil = now() + retryDelay(failure.retryAfter, now());
      fatal = [401, 403, 404, 409, 503].includes(failure.status ?? 0);
      state = {
        ...state,
        busy: false,
        error:
          e instanceof Error
            ? e.message
            : "Không tải được giao dịch. Vui lòng thử lại.",
      };
    } finally {
      inFlight = false;
      next = now() + 3000;
      nextPoll = now() + 8000;
      emit();
    }
  }
  return {
    refresh: () => run(),
    start: () => run(true),
    tick: () => run(false, true),
    activate() {
      active = true;
      next = 0;
      emit();
      return run();
    },
    deactivate() {
      active = false;
    },
    dispose() {
      disposed = true;
      active = false;
    },
  };
}
