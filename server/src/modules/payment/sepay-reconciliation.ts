import type { Store } from "../../contracts/core";
import type { SepayConfig } from "./sepay";
import { sepayStore, type SepayTransactionFilter } from "./infrastructure/sepay-store";
export function createSepayReconciliation(db:Store,config:SepayConfig) {
  const store=sepayStore(db,config);
  return {list:(status:string|null,offset:number,limit:number,filter?:SepayTransactionFilter)=>store.listTransactions(status,offset,limit,filter),
    detail:(id:string)=>store.transaction(id),reviews:(id:string)=>store.reviews(id),
    reprocess:(id:string)=>store.reprocess(id),review:(tx:string,actor:string,action:string,reason:string,evidence:string|null)=>store.addReview(tx,actor,action,reason,evidence),
    resolve:async(tx:string,actor:string,outcome:string,reason:string,evidence:string|null)=>{await store.addReview(tx,actor,outcome,reason,evidence);return store.resolve(tx,actor,reason);},
    pendingCount:()=>store.pendingCount()};
}
