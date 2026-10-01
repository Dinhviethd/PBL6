export interface PaymentIntent {
  provider: string;
  merchantAccount: string;
  expiresAt: Date;
  reconcileUntil: Date;
}
export interface PaymentProvider {
  readonly name: string;
  readonly demo: boolean;
  enabled(): boolean;
  createIntent(input: {
    orderId: string;
    amount: string;
    expiresAt: Date;
  }): PaymentIntent;
  demoTransactionId(paymentId: string): string;
}
// Local simulation only. A network provider needs signed callbacks and reconciliation
// outside the database transaction before handing verified results to the workflow.
export function demoProvider(enabled: boolean): PaymentProvider {
  return {
    name: "demo",
    demo: true,
    enabled: () => enabled,
    createIntent: ({ expiresAt }) => ({
      provider: "demo",
      merchantAccount: "local",
      expiresAt,
      reconcileUntil: new Date(expiresAt.getTime() + 5 * 60000),
    }),
    demoTransactionId: (paymentId) => `DEMO-${paymentId}`,
  };
}
