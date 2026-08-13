"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import StudentsShell from "../StudentsShell";
import StudentForm from "../StudentForm";
import { initialStudents,readStudents,Student,writeStudents } from "../student-data";
import "../students.css";

export default function StudentDetail(){
 const [student,setStudent]=useState<Student|null>(null),[editing,setEditing]=useState(false),[toast,setToast]=useState("");
 useEffect(()=>{const id=decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop()||"");setStudent(readStudents().find(s=>s.id===id)??null)},[]);
 const save=(value:Student)=>{const all=readStudents(),next=all.some(s=>s.id===value.id)?all.map(s=>s.id===value.id?value:s):[...all,value];writeStudents(next);setStudent(value);setEditing(false);setToast("Данные ученика обновлены");window.setTimeout(()=>setToast(""),2300)};
 const tone=(n:number)=>n>=5?"balance-good":n>=2?"balance-warn":"balance-low";
 if(!student)return <StudentsShell><Link className="student-back" href="/students">← К списку учеников</Link><div className="detail-card">Ученик не найден</div></StudentsShell>;
 return <StudentsShell toast={toast}><Link className="student-back" href="/students">← К списку учеников</Link><section className="detail-card"><div className="detail-top"><div><h1>{student.name}</h1><span className="student-grade">{student.grade||"Класс не указан"}</span></div><button className="edit-button" onClick={()=>setEditing(true)}>Редактировать</button></div><div className="detail-grid"><div className="detail-item"><span>Класс</span><strong>{student.grade||"—"}</strong></div><div className="detail-item"><span>Стоимость занятия</span><strong>{student.price.toLocaleString("ru-RU")} ₽</strong></div><div className="detail-item"><span>Остаток</span><b className={`balance-pill ${tone(student.balance)}`}>{student.balance}</b></div><div className="detail-item"><span>Дни занятий</span><strong>{student.days||"—"}</strong></div></div><div className="detail-comment"><b>Комментарий</b><p>{student.comment||"Без комментария"}</p></div></section><div className="detail-placeholders"><section className="placeholder-card"><h2>История занятий</h2><p>История занятий появится после подключения расписания.</p></section><section className="placeholder-card"><h2>Оплаты</h2><p>История оплат появится после подключения раздела “Оплаты”.</p></section></div>{editing&&<StudentForm title="Редактировать ученика" initial={student} onSave={save} onCancel={()=>setEditing(false)}/>}</StudentsShell>
}
