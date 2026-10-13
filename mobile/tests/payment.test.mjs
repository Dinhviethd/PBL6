import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutUrl, paymentMessage } from "../src/lib/payment.ts";

test("native checkout only opens the configured sandbox, and reports terminal/review states", () => {
  const url =
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=test";
  assert.equal(checkoutUrl(url), url);
  for (const bad of [
    "https://sandbox.vnpayment.vn.evil.test/paymentv2/vpcpay.html",
    "http://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    "javascript:alert(1)",
    "https://user:pass@sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  ])
    assert.throws(() => checkoutUrl(bad));
  assert.match(paymentMessage({ status: "PENDING" }), /Đang chờ/);
  assert.match(paymentMessage({ status: "SUCCEEDED" }), /xác nhận/);
  assert.match(paymentMessage({ status: "FAILED" }), /thất bại/);
  assert.match(
    paymentMessage({ status: "SUCCEEDED", requires_review: true }),
    /đối soát/,
  );
});
