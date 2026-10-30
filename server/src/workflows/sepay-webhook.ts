import { createHash } from "node:crypto";
import type { UnitOfWork } from "../contracts/core";
import type { SepayPayments, SepayWebhookPayload, Payments } from "../modules/payment/public";
import { extractSepayCode } from "../modules/payment/public";
import type { Orders } from "../modules/order/public";
import type { Notifications } from "../modules/notification/public";
import type { createAudit } from "../modules/audit/public";

export function createSepayWebhook(sepay:SepayPayments,payments:Payments,orders:Orders,uow:UnitOfWork,notifications:Notifications,audit:ReturnType<typeof createAudit>) {
  return {
    receive: async (payload:SepayWebhookPayload) => {
      const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      return uow.run(()=>sepay.receive(payload,hash));
    },
    processBatch: async (limit=10) => {
      const claimed=await uow.run(()=>sepay.claim(limit));
      for(const claim of claimed) {
        try {
          await uow.run(async()=>{
            const tx=await sepay.lockClaim(claim.id,claim.lease_token);
            if(!tx) return;
            const reference=tx.payment_code ?? extractSepayCode(tx.content);
            const review=async(reason:string,paymentId:string|null=null)=>sepay.finishTransaction(tx.id,tx.lease_token,'REVIEW',reason,paymentId);
            if(tx.transfer_type!=='in') {await review('TRANSFER_NOT_IN');return;}
            if(tx.bank_code!=='MBBank'||tx.account_number!==sepay.config.accountNumber||tx.sub_account) {await review('ACCOUNT_MISMATCH');return;}
            if(!reference) {await review('PAYMENT_CODE_MISSING_OR_AMBIGUOUS');return;}
            const matched=await sepay.findByCode(reference);
            if(matched.length!==1) {await review(matched.length?'PAYMENT_CODE_AMBIGUOUS':'PAYMENT_NOT_FOUND');return;}
            const payment=await payments.one(matched[0].id,true);
            if(!payment||payment.provider!=='sepay') {await review('PAYMENT_NOT_FOUND');return;}
            const order=await orders.one(payment.order_id,true);
            const reservations=await orders.lockInventory(order);
            if(payment.status==='SUCCEEDED') {await review('PAYMENT_ALREADY_SETTLED',payment.id);return;}
            if(String(payment.amount)!==String(tx.amount)||payment.currency!=='VND') {await payments.review(payment.id,'SEPAY_AMOUNT_MISMATCH');await review('AMOUNT_MISMATCH',payment.id);return;}
            if(new Date(tx.transaction_at)>new Date(payment.provider_expires_at)) {await payments.review(payment.id,'SEPAY_LATE_TRANSFER');await review('LATE_TRANSFER',payment.id);return;}
            if(order.status!=='PENDING_PAYMENT'||reservations.length===0||reservations.some(r=>r.status!=='HELD'||new Date(r.release_after)<=new Date())) {await payments.review(payment.id,'SEPAY_RESERVATION_RELEASED');await review('RESERVATION_NOT_HELD',payment.id);return;}
            const result=await orders.complete(order,{...payment,amount:String(tx.amount),currency:'VND'});
            if(result==='LATE_PAYMENT'||result==='DIFFERENT_PAYMENT_ALREADY_APPLIED') {await payments.review(payment.id,'SEPAY_ORDER_COMPLETION_REJECTED');await review(result,payment.id);return;}
            const providerTransactionId=String(tx.webhook_transaction_id ?? tx.api_transaction_id);
            const verificationCode=tx.webhook_transaction_id?'SEPAY_WEBHOOK':'SEPAY_API_V2_RECONCILIATION';
            await payments.verifiedResult(payment.id,{reference:payment.merchant_reference,merchant:payment.merchant_account,amount:String(tx.amount),status:'SUCCEEDED',transactionId:providerTransactionId,code:verificationCode});
            if(result==='APPLIED') await notifications.send({userId:order.buyer_id,kind:'ORDER_PAID',title:'Đặt vé thành công',message:`Đơn ${order.order_code} cho ${order.event_title_snapshot} đã thanh toán. Vé QR đã sẵn sàng.`,target:'ORDER',targetId:order.id,dedupeKey:`paid:${order.id}`});
            await audit.append(null,'payment.verified','payment',payment.id,{provider:'sepay',outcome:result,transactionId:providerTransactionId,source:verificationCode});
            await sepay.finishTransaction(tx.id,tx.lease_token,'PROCESSED',null,payment.id);
          });
        } catch(error) {
          const kind=typeof error==='object'&&error&&'code' in error?String((error as {code:unknown}).code):error instanceof Error?error.name:'UNKNOWN';
          console.error('SePay inbox item failed',claim.id,kind.slice(0,64));
          await uow.run(()=>sepay.finishTransaction(claim.id,claim.lease_token,'ERROR','PROCESSING_ERROR'));
        }
      }
      return claimed.length;
    },
  };
}
