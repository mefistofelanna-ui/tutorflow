import {cached,replaceCollection} from "../../lib/firestore-store";
export type Payment={id:string;studentId:string;date:string;lessonPrice:number;lessonCount:number;amount:number;moneyCreditBefore?:number;moneyCreditAfter?:number};
export const paymentStorageKey="tutorflow-payments-v1";
export function readPayments():Payment[]{return cached<Payment>("payments")}
export function writePayments(payments:Payment[]){return replaceCollection("payments",payments).catch(error=>{window.dispatchEvent(new CustomEvent("tutorflow-error",{detail:"Не удалось сохранить оплаты."}));throw error})}
