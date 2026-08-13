"use client";
import { useEffect,useMemo,useState } from "react";
import { useRouter } from "next/navigation";
import StudentsShell from "./StudentsShell";
import StudentForm from "./StudentForm";
import { initialStudents,readStudents,Student,writeStudents } from "./student-data";
import "./students.css";

export default function StudentsPage(){
 const [students,setStudents]=useState<Student[]>(initialStudents),[query,setQuery]=useState(""),[adding,setAdding]=useState(false),[toast,setToast]=useState("");const router=useRouter();
 useEffect(()=>setStudents(readStudents()),[]);
 const filtered=useMemo(()=>students.filter(s=>s.name.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"))),[students,query]);
 const add=(student:Student)=>{const next=[...students,student];setStudents(next);writeStudents(next);setAdding(false);setToast("Ученик добавлен");window.setTimeout(()=>setToast(""),2300)};
 const tone=(n:number)=>n>=5?"balance-good":n>=2?"balance-warn":"balance-low";
 return <StudentsShell toast={toast}><header className="students-header"><div><h1>Ученики</h1><p>Все ученики и важная информация в одном месте</p></div><button className="students-add" onClick={()=>setAdding(true)}>+ Добавить ученика</button></header><div className="students-toolbar"><label className="search-wrap"><span className="sr-only">Поиск по имени</span><input className="students-search" placeholder="Поиск по имени" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><div className="student-grid">{filtered.map(s=><article className="student-card" key={s.id} tabIndex={0} onClick={()=>router.push(`/students/${s.id}`)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")router.push(`/students/${s.id}`)}}><h2>{s.name}</h2><span className="student-grade">{s.grade||"Класс не указан"}</span><div className="student-facts"><div className="student-fact"><span>Стоимость занятия</span><strong>{s.price.toLocaleString("ru-RU")} ₽</strong></div><div className="student-fact"><span>Остаток занятий</span><b className={`balance-pill ${tone(s.balance)}`}>{s.balance}</b></div></div><p className="student-comment">{s.comment||"Без комментария"}</p></article>)}{!filtered.length&&<div className="empty-students">Ученики не найдены</div>}</div>{adding&&<StudentForm title="Новый ученик" onSave={add} onCancel={()=>setAdding(false)}/>}</StudentsShell>
}

