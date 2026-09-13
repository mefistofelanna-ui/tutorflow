"use client";

import { useEffect, useMemo, useState } from "react";
import StudentsShell from "../students/StudentsShell";
import { readStudents } from "../students/student-data";
import { readLessons } from "../schedule/lesson-data";
import { readPayments } from "../payments/payment-data";
import { readSeries } from "../schedule/series-data";
import { calculateStatistics, formatMinutes, localMonth, StatisticsSource } from "./statistics-data";
import "../students/students.css";
import "./statistics.css";

const number = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const money = (value: number) => `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
type Statistics = ReturnType<typeof calculateStatistics>;

export default function StatisticsPage() {
  const [period, setPeriod] = useState(() => localMonth());
  const [source, setSource] = useState<StatisticsSource>({ students: [], lessons: [], payments: [], series: [] });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = () => { setSource({ students: readStudents(), lessons: readLessons(), payments: readPayments(), series: readSeries() }); setReady(true); };
    const timer = window.setTimeout(load, 0);
    window.addEventListener("tutorflow-data-change", load);
    return () => { window.clearTimeout(timer); window.removeEventListener("tutorflow-data-change", load); };
  }, []);
  const data = useMemo(() => calculateStatistics(source, period.year, period.month), [source, period]);
  const title = new Date(period.year, period.month, 1, 12).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/ г\.$/, "");
  const monthName = new Date(period.year, period.month, 1, 12).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }).replace(/^\d+\s/, "");
  const shift = (delta: number) => setPeriod(current => localMonth(new Date(current.year, current.month + delta, 1, 12)));
  return <StudentsShell active="Статистика"><div className="statistics-page">
    <header className="students-header statistics-header"><div><h1>Статистика</h1><p>Посмотрим, как проходит месяц</p></div></header>
    <div className="statistics-period"><div><button aria-label="Предыдущий месяц" onClick={() => shift(-1)}>←</button><h2 aria-live="polite">{title}</h2><button aria-label="Следующий месяц" onClick={() => shift(1)}>→</button></div><button onClick={() => setPeriod(localMonth())}>Текущий месяц</button></div>
    {!ready ? <p role="status">Загружаем статистику…</p> : data.empty ? <section className="statistics-empty"><img src="/asset-books-lavender.png" alt=""/><h2>В этом месяце пока нет данных</h2><p>Здесь появятся занятия и оплаты за выбранный месяц.</p></section> : <>
      <div className="statistics-metrics">
        {[{ label: "Проведено занятий", value: number(data.completed), tone: "sage" }, { label: "Отменено", value: number(data.cancelled), tone: "peach" }, { label: "Часов занятий", value: formatMinutes(data.minutes), tone: "blue" }, { label: "Получено оплат", value: money(data.received), tone: "lavender" }].map(item => <article className={`statistics-metric ${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}
      </div>
      <section className="statistics-earned statistics-panel"><div><h2>Заработано за месяц</h2><strong>{data.missingPrice === data.completed && data.completed > 0 ? "Нет сохранённых цен" : money(data.earned)}</strong><p>Получено оплат: {money(data.received)}</p>{data.missingPrice > 0 && <p className="statistics-note">У {data.missingPrice} проведённых занятий нет сохранённой цены. Их стоимость не включена в заработок.</p>}</div><img src="/asset-lavender-sprig.png" alt="" aria-hidden="true"/></section>
      <div className="statistics-charts"><WeeklyChart data={data} month={monthName}/><WeeklyChart data={data} month={monthName} revenue/></div>
      <section className="statistics-panel statistics-students"><h2>По ученикам</h2><table><thead><tr><th>Имя</th><th>Проведено</th><th>Отменено</th><th>Часов</th><th>Заработано</th></tr></thead><tbody>{data.students.map(student => <tr key={student.id}><th scope="row">{student.name}{student.archived && <small>В архиве</small>}</th><td data-label="Проведено">{student.completed}</td><td data-label="Отменено">{student.cancelled}</td><td data-label="Часов">{formatMinutes(student.minutes)}</td><td data-label="Заработано">{student.missingPrice === student.completed && student.completed > 0 ? "Нет данных" : money(student.earned)}{student.missingPrice > 0 && <small>Без цены: {student.missingPrice}</small>}</td></tr>)}</tbody></table></section>
      <div className="statistics-bottom"><section className="statistics-panel"><h2>Отмены за месяц</h2><dl><div><dt>Всего отменено</dt><dd>{data.cancelled}</dd></div><div><dt>От всех запланированных занятий</dt><dd>{number(data.cancellationRate)}%</dd></div></dl><p className="statistics-note">Всего занятий в месяце: {data.planned}, включая проведённые, отменённые и предстоящие.</p>{data.mostCancelled.length > 0 && <p>Больше всего отмен: <strong>{data.mostCancelled.map(item => item.name).join(", ")}</strong> — {data.mostCancelled[0].cancelled}.</p>}</section>
      <section className="statistics-panel"><h2>В среднем</h2><dl><div><dt>Занятий в неделю</dt><dd>{number(data.weeklyLessons)}</dd></div><div><dt>Часов в неделю</dt><dd>{formatMinutes(data.weeklyMinutes)}</dd></div><div><dt>Доход с проведённого занятия</dt><dd>{data.averageEarned === null ? "Нет данных" : money(data.averageEarned)}</dd></div></dl><p className="statistics-note">Средние за неделю рассчитаны по всем {data.days} дням месяца. Учитываются только проведённые занятия.</p></section></div>
    </>}
  </div></StudentsShell>;
}

function WeeklyChart({ data, month, revenue = false }: { data: Statistics; month: string; revenue?: boolean }) {
  const maximum = Math.max(1, ...data.weeks.map(item => revenue ? item.earned : item.completed));
  return <section className={`statistics-panel statistics-chart ${revenue ? "revenue" : ""}`}><h2>{revenue ? "Заработано по неделям" : "Занятия по неделям"}</h2><ol>{data.weeks.map(week => {
    const value = revenue ? week.earned : week.completed;
    return <li key={week.start}><div><span>{week.start}–{week.end} {month}</span><strong>{revenue ? week.missingPrice === week.completed && week.completed > 0 ? "Нет данных" : money(value) : number(value)}</strong></div><div className="statistics-bar" aria-hidden="true"><i style={{ width: `${value / maximum * 100}%` }}/></div>{revenue && week.missingPrice > 0 && <small>Без сохранённой цены: {week.missingPrice}</small>}</li>;
  })}</ol></section>;
}
