import {doc,runTransaction,serverTimestamp} from "firebase/firestore";
import {db} from "./firebase";
import type {Payment} from "../app/payments/payment-data";
import type {Lesson,LessonStatus} from "../app/schedule/lesson-data";
import type {Student} from "../app/students/student-data";
import {planPayment,lessonStatusFields,savedLessonPrice,kopecks} from "../app/payments/payment-calculation";

export async function setLessonStatusTransaction(lessonId:string,studentId:string,status:LessonStatus){
 return runTransaction(db,async transaction=>{
  const lessonRef=doc(db,"lessons",lessonId),studentRef=doc(db,"students",studentId);
  const [lessonSnap,studentSnap]=await Promise.all([transaction.get(lessonRef),transaction.get(studentRef)]);
  if(!lessonSnap.exists()||!studentSnap.exists()||lessonSnap.data().studentId!==studentId)throw new Error("Занятие или ученик не найден");
  const lesson=lessonSnap.data() as Lesson;
  if(lesson.status===status)return false;
  const student=studentSnap.data();
  const fields=lessonStatusFields(lesson,status,Number(student.lessonPrice??student.price));
  transaction.update(lessonRef,{...fields,seriesOverride:true,updatedAt:serverTimestamp()});
  return {...lesson,...fields};
 });
}
export async function completeLessonTransaction(lessonId:string,studentId:string){
 return setLessonStatusTransaction(lessonId,studentId,"completed");
}
export async function saveHistoricalLessonPrice(lessonId:string,amount:number){
 const price=kopecks(amount)/100;
 return runTransaction(db,async transaction=>{
  const ref=doc(db,"lessons",lessonId),snapshot=await transaction.get(ref);
  if(!snapshot.exists())throw new Error("Занятие не найдено");
  const lesson=snapshot.data() as Lesson;
  if(savedLessonPrice(lesson)!==null)throw new Error("Стоимость уже сохранена. Обновите страницу.");
  transaction.update(ref,{earnedAmount:price,historicalPriceMissing:false,updatedAt:serverTimestamp()});
 });
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
  transaction.set(paymentRef,{...result.payment,...(!previous?{createdAt:serverTimestamp()}:{}),updatedAt:serverTimestamp()},{merge:true});
  return result.payment;
 });
}

export async function deletePaymentTransaction(paymentId:string){
 return runTransaction(db,async transaction=>{const paymentRef=doc(db,"payments",paymentId),snapshot=await transaction.get(paymentRef);if(snapshot.exists())transaction.delete(paymentRef)});
}
