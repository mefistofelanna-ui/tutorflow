"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { initialStudents, readStudents, Student, writeStudents } from "./student-data";
import StudentForm, { StudentSchedule } from "./StudentForm";
import StudentsShell from "./StudentsShell";
import { Lesson, readLessons, writeLessons } from "../schedule/lesson-data";
import { buildSeriesLessons, conflictsFor, LessonSeries, readSeries, writeSeries } from "../schedule/series-data";
import "./students.css";

type PendingAdd = { student:Student; schedule:StudentSchedule; series?:LessonSeries; created:Lesson[]; conflicts:Lesson[] };
const formatConflict = (lesson:Lesson, students:Student[]) => {
  const date = new Date(`${lesson.date}T12:00:00`).toLocaleDateString("ru-RU", { day:"numeric", month:"long" });
  const [hours,minutes] = lesson.time.split(":").map(Number);
  const end = hours * 60 + minutes + lesson.duration;
  const endTime = `${String(Math.floor(end / 60)).padStart(2,"0")}:${String(end % 60).padStart(2,"0")}`;
  return `${date}, ${lesson.time}–${endTime} — ${students.find(item => item.id === lesson.studentId)?.name ?? "Ученик"}`;
};

export default function StudentsPage() {
  const [students,setStudents] = useState<Student[]>(initialStudents);
  const [query,setQuery] = useState("");
  const [adding,setAdding] = useState(false);
  const [pending,setPending] = useState<PendingAdd|null>(null);
  const [toast,setToast] = useState("");
  const router = useRouter();

  useEffect(() => { const timeout=window.setTimeout(() => { setStudents(readStudents()); if(new URLSearchParams(window.location.search).get("add") === "1") setAdding(true); },0); return () => window.clearTimeout(timeout); },[]);
  const filtered = useMemo(() => students.filter(student => !student.archived && student.name.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"))),[students,query]);
  const commit = (request:PendingAdd, skipConflicts=false) => {
    const conflictIds = new Set(request.conflicts.map(item => item.id));
    const created = skipConflicts ? request.created.filter(item => !conflictIds.has(item.id)) : request.created;
    const next = [...students,request.student];
    setStudents(next); writeStudents(next); writeLessons([...readLessons(),...created]);
    if(request.series) writeSeries([...readSeries(),request.series]);
    setPending(null); setAdding(false); setToast("Ученик добавлен"); window.setTimeout(() => setToast(""),2300);
  };
  const add = (student:Student,schedule?:StudentSchedule) => {
    if(!schedule) return;
    const lessons=readLessons();
    let series:LessonSeries|undefined;
    let created:Lesson[];
    if(schedule.mode === "weekly") {
      series={id:`series-${Date.now()}`,studentId:student.id,weekdays:schedule.weekdays,time:schedule.time,duration:schedule.duration,startDate:schedule.date,endDate:schedule.endDate};
      created=buildSeriesLessons(series);
      const labels=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
      student.days=`${schedule.weekdays.map(day => labels[day]).join(", ")} · ${schedule.time}`;
    } else {
      created=[{id:`lesson-${Date.now()}`,studentId:student.id,date:schedule.date,time:schedule.time,duration:schedule.duration,status:"scheduled",paid:true,note:"",charged:false}];
      student.days="Плавающий график";
    }
    const conflicts=created.filter(candidate => conflictsFor(candidate,lessons).length);
    const request={student,schedule,series,created,conflicts};
    if(conflicts.length) { setPending(request); return; }
    commit(request);
  };
  const tone=(value:number)=>value>=5?"balance-good":value>=2?"balance-warn":"balance-low";

  return <StudentsShell toast={toast}>
    <header className="students-header"><div><h1>Ученики</h1><p>Все ученики и важная информация в одном месте</p></div><button className="students-add" onClick={() => setAdding(true)}>+ Добавить ученика</button></header>
    <div className="students-toolbar"><label className="search-wrap"><span className="sr-only">Поиск по имени</span><input className="students-search" placeholder="Поиск по имени" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
    <div className="student-grid">{filtered.map((student,index) => <article className={`student-card decor-${index%3}`} key={student.id} tabIndex={0} onClick={() => router.push(`/students/${student.id}`)} onKeyDown={event => { if(event.key === "Enter" || event.key === " ") router.push(`/students/${student.id}`); }}><div className={`student-list-avatar avatar-${index%4}`}>{student.name.split(" ").map(part => part[0]).join("").slice(0,2)}</div><div className="student-card-body"><h2>{student.name}</h2><span className="student-grade">{student.grade||"Класс не указан"}</span><div className="student-facts"><div className="student-fact"><span>Стоимость занятия</span><strong>{student.price.toLocaleString("ru-RU")} ₽</strong></div><div className="student-fact"><span>Остаток занятий</span><b className={`balance-pill ${tone(student.balance)}`}>{student.balance}</b></div><div className="student-fact"><span>Дни занятий</span><strong>{student.days||"—"}</strong></div></div><p className="student-comment">{student.comment||"Без комментария"}</p></div></article>)}{!filtered.length&&<div className="empty-students">Ученики не найдены</div>}</div>
    {adding&&<StudentForm title="Новый ученик" onSave={add} onCancel={() => { setAdding(false); setPending(null); }}/>}
    {pending&&<div className="student-modal-backdrop conflict-backdrop"><section className="student-modal conflict-modal" role="alertdialog" aria-modal="true"><h2>{pending.schedule.mode === "weekly" ? "Найдены конфликты" : "Это время уже занято"}</h2><ul>{pending.conflicts.slice(0,12).map(candidate => { const occupied=conflictsFor(candidate,readLessons())[0]; return <li key={candidate.id}>{occupied ? formatConflict(occupied,students) : candidate.date}</li>; })}</ul>{pending.conflicts.length>12&&<p>И ещё: {pending.conflicts.length-12}</p>}<div className="form-actions"><button className="form-cancel" onClick={() => { setPending(null); setAdding(false); }}>Отмена</button><button className="form-cancel" onClick={() => setPending(null)}>Изменить расписание</button>{pending.schedule.mode === "weekly"&&<button className="form-save" onClick={() => commit(pending,true)}>Пропустить конфликтующие даты</button>}</div></section></div>}
  </StudentsShell>;
}
