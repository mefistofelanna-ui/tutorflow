"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";

export default function StudentsShell({ children, toast, active="Ученики" }: { children: ReactNode; toast?: string; active?: "Ученики"|"Расписание"|"Оплаты" }) {
  const [open,setOpen]=useState(false);
  const items=[["⌂","Главная","/"],["□","Расписание","/schedule"],["♙","Ученики","/students"],["₽","Оплаты","/payments"],["↗","Статистика","#"]];
  return <main className="students-shell">
    <aside className={open?"students-sidebar open":"students-sidebar"}>
      <div className="students-brand"><i>T</i>TutorFlow</div>
      <nav className="students-nav" aria-label="Основная навигация">{items.map(([icon,label,url])=><Link key={label} href={url} className={label===active?"active":""} onClick={()=>setOpen(false)}><span>{icon}</span>{label}</Link>)}</nav>
      <img className="students-side-art" src="/asset-tutorflow-cup.png" alt="" aria-hidden="true" />
      <div className="students-profile"><b>Анна</b><small>Преподаватель</small></div>
    </aside>
    {open&&<button className="students-backdrop" aria-label="Закрыть меню" onClick={()=>setOpen(false)}/>} 
    <section className="students-main"><img className="students-lavender" src="/asset-lavender-sprig.png" alt="" aria-hidden="true"/><button className="students-menu" aria-label="Открыть меню" onClick={()=>setOpen(true)}>☰</button>{children}</section>
    {toast&&<div className="students-toast" role="status">✓ {toast}</div>}
  </main>;
}
