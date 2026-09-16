import assert from "node:assert/strict";
import test from "node:test";
import { calculateFinance, financeLabel, lessonStatusFields, planPayment, savedLessonPrice } from "../app/payments/payment-calculation.ts";
import type { Student } from "../app/students/student-data.ts";
import type { Lesson } from "../app/schedule/lesson-data.ts";
import type { Payment } from "../app/payments/payment-data.ts";
const student:Student={id:"s",name:"Test",grade:"",days:"",comment:"",price:800,balance:99,moneyCredit:999};
const lesson=(overrides:Partial<Lesson>={}):Lesson=>({id:"l",studentId:"s",date:"2026-09-02",time:"15:00",duration:60,status:"completed",paid:false,charged:false,note:"",earnedAmount:800,...overrides});
const payment=(overrides:Partial<Payment>={}):Payment=>({id:"p",studentId:"s",date:"2026-09-01",amount:5000,...overrides});

test("5000 payment, six 800 lessons, then seventh lesson",()=>{
 const payments=[payment()],lessons=Array.from({length:6},(_,i)=>lesson({id:String(i)}));
 assert.equal(calculateFinance("s",[],payments).balance,5000);
 assert.equal(calculateFinance("s",lessons,payments).balance,200);
 assert.equal(calculateFinance("s",[...lessons,lesson({id:"7"})],payments).balance,-600);
});
test("payment timing, arbitrary amounts, partial payments and exact kopecks",()=>{
 const lessons=[lesson({earnedAmount:0.3})];
 assert.equal(calculateFinance("s",lessons,[]).balance,-0.3);
 assert.equal(calculateFinance("s",lessons,[payment({amount:0.1}),payment({id:"p2",amount:0.2,date:"2026-10-01"})]).balance,0);
 assert.equal(calculateFinance("s",[lesson()],[payment({amount:200})]).balance,-600);
});
test("only completed lessons accrue charges, irrespective of old charged and paid flags",()=>{
 const result=calculateFinance("s",[lesson(),lesson({status:"scheduled",charged:true}),lesson({status:"cancelled",charged:true}),lesson({status:"rescheduled",charged:true})],[]);
 assert.equal(result.charged,800);assert.equal(result.cancelled,1);assert.equal(result.completed,1);
});
test("status changes are idempotent and preserve historical price after tariff change",()=>{
 let item=lesson({status:"scheduled",earnedAmount:undefined});
 item={...item,...lessonStatusFields(item,"completed",800)};
 item={...item,...lessonStatusFields(item,"completed",1200)};
 assert.equal(calculateFinance("s",[item],[]).balance,-800);
 item={...item,...lessonStatusFields(item,"cancelled",1200)};
 assert.equal(calculateFinance("s",[item],[]).balance,0);
 item={...item,...lessonStatusFields(item,"completed",1200)};
 assert.equal(calculateFinance("s",[item],[]).balance,-800);
});
test("legacy lessonPrice and zero prices remain historical; missing price is never invented",()=>{
 assert.equal(savedLessonPrice(lesson({earnedAmount:undefined,lessonPrice:600})),600);
 assert.equal(savedLessonPrice(lesson({earnedAmount:0,lessonPrice:600})),0);
 const result=calculateFinance("s",[lesson({earnedAmount:undefined})],[payment()]);
 assert.equal(result.missingPrice,1);assert.equal(financeLabel(result),"Уточните стоимость занятий");
});
test("monthly totals and all-time balance are independent and student-specific",()=>{
 const lessons=[lesson(),lesson({id:"older",date:"2026-08-31",earnedAmount:1000}),lesson({id:"cancel",status:"cancelled"}),lesson({id:"other",studentId:"other"})];
 const payments=[payment({amount:500,date:"2026-08-01"}),payment({id:"new",amount:900}),payment({studentId:"other"})];
 assert.deepEqual(calculateFinance("s",lessons,payments,"2026-09"),{completed:1,cancelled:1,charged:800,paid:900,balance:100,missingPrice:0});
 assert.equal(calculateFinance("s",lessons,payments).balance,-400);
 assert.equal(calculateFinance("s",lessons,payments,"2025-09").charged,0);
});
test("legacy actual payments are preserved even with inconsistent package metadata",()=>{
 const old=payment({lessonCount:8,lessonPrice:1000,moneyCreditBefore:200,moneyCreditAfter:0});
 const copy=structuredClone(old);
 assert.equal(calculateFinance("s",[],[old]).balance,5000);
 const result=planPayment({...old,date:"2026-09-03"},old,[{...student,price:1500}]);
 assert.deepEqual(result.payment,{...old,date:"2026-09-03"});assert.deepEqual(old,copy);
 assert.deepEqual(planPayment({...old,amount:300},old,[student]).payment,{...old,amount:300});
});
test("new payment contains actual amount without package metadata or student balance changes",()=>{
 const copy=structuredClone(student);
 assert.deepEqual(planPayment(payment(),null,[student]),{payment:payment()});assert.deepEqual(student,copy);
 assert.equal(planPayment(payment({amount:50}),null,[{...student,price:0}]).payment.amount,50);
 for(const amount of [0,-1,NaN,Infinity])assert.throws(()=>planPayment(payment({amount}),null,[student]));
 assert.throws(()=>planPayment(payment(),null,[]));
 assert.throws(()=>planPayment(payment({studentId:"other"}),payment(),[{...student,id:"other"}]));
});
test("payment edits and removal affect only the actual paid amount",()=>{
 const lessons=[lesson()],old=payment({amount:200});
 assert.equal(calculateFinance("s",lessons,[old]).balance,-600);
 const edited=planPayment({...old,amount:1000},old,[student]).payment;
 assert.equal(calculateFinance("s",lessons,[edited]).balance,200);
 assert.equal(calculateFinance("s",lessons,[]).balance,-800);
});
test("financial labels",()=>{
 assert.equal(financeLabel({balance:0}),"Оплачено");
 assert.equal(financeLabel({balance:200}),"Аванс: 200 ₽");
 assert.equal(financeLabel({balance:-600},false),"Долг 600 ₽");
});

test("cancelling a legacy lesson without a price removes its charge without inventing a later price",()=>{
 let item=lesson({earnedAmount:undefined});
 item={...item,...lessonStatusFields(item,"cancelled",1200)};
 assert.equal(calculateFinance("s",[item],[]).missingPrice,0);
 assert.equal(calculateFinance("s",[item],[]).balance,0);
 item={...item,...lessonStatusFields(item,"completed",1500)};
 assert.equal(savedLessonPrice(item),null);
 assert.equal(calculateFinance("s",[item],[]).missingPrice,1);
});
