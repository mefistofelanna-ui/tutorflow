import {doc,runTransaction,serverTimestamp} from "firebase/firestore";
import {db} from "./firebase";
import type {Payment} from "../app/payments/payment-data";
import type {Student} from "../app/students/student-data";
import {planPayment,reversePayment} from "../app/payments/payment-calculation";

export async function completeLessonTransaction(lessonId:string,studentId:string,price:number,note=""){
 return runTransaction(db,async transaction=>{const lessonRef=doc(db,"lessons",lessonId),studentRef=doc(db,"students",studentId);const [lessonSnap,studentSnap]=await Promise.all([transaction.get(lessonRef),transaction.get(studentRef)]);if(!lessonSnap.exists()||!studentSnap.exists())throw new Error("missing");const lesson=lessonSnap.data();if(lesson.status==="completed"||lesson.charged)return false;const balance=Number(studentSnap.data().balance??0);transaction.update(lessonRef,{status:"completed",charged:true,earnedAmount:price,note,updatedAt:serverTimestamp()});transaction.update(studentRef,{balance:Math.max(0,balance-1),updatedAt:serverTimestamp()});return true});
}

export async function savePaymentTransaction(payment:Payment,expected?:Payment){
 return runTransaction(db,async transaction=>{
  const paymentRef=doc(db,"payments",payment.id),paymentSnap=await transaction.get(paymentRef);
  const previous=paymentSnap.exists()?paymentSnap.data() as Payment:null;
  if(expected){
   if(!previous)throw new Error("Эта оплата уже удалена. Закройте форму и обновите историю.");
   const fields=(['studentId','date','amount','lessonPrice','lessonCount','moneyCreditBefore','moneyCreditAfter'] as const);
   if(fields.some(field=>previous[field]!==expected[field]))throw new Error("Оплата изменилась после открытия формы. Откройте её заново и проверьте расчёт.");
  }
  const ids=[...new Set([payment.studentId,previous?.studentId].filter(Boolean) as string[])];
  const snaps=await Promise.all(ids.map(id=>transaction.get(doc(db,"students",id))));
  if(snaps.some(snap=>!snap.exists()))throw new Error("Student not found");
  const students=snaps.map((snap,index)=>({...snap.data(),id:ids[index],balance:Number(snap.data()?.balance??0)}) as Student);
  const result=planPayment(payment,previous,students);
  for(const {id,...values} of result.updates)transaction.update(doc(db,"students",id),{...values,updatedAt:serverTimestamp()});
  transaction.set(paymentRef,{...result.payment,...(!previous?{createdAt:serverTimestamp()}:{}),updatedAt:serverTimestamp()},{merge:true});
  return result.payment;
 });
}

export async function deletePaymentTransaction(paymentId:string){
 return runTransaction(db,async transaction=>{const paymentRef=doc(db,"payments",paymentId),paymentSnap=await transaction.get(paymentRef);if(!paymentSnap.exists())return;const payment=paymentSnap.data() as Payment,studentRef=doc(db,"students",payment.studentId),studentSnap=await transaction.get(studentRef);if(!studentSnap.exists())throw new Error("Student not found");const student=studentSnap.data();transaction.update(studentRef,{...reversePayment({balance:Number(student.balance??0),moneyCredit:Number(student.moneyCredit??0)},payment),updatedAt:serverTimestamp()});transaction.delete(paymentRef)})
}
