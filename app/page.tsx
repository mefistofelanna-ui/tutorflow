"use client";

import { useState } from "react";

const navItems = [
  ["⌂", "Главная"],
  ["□", "Расписание"],
  ["♙", "Ученики"],
  ["₽", "Оплаты"],
  ["↗", "Статистика"],
];

const stats = [
  { label: "Занятий сегодня", value: "4", tone: "lavender", icon: "⌁" },
  { label: "Проведено", value: "3", tone: "sage", icon: "✓" },
  { label: "Ожидает оплаты", value: "1", tone: "peach", icon: "₽" },
  { label: "Доход за август", value: "32 000 ₽", tone: "blue", icon: "↗" },
];

const lessons = [
  { time: "15:00", name: "Маша Иванова", grade: "3 класс", initials: "МИ", color: "purple", paid: true, status: "completed" },
  { time: "16:00", name: "Артём Смирнов", grade: "4 класс", initials: "АС", color: "blue", paid: false, status: "scheduled" },
  { time: "17:30", name: "Соня Волкова", grade: "6 класс", initials: "СВ", color: "peach", paid: true, status: "scheduled" },
  { time: "19:00", name: "Илья Орлов", grade: "8 класс", initials: "ИО", color: "sage", paid: true, status: "scheduled" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

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
            <button className={index === 0 ? "nav-item active" : "nav-item"} key={label} onClick={() => { setMenuOpen(false); index > 0 && notify(`${label} — следующий этап`); }}>
              <span className="nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <img className="sidebar-illustration" src="/watercolor-pencils.png" alt="" aria-hidden="true" />
          <button className="nav-item" onClick={() => notify("Настройки будут добавлены позже")}><span className="nav-icon">⚙</span>Настройки</button>
          <div className="profile"><div className="avatar">А</div><div><b>Анна</b><small>Преподаватель</small></div><span>⋮</span></div>
        </div>
      </aside>

      {menuOpen && <button className="backdrop" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} />}

      <section className="content">
        <img className="corner-lavender" src="/watercolor-lavender.png" alt="" aria-hidden="true" />
        <header className="topbar">
          <button className="menu-button" aria-label="Открыть меню" onClick={() => setMenuOpen(true)}>☰</button>
          <div><p className="eyebrow">Четверг, 13 августа</p><h1>Добрый день, Анна <span>✦</span></h1><p className="subtitle">Вот что запланировано на сегодня</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => notify("Форма ученика откроется на следующем этапе")}>＋ <span>Добавить ученика</span></button><button className="primary" onClick={() => notify("Форма занятия откроется на этапе расписания")}>＋ Добавить занятие</button></div>
        </header>

        <div className="stats-grid">
          {stats.map((item) => <article className={`stat-card ${item.tone}`} key={item.label}><div><p>{item.label}</p><strong>{item.value}</strong></div><span className="stat-icon">{item.icon}</span></article>)}
        </div>

        <div className="dashboard-grid">
          <section className="panel lessons-panel">
            <div className="panel-heading"><div><p className="section-kicker">МОЙ ДЕНЬ</p><h2>Занятия сегодня <span className="count">4</span></h2></div><button className="text-button" onClick={() => notify("Расписание — следующий этап")}>Всё расписание <span>→</span></button></div>
            <div className="lesson-list">
              {lessons.map((lesson, index) => <article className="lesson" key={lesson.time}>
                <div className="lesson-time"><strong>{lesson.time}</strong><span>{index === 0 ? "60 мин" : "1 час"}</span></div>
                <div className={`student-avatar ${lesson.color}`}>{lesson.initials}</div>
                <div className="student-info"><strong>{lesson.name}</strong><span>{lesson.grade}</span></div>
                <span className={lesson.paid ? "badge paid" : "badge unpaid"}>{lesson.paid ? "Оплачено" : "Не оплачено"}</span>
                <span className={lesson.status === "completed" ? "status completed" : "status scheduled"}><i />{lesson.status === "completed" ? "Проведено" : "Запланировано"}</span>
                <button className="more" aria-label={`Действия: ${lesson.name}`} onClick={() => notify(`Действия для ${lesson.name}`)}>•••</button>
              </article>)}
            </div>
          </section>

          <aside className="panel reminders">
            <div className="panel-heading"><div><p className="section-kicker">ВАЖНОЕ</p><h2>Напоминания</h2></div><span className="bell">♧</span></div>
            <div className="reminder peach-reminder"><span className="reminder-icon">!</span><div><strong>Артём Смирнов</strong><p>Занятие сегодня не оплачено</p></div><button aria-label="Подробнее">›</button></div>
            <div className="reminder yellow-reminder"><span className="reminder-icon">1</span><div><strong>Соня Волкова</strong><p>Осталось 1 занятие</p></div><button aria-label="Подробнее">›</button></div>
            <div className="reminder rose-reminder"><span className="reminder-icon">0</span><div><strong>Денис Котов</strong><p>Оплаченные занятия закончились</p></div><button aria-label="Подробнее">›</button></div>
            <button className="all-reminders" onClick={() => notify("Все напоминания просмотрены")}>Посмотреть все напоминания</button>
          </aside>
        </div>

        <div className="week-note"><span>✦</span><p><strong>Спокойного рабочего дня!</strong><br />На этой неделе вы провели 12 занятий</p><img className="week-books" src="/watercolor-books.png" alt="" aria-hidden="true" /></div>
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
