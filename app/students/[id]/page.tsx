"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Payment, readPayments } from "../../payments/payment-data";
import { Lesson, readLessons, writeLessons } from "../../schedule/lesson-data";
import { buildSeriesLessons, conflictsFor, formatSeriesSchedule, LessonSeries, readSeries, seriesSlots, writeSeries } from "../../schedule/series-data";
import { archiveStudentData, deleteStudentData } from "../../../lib/firestore-store";
import StudentForm, { StudentSchedule } from "../StudentForm";
import StudentsShell from "../StudentsShell";
import { readStudents, Student, writeStudents } from "../student-data";
import "../students.css";

const labels=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`};

export default function StudentDetail(){
 const [student,setStudent]=useState<Student|null>(null);
 const [lessons,setLessons]=useState<Lesson[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [series,setSeries]=useState<LessonSeries|null>(null);
 const [editing,setEditing]=useState(false);
 const [confirm,setConfirm]=useState<"archive"|"delete"|null>(null);
 const [toast,setToast]=useState("");
 const [busy,setBusy]=useState(false);
 const [actionError,setActionError]=useState("");
 useEffect(()=>{const id=decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop()||""),load=()=>{setStudent(readStudents().find(item=>item.id===id)??null);setLessons(readLessons().filter(item=>item.studentId===id).sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)));setPayments(readPayments().filter(item=>item.studentId===id).sort((a,b)=>b.date.localeCompare(a.date)));setSeries(readSeries().find(item=>item.studentId===id)??null)},timeout=window.setTimeout(load,0);window.addEventListener("tutorflow-data-change",load);return()=>{window.clearTimeout(timeout);window.removeEventListener("tutorflow-data-change",load)}},[]);
 const actualDays=useMemo(()=>series?formatSeriesSchedule(series,labels):student?.days||"Плавающий график",[series,student]);
 const save=async(value:Student,schedule?:StudentSchedule)=>{let nextLessons=readLessons(),nextSeries=readSeries();try{if(series&&schedule){if(!window.confirm("Применить новое расписание ко всем будущим занятиям?"))return;const changed:LessonSeries={...series,slots:schedule.slots,startDate:schedule.date,endDate:schedule.endDate};delete changed.weekdays;delete changed.time;delete changed.duration;const replaceIds=new Set(nextLessons.filter(item=>item.seriesId===series.id&&item.date>=today()&&(item.status==="scheduled"||item.status==="rescheduled")).map(item=>item.id)),remaining=nextLessons.filter(item=>!replaceIds.has(item.id)),protectedIds=new Set(remaining.filter(item=>item.seriesId===series.id&&(item.status==="completed"||item.status==="cancelled"||item.seriesOverride)).map(item=>item.id)),future=buildSeriesLessons(changed).filter(item=>item.date>=today()&&!protectedIds.has(item.id)),conflicts=future.filter(item=>conflictsFor(item,remaining).length);if(conflicts.length){window.alert(`Найдены конфликты: ${conflicts.length}. Измените расписание.`);return}nextLessons=[...remaining,...future];nextSeries=nextSeries.map(item=>item.id===series.id?changed:item);value.days=formatSeriesSchedule(changed,labels);await Promise.all([writeLessons(nextLessons),writeSeries(nextSeries),writeStudents(readStudents().map(item=>item.id===value.id?value:item))]);setSeries(changed);setLessons(nextLessons.filter(item=>item.studentId===value.id).sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)))}else await writeStudents(readStudents().map(item=>item.id===value.id?value:item));setStudent(value);setEditing(false);setToast("Данные ученика обновлены");window.setTimeout(()=>setToast(""),2300)}catch{window.alert("Не удалось сохранить изменения. Проверьте подключение и попробуйте ещё раз.")}};
 const archive=async()=>{if(!student||busy)return;setBusy(true);setActionError("");try{await archiveStudentData(student.id,today());window.location.href="/students"}catch{setActionError("Не удалось архивировать ученика. Проверьте подключение и попробуйте ещё раз.");setBusy(false)}};
 const remove=async()=>{if(!student||busy)return;setBusy(true);setActionError("");try{await deleteStudentData(student.id);window.location.href="/students"}catch{setActionError("Не удалось удалить ученика. Данные не были удалены полностью — проверьте подключение и попробуйте ещё раз.");setBusy(false)}};
 const tone=(value:number)=>value>=5?"balance-good":value>=2?"balance-warn":"balance-low";
 if(!student)return <StudentsShell><Link className="student-back" href="/students">← К списку учеников</Link><div className="detail-card">Ученик не найден</div></StudentsShell>;
 const initialSchedule=series?{mode:"weekly" as const,date:series.startDate,time:series.time??"15:00",duration:series.duration??60,weekdays:series.weekdays??[],slots:seriesSlots(series),endDate:series.endDate}:undefined;
 return <StudentsShell toast={toast}>
  <Link className="student-back" href="/students">← К списку учеников</Link>
  <section className="detail-card"><div className="detail-top"><div><h1>{student.name}</h1><span className="student-grade">{student.grade||"Класс не указан"}</span></div><div className="detail-actions"><button className="edit-button" onClick={()=>setEditing(true)}>Редактировать</button><details><summary>•••</summary><div><button onClick={()=>setConfirm("archive")}>Архивировать ученика</button><button className="delete-student" onClick={()=>setConfirm("delete")}>Удалить навсегда</button></div></details></div></div><div className="detail-grid"><div className="detail-item"><span>Класс</span><strong>{student.grade||"—"}</strong></div><div className="detail-item"><span>Стоимость занятия</span><strong>{student.price.toLocaleString("ru-RU")} ₽</strong></div><div className="detail-item"><span>Остаток</span><b className={`balance-pill ${tone(student.balance)}`}>{student.balance}</b></div><div className="detail-item"><span>Дни занятий</span><strong>{actualDays}</strong></div></div><div className="detail-comment"><b>Комментарий</b><p>{student.comment||"Без комментария"}</p></div></section>
  <div className="detail-placeholders"><section className="placeholder-card lesson-history"><h2>История занятий</h2>{lessons.length?lessons.map(item=><article key={item.id}><div><strong>{new Date(`${item.date}T12:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}, {item.time}</strong><span className={`history-status ${item.status}`}>{item.status==="completed"?"Проведено":item.status==="cancelled"?"Отменено":item.status==="rescheduled"?"Перенесено":"Запланировано"}</span></div>{item.note&&<p>{item.note}</p>}</article>):<p>Занятий пока нет.</p>}</section><section className="placeholder-card student-payments"><h2>Оплаты</h2>{payments.length?payments.map(item=><article key={item.id}><strong>{new Date(`${item.date}T12:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</strong><span>{item.lessonCount} занятий · {item.lessonPrice.toLocaleString("ru-RU")} ₽ / занятие</span><b>{item.amount.toLocaleString("ru-RU")} ₽</b></article>):<p>Пока нет оплат.</p>}</section></div>
  {editing&&<StudentForm title="Редактировать ученика" initial={student} initialSchedule={initialSchedule} onSave={save} onCancel={()=>setEditing(false)}/>}
  {confirm&&<div className="student-modal-backdrop"><section className="student-modal" role="alertdialog" aria-modal="true"><h2>{confirm==="archive"?`Архивировать ${student.name}?`:"Удалить ученика навсегда?"}</h2><p>{confirm==="archive"?"Ученик исчезнет из активного списка, но история занятий и оплат сохранится.":"Это действие нельзя отменить."}</p>{actionError&&<p className="action-error" role="alert">{actionError}</p>}<div className="form-actions"><button disabled={busy} className="form-cancel" onClick={()=>{setConfirm(null);setActionError("")}}>Отмена</button><button disabled={busy} className={confirm==="delete"?"form-save danger-confirm":"form-save"} onClick={confirm==="archive"?archive:remove}>{busy?(confirm==="archive"?"Архивирование…":"Удаление…"):(confirm==="archive"?"Архивировать":"Удалить навсегда")}</button></div></section></div>}
 </StudentsShell>;
}
