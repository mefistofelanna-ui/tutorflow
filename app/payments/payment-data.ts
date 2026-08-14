export type Payment={id:string;studentId:string;date:string;lessonPrice:number;lessonCount:number;amount:number};
export const paymentStorageKey="tutorflow-payments-v1";
export function readPayments():Payment[]{if(typeof window==="undefined")return[];const saved=window.localStorage.getItem(paymentStorageKey);if(!saved)return[];try{return JSON.parse(saved) as Payment[]}catch{return[]}}
export function writePayments(payments:Payment[]){window.localStorage.setItem(paymentStorageKey,JSON.stringify(payments));window.dispatchEvent(new Event("tutorflow-data-change"))}
