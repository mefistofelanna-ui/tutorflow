"use client";

import { FormEvent, useState } from "react";
import type { Lesson } from "../schedule/lesson-data";
import type { ScheduleSlot } from "../schedule/series-utils";
import type { Student } from "./student-data";
import { currentLessonPrice } from "./student-price";

export type StudentSchedule = {
  mode: "single" | "weekly";
  date: string;
  time: string;
  duration: Lesson["duration"];
  weekdays: number[];
  slots: ScheduleSlot[];
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
  const [schedule, setSchedule] = useState<StudentSchedule>(initialSchedule ?? {
    mode:"single", date:today, time:"15:00", duration:60, weekdays:[], slots:[], endDate:addYear(today),
  });
  const change = (key: keyof Student, value: string) => {const next=key === "price" || key === "balance" ? Number(value) : value;setForm({ ...form, [key]:next, ...(key==="price"?{lessonPrice:Number(value)}:{}) });};
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (schedule.mode === "weekly" && !schedule.slots.length) return;
    onSave({ ...form, lessonPrice:currentLessonPrice(form), id: form.id || `student-${Date.now()}` }, initial && !initialSchedule ? undefined : schedule);
  };

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
          {schedule.mode === "weekly" && <div className="schedule-slots">
            <div className="schedule-slot-head"><span>День недели</span><span>Время</span><span>Продолжительность</span></div>
            {schedule.slots.map((slot,index)=><div className="schedule-slot" key={slot.weekday}>
              <select aria-label="День недели" value={slot.weekday} onChange={event=>{const weekday=Number(event.target.value);if(schedule.slots.some((item,itemIndex)=>itemIndex!==index&&item.weekday===weekday))return;setSchedule({...schedule,slots:schedule.slots.map((item,itemIndex)=>itemIndex===index?{...item,weekday}:item)})}}>{weekdayLabels.map(([value,label])=><option value={value} disabled={schedule.slots.some((item,itemIndex)=>itemIndex!==index&&item.weekday===value)} key={value}>{label}</option>)}</select>
              <input aria-label="Время" type="text" inputMode="numeric" required pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" placeholder="15:00" title="Введите время в 24-часовом формате ЧЧ:ММ" value={slot.time} onChange={event=>setSchedule({...schedule,slots:schedule.slots.map((item,itemIndex)=>itemIndex===index?{...item,time:event.target.value}:item)})}/>
              <select aria-label="Продолжительность" value={slot.duration} onChange={event=>setSchedule({...schedule,slots:schedule.slots.map((item,itemIndex)=>itemIndex===index?{...item,duration:Number(event.target.value) as Lesson["duration"]}:item)})}>{[30,40,45,60,90].map(value=><option key={value} value={value}>{value} минут</option>)}</select>
              <button type="button" className="schedule-slot-remove" aria-label="Удалить день" onClick={()=>setSchedule({...schedule,slots:schedule.slots.filter((_,itemIndex)=>itemIndex!==index)})}>×</button>
            </div>)}
            {schedule.slots.length<7&&<button type="button" className="schedule-add-day" onClick={()=>{const weekday=weekdayLabels.find(([value])=>!schedule.slots.some(item=>item.weekday===value))?.[0];if(weekday!==undefined)setSchedule({...schedule,slots:[...schedule.slots,{weekday,time:"15:00",duration:60}]})}}>+ Добавить день</button>}
          </div>}
          {schedule.mode === "single" && <div className="schedule-inputs">
            <label>Дата<input type="date" required value={schedule.date} onChange={event => setSchedule({ ...schedule, date:event.target.value })}/></label>
            <label>Время<input type="text" inputMode="numeric" required pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" placeholder="15:00" title="Введите время в 24-часовом формате ЧЧ:ММ" value={schedule.time} onChange={event => setSchedule({ ...schedule, time:event.target.value })}/></label>
            <label>Продолжительность<select value={schedule.duration} onChange={event => setSchedule({ ...schedule, duration:Number(event.target.value) as Lesson["duration"] })}>{[30,40,45,60,90].map(value => <option key={value} value={value}>{value} минут</option>)}</select></label>
          </div>}
        </fieldset>}
        <div className="form-actions"><button type="button" className="form-cancel" onClick={onCancel}>Отмена</button><button className="form-save">Сохранить</button></div>
      </form>
    </div>
  </div>;
}
