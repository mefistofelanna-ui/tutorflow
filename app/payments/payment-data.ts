import {cached,replaceCollection} from "../../lib/firestore-store";
export type Payment={id:string;studentId:string;date:string;lessonPrice:number;lessonCount:number;amount:number};
export const paymentStorageKey="tutorflow-payments-v1";
export function readPayments():Payment[]{return cached<Payment>("payments")}
export function writePayments(payments:Payment[]){void replaceCollection("payments",payments).catch(()=>window.dispatchEvent(new CustomEvent("tutorflow-error",{detail:"Не удалось сохранить оплаты."})))}
