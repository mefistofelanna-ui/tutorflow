import {doc,runTransaction,serverTimestamp} from "firebase/firestore";
import {db} from "./firebase";
import type {Payment} from "../app/payments/payment-data";

export async function completeLessonTransaction(lessonId:string,studentId:string,price:number,note=""){
 return runTransaction(db,async transaction=>{const lessonRef=doc(db,"lessons",lessonId),studentRef=doc(db,"students",studentId);const [lessonSnap,studentSnap]=await Promise.all([transaction.get(lessonRef),transaction.get(studentRef)]);if(!lessonSnap.exists()||!studentSnap.exists())throw new Error("missing");const lesson=lessonSnap.data();if(lesson.status==="completed"||lesson.charged)return false;const balance=Number(studentSnap.data().balance??0);transaction.update(lessonRef,{status:"completed",charged:true,earnedAmount:price,note,updatedAt:serverTimestamp()});transaction.update(studentRef,{balance:Math.max(0,balance-1),updatedAt:serverTimestamp()});return true});
}

export async function savePaymentTransaction(payment:Payment){
 return runTransaction(db,async transaction=>{const paymentRef=doc(db,"payments",payment.id),paymentSnap=await transaction.get(paymentRef),previous=paymentSnap.exists()?paymentSnap.data() as Payment:null;const ids=[...new Set([payment.studentId,previous?.studentId].filter(Boolean) as string[])],refs=ids.map(id=>doc(db,"students",id)),snaps=await Promise.all(refs.map(ref=>transaction.get(ref)));for(const [index,id] of ids.entries()){const current=Number(snaps[index].data()?.balance??0),oldCount=previous?.studentId===id?previous.lessonCount:0,newCount=payment.studentId===id?payment.lessonCount:0;transaction.update(refs[index],{balance:Math.max(0,current-oldCount+newCount),updatedAt:serverTimestamp()})}transaction.set(paymentRef,{...payment,...(!paymentSnap.exists()?{createdAt:serverTimestamp()}:{}),updatedAt:serverTimestamp()},{merge:true})});
}

export async function deletePaymentTransaction(paymentId:string){
 return runTransaction(db,async transaction=>{const paymentRef=doc(db,"payments",paymentId),paymentSnap=await transaction.get(paymentRef);if(!paymentSnap.exists())return;const payment=paymentSnap.data() as Payment,studentRef=doc(db,"students",payment.studentId),studentSnap=await transaction.get(studentRef),balance=Number(studentSnap.data()?.balance??0);transaction.update(studentRef,{balance:Math.max(0,balance-payment.lessonCount),updatedAt:serverTimestamp()});transaction.delete(paymentRef)})
}
