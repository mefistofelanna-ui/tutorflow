"use client";

import { FormEvent, useState } from "react";
import type { Lesson } from "../schedule/lesson-data";
import type { Student } from "./student-data";

export type StudentSchedule = {
  mode: "single" | "weekly";
  date: string;
  time: string;
  duration: Lesson["duration"];
  weekdays: number[];
  endDate: string;
};

const localIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = localIso(new Date());
const addYear = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year + 1, month - 1, day);
  return localIso(date);
};
const weekdayLabels = [[1,"Пн"],[2,"Вт"],[3,"Ср"],[4,"Чт"],[5,"Пт"],[6,"Сб"],[0,"Вс"]] as const;

type Props = {
  initial?: Student;
  initialSchedule?: StudentSchedule;
  title: string;
  onSave: (student: Student, schedule?: StudentSchedule) => void;
  onCancel: () => void;
};

export default function StudentForm({ initial, initialSchedule, title, onSave, onCancel }: Props) {
  const [form, setForm] = useState<Student>(initial ?? { id:"", name:"", grade:"", price:0, balance:0, days:"", comment:"" });
  const [endTouched, setEndTouched] = useState(false);
  const [schedule, setSchedule] = useState<StudentSchedule>(initialSchedule ?? {
    mode:"single", date:today, time:"15:00", duration:60, weekdays:[], endDate:addYear(today),
  });
  const change = (key: keyof Student, value: string) => setForm({ ...form, [key]: key === "price" || key === "balance" ? Number(value) : value });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (schedule.mode === "weekly" && !schedule.weekdays.length) return;
    onSave({ ...form, id: form.id || `student-${Date.now()}` }, initial && !initialSchedule ? undefined : schedule);
  };
  const changeStart = (date: string) => setSchedule({ ...schedule, date, endDate: endTouched ? schedule.endDate : addYear(date) });

  return <div className="student-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <div className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-form-title">
      <h2 id="student-form-title">{title}</h2>
      <form className="student-form" onSubmit={submit}>
        <label className="full">Имя *<input required autoFocus value={form.name} onChange={event => change("name", event.target.value)}/></label>
        <label>Класс<input value={form.grade} onChange={event => change("grade", event.target.value)}/></label>
        <label>Стоимость занятия<input type="number" min="0" value={form.price || ""} onChange={event => change("price", event.target.value)}/></label>
        <label>Остаток оплаченных занятий<input type="number" min="0" value={form.balance} onChange={event => change("balance", event.target.value)}/></label>
        <label className="full">Комментарий<textarea value={form.comment} onChange={event => change("comment", event.target.value)}/></label>
        {(!initial || initialSchedule) && <fieldset className="schedule-fields full">
          <legend>Расписание</legend>
          {!initial && <div className="schedule-mode">
            <button type="button" className={schedule.mode === "single" ? "active" : ""} onClick={() => setSchedule({ ...schedule, mode:"single" })}>Одно занятие</button>
            <button type="button" className={schedule.mode === "weekly" ? "active" : ""} onClick={() => setSchedule({ ...schedule, mode:"weekly" })}>Еженедельно</button>
          </div>}
          {schedule.mode === "weekly" && <>
            <span className="field-caption">Дни недели</span>
            <div className="weekday-chips">{weekdayLabels.map(([value,label]) => <button type="button" className={schedule.weekdays.includes(value) ? "active" : ""} key={value} onClick={() => setSchedule({ ...schedule, weekdays:schedule.weekdays.includes(value) ? schedule.weekdays.filter(day => day !== value) : [...schedule.weekdays,value] })}>{label}</button>)}</div>
          </>}
          <div className="schedule-inputs">
            <label>{schedule.mode === "weekly" ? "Дата начала" : "Дата"}<input type="date" required value={schedule.date} onChange={event => changeStart(event.target.value)}/></label>
            <label>Время<input type="time" required value={schedule.time} onChange={event => setSchedule({ ...schedule, time:event.target.value })}/></label>
            <label>Продолжительность<select value={schedule.duration} onChange={event => setSchedule({ ...schedule, duration:Number(event.target.value) as Lesson["duration"] })}>{[30,45,60,90].map(value => <option key={value} value={value}>{value} минут</option>)}</select></label>
            {schedule.mode === "weekly" && <label>Дата окончания<input type="date" required min={schedule.date} value={schedule.endDate} onChange={event => { setEndTouched(true); setSchedule({ ...schedule, endDate:event.target.value }); }}/></label>}
          </div>
        </fieldset>}
        <div className="form-actions"><button type="button" className="form-cancel" onClick={onCancel}>Отмена</button><button className="form-save">Сохранить</button></div>
      </form>
    </div>
  </div>;
}
