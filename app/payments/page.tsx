"use client";
import { useEffect,useMemo,useState } from "react";
import StudentsShell from "../students/StudentsShell";
import { initialStudents,readStudents,Student } from "../students/student-data";
import {currentLessonPrice} from "../students/student-price";
import { Payment,readPayments } from "./payment-data";
import {deletePaymentTransaction,savePaymentTransaction} from "../../lib/firebase-operations";
import "../students/students.css";
import "./payments.css";
import PaymentForm from "./PaymentForm";
import { useFinancialData } from "./use-financial-data";
import { financeLabel, kopecks, savedLessonPrice } from "./payment-calculation";
import LessonMenu from "../schedule/LessonMenu";

const months=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const money=(value:number)=>`${value.toLocaleString("ru-RU")} ₽`;
type Dialog={kind:"add";studentId?:string}|{kind:"edit"|"delete";payment:Payment}|null;

export default function PaymentsPage(){
 const finance = useFinancialData();
 const now=new Date(),[students,setStudents]=useState<Student[]>(initialStudents),[payments,setPayments]=useState<Payment[]>([]),[month,setMonth]=useState(now.getMonth()),[year,setYear]=useState(now.getFullYear()),[dialog,setDialog]=useState<Dialog>(null),[toast,setToast]=useState("");
 useEffect(()=>{const load=()=>{setStudents(readStudents());setPayments(readPayments())},timer=window.setTimeout(load,0);window.addEventListener("tutorflow-data-change",load);return()=>{window.clearTimeout(timer);window.removeEventListener("tutorflow-data-change",load)}},[]);
 const monthly=useMemo(()=>payments.filter(payment=>{const date=new Date(`${payment.date}T12:00:00`);return date.getMonth()===month&&date.getFullYear()===year}).sort((a,b)=>b.date.localeCompare(a.date)),[payments,month,year]);
 const monthLessons=finance.lessons.filter(item=>item.status==="completed"&&item.date.startsWith(`${year}-${String(month+1).padStart(2,"0")}-`));
 const received=monthly.reduce((sum,payment)=>sum+kopecks(payment.amount),0)/100,charged=monthLessons.reduce((sum,item)=>sum+kopecks(savedLessonPrice(item)??0),0)/100,missingPrice=monthLessons.some(item=>savedLessonPrice(item)===null),needPayment=students.filter(student=>finance.forStudent(student.id).balance<0).length;
 const notify=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2300)};
 const save=async(payment:Payment,previous?:Payment)=>{try{await savePaymentTransaction(payment,previous);setDialog(null);notify(previous?"Оплата обновлена":"Оплата добавлена")}catch(error){throw new Error(error instanceof Error && !error.message.startsWith("Firebase:") ? error.message : "Не удалось сохранить оплату. Попробуйте ещё раз.")}};
 const remove=async(payment:Payment)=>{try{await deletePaymentTransaction(payment.id);setDialog(null);notify("Оплата удалена")}catch{notify("Не удалось удалить оплату. Попробуйте ещё раз.")}};
 const shiftMonth=(amount:number)=>{const date=new Date(year,month+amount,1);setMonth(date.getMonth());setYear(date.getFullYear())};
 const lastFor=(studentId:string)=>payments.filter(payment=>payment.studentId===studentId).sort((a,b)=>b.date.localeCompare(a.date))[0];
 return <StudentsShell active="Оплаты" toast={toast}><header className="students-header payments-header"><div><h1>Оплаты</h1><p>Платежи, начисления и баланс</p></div><button className="students-add" onClick={()=>setDialog({kind:"add"})}>+ Добавить оплату</button></header>
 <div className="payment-stats"><article className="payment-stat lavender"><span>Получено за месяц</span><strong>{money(received)}</strong></article><article className="payment-stat sage"><span>Начислено за месяц</span><strong>{missingPrice?"Уточните стоимость":money(charged)}</strong></article><article className="payment-stat peach"><span>Учеников с долгом</span><strong>{needPayment}</strong></article></div>
 <section className="payer-section"><h2>Ученики</h2><div className="payer-list">{students.map((student,index)=>{const last=lastFor(student.id);return <article className="payer-card" key={student.id}><div className={`student-list-avatar avatar-${index%4}`}>{student.name.split(" ").map(part=>part[0]).join("").slice(0,2)}</div><div className="payer-name"><strong>{student.name}</strong><span>{money(currentLessonPrice(student))} / занятие</span></div><div className="payer-balance" data-debt={finance.forStudent(student.id).balance<0}><strong>{financeLabel(finance.forStudent(student.id))}</strong></div><div className="last-payment"><span>Последняя оплата</span><strong>{last?money(last.amount):"—"}</strong></div><button onClick={()=>setDialog({kind:"add",studentId:student.id})}>Добавить оплату</button></article>})}</div></section>
 <section className="payment-history"><div className="history-heading"><h2>История оплат</h2><div><button onClick={()=>shiftMonth(-1)}>←</button><strong>{months[month]} {year}</strong><button onClick={()=>shiftMonth(1)}>→</button></div></div>{monthly.length?<div className="payment-rows">{monthly.map((payment,index)=>{const student=students.find(item=>item.id===payment.studentId);return <article className="payment-row" key={payment.id}><time>{new Date(`${payment.date}T12:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</time><div className={`student-list-avatar avatar-${index%4}`}>{student?.name.split(" ").map(part=>part[0]).join("").slice(0,2)}</div><strong>{student?.name??"Ученик"}</strong><span>Фактическая оплата</span><b>{money(payment.amount)}</b><LessonMenu className="payment-menu" popupClassName="payment-menu-popup" label={`Действия с оплатой: ${student?.name??"Ученик"}`}><button onClick={()=>setDialog({kind:"edit",payment})}>Редактировать оплату</button><button onClick={()=>setDialog({kind:"delete",payment})}>Удалить оплату</button></LessonMenu></article>})}</div>:<div className="payments-empty"><img src="/asset-books-lavender.png" alt=""/><h3>Пока нет оплат</h3><p>Добавьте первую оплату, чтобы начать вести историю.</p><button className="students-add" onClick={()=>setDialog({kind:"add"})}>+ Добавить оплату</button></div>}</section>
 {(dialog?.kind==="add"||dialog?.kind==="edit")&&<PaymentForm students={students} initialStudentId={dialog.kind==="add"?dialog.studentId:undefined} initial={dialog.kind==="edit"?dialog.payment:undefined} onCancel={()=>setDialog(null)} onSave={payment=>save(payment,dialog.kind==="edit"?dialog.payment:undefined)}/>} {dialog?.kind==="delete"&&<DeletePayment payment={dialog.payment} student={students.find(item=>item.id===dialog.payment.studentId)} onCancel={()=>setDialog(null)} onDelete={()=>remove(dialog.payment)}/>}</StudentsShell>
}

function DeletePayment({payment,student,onDelete,onCancel}:{payment:Payment;student?:Student;onDelete:()=>void;onCancel:()=>void}){return <div className="student-modal-backdrop"><section className="payment-modal delete-payment"><header><h2>Удалить оплату?</h2><button onClick={onCancel}>×</button></header><p>Удалить оплату <b>{student?.name}</b> на сумму <b>{money(payment.amount)}</b>? Баланс уменьшится на сумму этой оплаты.</p><div className="modal-actions"><button onClick={onCancel}>Отмена</button><button className="danger-button" onClick={onDelete}>Удалить оплату</button></div></section></div>}
