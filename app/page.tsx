"use client";

import { useEffect, useState } from "react";
import { initialStudents, readStudents, Student } from "./students/student-data";
import { demoToday, initialLessons, Lesson, readLessons } from "./schedule/lesson-data";
import {useTutorAuth} from "./AppProvider";

const navItems = [
  ["⌂", "Главная"],
  ["□", "Расписание"],
  ["♙", "Ученики"],
  ["₽", "Оплаты"],
  ["↗", "Статистика"],
];

const colors=["purple","blue","peach","sage"];
function dashboardLessons(students=initialStudents,source=initialLessons){return source.filter(lesson=>lesson.date===demoToday).sort((a,b)=>a.time.localeCompare(b.time)).map((lesson,index)=>{const student=students.find(item=>item.id===lesson.studentId);return {id:lesson.id,time:lesson.time,duration:lesson.duration,name:student?.name??"Ученик",grade:student?.grade??"",initials:(student?.name??"У").split(" ").map(part=>part[0]).join("").slice(0,2),color:colors[index%colors.length],paid:lesson.paid,status:lesson.status}})}
const statusNames={scheduled:"Запланировано",completed:"Проведено",cancelled:"Отменено",rescheduled:"Перенесено"};

export default function Home() {
  const {logout}=useTutorAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [students,setStudents]=useState<Student[]>(initialStudents);
  const [sourceLessons,setSourceLessons]=useState<Lesson[]>(initialLessons);
  const lessons=dashboardLessons(students,sourceLessons);
  useEffect(()=>{const load=()=>{setStudents(readStudents());setSourceLessons(readLessons())};const timer=window.setTimeout(load,0);window.addEventListener("tutorflow-data-change",load);window.addEventListener("storage",load);return()=>{window.clearTimeout(timer);window.removeEventListener("tutorflow-data-change",load);window.removeEventListener("storage",load)}},[]);
  const completedThisMonth=sourceLessons.filter(item=>{const date=new Date(`${item.date}T12:00:00`),today=new Date(`${demoToday}T12:00:00`);return item.status==="completed"&&date.getMonth()===today.getMonth()&&date.getFullYear()===today.getFullYear()});
  const reminders=students.filter(student=>student.balance<=4).sort((a,b)=>a.balance-b.balance).slice(0,3);
  const stats = [
    { label: "Занятий сегодня", value: String(lessons.length), tone: "lavender", icon: "⌁" },
    { label: "Проведено", value: String(lessons.filter(item=>item.status==="completed").length), tone: "sage", icon: "✓" },
    { label: "Ожидает оплаты", value: String(students.filter(item=>item.balance===0).length), tone: "peach", icon: "₽" },
    { label: "Доход за август", value: `${completedThisMonth.reduce((sum,item)=>sum+(item.earnedAmount??students.find(student=>student.id===item.studentId)?.price??0),0).toLocaleString("ru-RU")} ₽`, tone: "blue", icon: "↗" },
  ];

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  return (
    <main className="app-shell">
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand"><span className="brand-mark">T</span><span>TutorFlow</span></div>
        <nav aria-label="Основная навигация">
          {navItems.map(([icon, label], index) => (
            <button className={index === 0 ? "nav-item active" : "nav-item"} key={label} onClick={() => { setMenuOpen(false); if(index===1)window.location.href="/schedule";else if(index===2)window.location.href="/students";else if(index===3)window.location.href="/payments";else if(index>3)notify(`${label} — следующий этап`); }}>
              <span className="nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <img className="sidebar-illustration" src="/asset-tutorflow-cup.png" alt="" aria-hidden="true" />
          <button className="nav-item" onClick={() => notify("Настройки будут добавлены позже")}><span className="nav-icon">⚙</span>Настройки</button>
          <div className="profile"><div className="avatar">А</div><div><b>Анна</b><small>Преподаватель</small></div><button className="logout-button" onClick={()=>void logout()}>Выйти</button></div>
        </div>
      </aside>

      {menuOpen && <button className="backdrop" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} />}

      <section className="content">
        <img className="corner-lavender" src="/asset-lavender-sprig.png" alt="" aria-hidden="true" />
        <header className="topbar">
          <button className="menu-button" aria-label="Открыть меню" onClick={() => setMenuOpen(true)}>☰</button>
          <div><p className="eyebrow">Четверг, 13 августа</p><h1>Добрый день, Анна <span>✦</span></h1><p className="subtitle">Вот что запланировано на сегодня</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => { window.location.href="/students?add=1" }}>＋ <span>Добавить ученика</span></button><button className="primary" onClick={() => { window.location.href="/schedule?add=1" }}>＋ Добавить занятие</button></div>
        </header>

        <div className="stats-grid">
          {stats.map((item) => <article className={`stat-card ${item.tone}`} key={item.label}><div><p>{item.label}</p><strong>{item.value}</strong></div><span className="stat-icon">{item.icon}</span></article>)}
        </div>

        <div className="dashboard-grid">
          <section className="panel lessons-panel">
            <div className="panel-heading"><div><p className="section-kicker">МОЙ ДЕНЬ</p><h2>Занятия сегодня <span className="count">{lessons.length}</span></h2></div><button className="text-button" onClick={() => {window.location.href="/schedule"}}>Всё расписание <span>→</span></button></div>
            <div className="lesson-list">
              {lessons.map((lesson) => <article className={`lesson lesson-${lesson.status}`} key={lesson.id}>
                <div className="lesson-time"><strong>{lesson.time}</strong><span>{lesson.duration} мин</span></div>
                <div className={`student-avatar ${lesson.color}`}>{lesson.initials}</div>
                <div className="student-info"><strong>{lesson.name}</strong><span>{lesson.grade}</span></div>
                <span className={lesson.paid ? "badge paid" : "badge unpaid"}>{lesson.paid ? "Оплачено" : "Не оплачено"}</span>
                <span className={`status ${lesson.status}`}><i />{statusNames[lesson.status]}</span>
                <button className="more" aria-label={`Действия: ${lesson.name}`} onClick={() => notify(`Действия для ${lesson.name}`)}>•••</button>
              </article>)}
            </div>
          </section>

          <aside className="panel reminders">
            <div className="panel-heading"><div><p className="section-kicker">ВАЖНОЕ</p><h2>Напоминания</h2></div><span className="bell">♧</span></div>
            {reminders.map(student=><div className={`reminder ${student.balance===0?"rose-reminder":student.balance===1?"peach-reminder":"yellow-reminder"}`} key={student.id}><span className="reminder-icon">{student.balance}</span><div><strong>{student.name}</strong><p>{student.balance===0?"Оплаченные занятия закончились":`Осталось ${student.balance} занятия`}</p></div><button aria-label={`Подробнее: ${student.name}`}>›</button></div>)}
            <button className="all-reminders" onClick={() => notify("Все напоминания просмотрены")}>Посмотреть все напоминания</button>
          </aside>
        </div>

        <div className="week-note"><span>✦</span><p><strong>Спокойного рабочего дня!</strong><br />На этой неделе вы провели 12 занятий</p><img className="week-books" src="/asset-books-lavender.png" alt="" aria-hidden="true" /></div>
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
